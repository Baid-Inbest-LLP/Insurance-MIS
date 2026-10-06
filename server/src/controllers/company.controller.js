import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Company, Branch, LocationCity } from "../models/index.js";
import { isStaffRole } from "../constants/roles.js";
import { buildBranchName } from "../utils/branchFormat.js";
import { escapeRegex } from "../utils/searchUtils.js";

const toBranchDto = (branch) => ({
	_id: branch._id,
	label: branch.label,
	street: branch.street || "",
	city: branch.city?._id || branch.city || "",
	cityName: branch.city?.name || "",
	state: branch.state || "",
	zipCode: branch.zipCode || "",
	country: branch.country || "",
	isDefault: Boolean(branch.isDefault),
});

const toPublicCompany = (company, branches = []) => {
	const doc = company?.toObject ? company.toObject() : { ...company };
	const { code, ...rest } = doc;
	return {
		...rest,
		companyCode: code,
		branches: branches.map(toBranchDto),
	};
};

const normalizeCompanyFields = (body = {}) => ({
	name: body.name?.trim(),
	code: (body.companyCode || body.code)?.trim(),
	email: body.email?.trim()?.toLowerCase(),
	phone: body.phone?.trim(),
	taxId: body.taxId?.trim()?.toUpperCase(),
	isActive: body.isActive !== false,
});

const loadCompanyBranches = (companyId) =>
	Branch.find({ company: companyId, isActive: true })
		.sort({ isDefault: -1, label: 1 })
		.populate("city", "name")
		.lean();

const assertActiveLocationCity = async (cityId) => {
	const exists = await LocationCity.exists({ _id: cityId, isActive: true });
	if (!exists)
		throw ApiError.badRequest("A valid city is required for each branch");
};

const syncBranches = async (companyId, branches = []) => {
	if (!branches.length) {
		throw ApiError.badRequest("At least one branch is required");
	}

	await Promise.all(
		branches.map((branch) => assertActiveLocationCity(branch.city)),
	);

	const existing = await Branch.find({ company: companyId })
		.select("_id")
		.lean();
	const incomingIds = new Set(
		branches.filter((l) => l._id).map((l) => String(l._id)),
	);
	const remainingCount =
		existing.filter((l) => incomingIds.has(String(l._id))).length +
		branches.filter((l) => !l._id).length;

	if (remainingCount < 1) {
		throw ApiError.badRequest("Company must have at least one branch");
	}

	const idsToDelete = existing
		.filter((l) => !incomingIds.has(String(l._id)))
		.map((l) => l._id);
	if (idsToDelete.length) {
		await Branch.deleteMany({ _id: { $in: idsToDelete } });
	}

	const firstDefaultIndex = branches.findIndex((l) => l.isDefault);
	const defaultIndex = firstDefaultIndex === -1 ? 0 : firstDefaultIndex;
	const normalizedBranches = branches.map((branch, index) => ({
		...branch,
		isDefault: index === defaultIndex,
	}));

	const updates = [];
	const creates = [];
	for (const branch of normalizedBranches) {
		const payload = {
			company: companyId,
			label: String(branch.label || "").trim(),
			name: buildBranchName(branch.label),
			code: String(branch.label || "").trim(),
			street: branch.street?.trim() || "",
			city: branch.city,
			state: branch.state?.trim() || "",
			zipCode: branch.zipCode?.trim() || "",
			country: branch.country?.trim() || "India",
			isDefault: Boolean(branch.isDefault),
			isActive: true,
		};

		if (branch._id) {
			updates.push(
				Branch.findByIdAndUpdate(branch._id, payload, {
					runValidators: true,
				}),
			);
		} else {
			creates.push(payload);
		}
	}

	await Promise.all([
		...updates,
		...(creates.length ? [Branch.insertMany(creates)] : []),
	]);
};

export const getCompanies = asyncHandler(async (req, res) => {
	const { search, isActive, page = 1, limit = 50 } = req.query;
	const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
	const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
	const filter = {};

	if (isActive !== undefined) filter.isActive = isActive === "true";
	if (search) {
		const searchRegex = escapeRegex(search);
		filter.$or = [
			{ name: { $regex: searchRegex, $options: "i" } },
			{ email: { $regex: searchRegex, $options: "i" } },
			{ code: { $regex: searchRegex, $options: "i" } },
		];
	}

	// City-scoped roles only ever see companies that have a branch in their own city.
	const scopedCity = isStaffRole(req.user.role) ? req.user.locationCity : null;

	if (scopedCity) {
		const visibleCompanyIds = await Branch.distinct("company", {
			city: scopedCity,
			isActive: true,
		});
		filter._id = { $in: visibleCompanyIds };
	}

	const total = await Company.countDocuments(filter);
	const companies = await Company.find(filter)
		.sort({ name: 1 })
		.skip((parsedPage - 1) * parsedLimit)
		.limit(parsedLimit)
		.lean();

	const companyIds = companies.map((c) => c._id);
	const branchFilter = { company: { $in: companyIds }, isActive: true };
	if (scopedCity) branchFilter.city = scopedCity;

	const branchDocs = await Branch.find(branchFilter)
		.sort({ isDefault: -1, label: 1 })
		.populate("city", "name")
		.lean();

	const branchesByCompany = branchDocs.reduce((acc, branch) => {
		const key = String(branch.company);
		if (!acc[key]) acc[key] = [];
		acc[key].push(branch);
		return acc;
	}, {});

	const payload = companies.map((company) =>
		toPublicCompany(company, branchesByCompany[String(company._id)] || []),
	);

	ApiResponse.paginated(res, payload, {
		page: parsedPage,
		pages: Math.ceil(total / parsedLimit) || 1,
		total,
		limit: parsedLimit,
	});
});

export const createCompany = asyncHandler(async (req, res) => {
	const { branches = [], ...companyBody } = req.body;
	const fields = normalizeCompanyFields(companyBody);

	const company = await Company.create(fields);
	try {
		await syncBranches(company._id, branches);
	} catch (err) {
		await Company.findByIdAndDelete(company._id);
		if (err instanceof ApiError) throw err;
		throw ApiError.badRequest(err.message || "Failed to create company");
	}

	const savedBranches = await loadCompanyBranches(company._id);
	ApiResponse.created(res, toPublicCompany(company, savedBranches), "Company created");
});

export const updateCompany = asyncHandler(async (req, res) => {
	const company = await Company.findById(req.params.id);
	if (!company) throw ApiError.notFound("Company not found");

	const { branches, ...companyBody } = req.body;
	Object.assign(
		company,
		normalizeCompanyFields({ ...company.toObject(), ...companyBody }),
	);

	await company.save();

	if (Array.isArray(branches)) {
		await syncBranches(company._id, branches);
	}

	const savedBranches = await loadCompanyBranches(company._id);
	ApiResponse.success(res, toPublicCompany(company, savedBranches), "Company updated");
});

export const deleteCompany = asyncHandler(async (req, res) => {
	const company = await Company.findById(req.params.id);
	if (!company) throw ApiError.notFound("Company not found");

	await Branch.deleteMany({ company: company._id });
	await Company.findByIdAndDelete(company._id);
	ApiResponse.success(res, null, "Company deleted successfully");
});
