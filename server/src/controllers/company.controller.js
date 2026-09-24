import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Company, Location, LocationCity } from "../models/index.js";
import { buildLocationName } from "../utils/locationFormat.js";
import { escapeRegex } from "../utils/searchUtils.js";

const toLocationDto = (loc) => ({
	_id: loc._id,
	label: loc.label,
	street: loc.street || "",
	city: loc.city?._id || loc.city || "",
	cityName: loc.city?.name || "",
	state: loc.state || "",
	zipCode: loc.zipCode || "",
	country: loc.country || "",
	isDefault: Boolean(loc.isDefault),
});

const toPublicCompany = (company, locations = []) => {
	const doc = company?.toObject ? company.toObject() : { ...company };
	const { code, ...rest } = doc;
	return {
		...rest,
		companyCode: code,
		locations: locations.map(toLocationDto),
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

const loadCompanyLocations = (companyId) =>
	Location.find({ company: companyId, isActive: true })
		.sort({ isDefault: -1, label: 1 })
		.populate("city", "name")
		.lean();

const assertActiveLocationCity = async (cityId) => {
	const exists = await LocationCity.exists({ _id: cityId, isActive: true });
	if (!exists)
		throw ApiError.badRequest("A valid city is required for each location");
};

const syncLocations = async (companyId, locations = []) => {
	if (!locations.length) {
		throw ApiError.badRequest("At least one location is required");
	}

	await Promise.all(
		locations.map((loc) => assertActiveLocationCity(loc.city)),
	);

	const existing = await Location.find({ company: companyId })
		.select("_id")
		.lean();
	const incomingIds = new Set(
		locations.filter((l) => l._id).map((l) => String(l._id)),
	);
	const remainingCount =
		existing.filter((l) => incomingIds.has(String(l._id))).length +
		locations.filter((l) => !l._id).length;

	if (remainingCount < 1) {
		throw ApiError.badRequest("Company must have at least one location");
	}

	const idsToDelete = existing
		.filter((l) => !incomingIds.has(String(l._id)))
		.map((l) => l._id);
	if (idsToDelete.length) {
		await Location.deleteMany({ _id: { $in: idsToDelete } });
	}

	const firstDefaultIndex = locations.findIndex((l) => l.isDefault);
	const defaultIndex = firstDefaultIndex === -1 ? 0 : firstDefaultIndex;
	const normalizedLocations = locations.map((loc, index) => ({
		...loc,
		isDefault: index === defaultIndex,
	}));

	const updates = [];
	const creates = [];
	for (const loc of normalizedLocations) {
		const payload = {
			company: companyId,
			label: String(loc.label || "").trim(),
			name: buildLocationName(loc.label),
			code: String(loc.label || "").trim(),
			street: loc.street?.trim() || "",
			city: loc.city,
			state: loc.state?.trim() || "",
			zipCode: loc.zipCode?.trim() || "",
			country: loc.country?.trim() || "India",
			isDefault: Boolean(loc.isDefault),
			isActive: true,
		};

		if (loc._id) {
			updates.push(
				Location.findByIdAndUpdate(loc._id, payload, {
					runValidators: true,
				}),
			);
		} else {
			creates.push(payload);
		}
	}

	await Promise.all([
		...updates,
		...(creates.length ? [Location.insertMany(creates)] : []),
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

	// Accountants only ever see companies that have a branch in their own city.
	const scopedCity = req.user.role === "accountant" ? req.user.locationCity : null;

	if (scopedCity) {
		const visibleCompanyIds = await Location.distinct("company", {
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
	const locationFilter = { company: { $in: companyIds }, isActive: true };
	if (scopedCity) locationFilter.city = scopedCity;

	const locationDocs = await Location.find(locationFilter)
		.sort({ isDefault: -1, label: 1 })
		.populate("city", "name")
		.lean();

	const locationsByCompany = locationDocs.reduce((acc, loc) => {
		const key = String(loc.company);
		if (!acc[key]) acc[key] = [];
		acc[key].push(loc);
		return acc;
	}, {});

	const payload = companies.map((company) =>
		toPublicCompany(company, locationsByCompany[String(company._id)] || []),
	);

	ApiResponse.paginated(res, payload, {
		page: parsedPage,
		pages: Math.ceil(total / parsedLimit) || 1,
		total,
		limit: parsedLimit,
	});
});

export const createCompany = asyncHandler(async (req, res) => {
	const { locations = [], ...companyBody } = req.body;
	const fields = normalizeCompanyFields(companyBody);

	const company = await Company.create(fields);
	try {
		await syncLocations(company._id, locations);
	} catch (err) {
		await Company.findByIdAndDelete(company._id);
		if (err instanceof ApiError) throw err;
		throw ApiError.badRequest(err.message || "Failed to create company");
	}

	const locs = await loadCompanyLocations(company._id);
	ApiResponse.created(res, toPublicCompany(company, locs), "Company created");
});

export const updateCompany = asyncHandler(async (req, res) => {
	const company = await Company.findById(req.params.id);
	if (!company) throw ApiError.notFound("Company not found");

	const { locations, ...companyBody } = req.body;
	Object.assign(
		company,
		normalizeCompanyFields({ ...company.toObject(), ...companyBody }),
	);

	await company.save();

	if (Array.isArray(locations)) {
		await syncLocations(company._id, locations);
	}

	const locs = await loadCompanyLocations(company._id);
	ApiResponse.success(res, toPublicCompany(company, locs), "Company updated");
});

export const deleteCompany = asyncHandler(async (req, res) => {
	const company = await Company.findById(req.params.id);
	if (!company) throw ApiError.notFound("Company not found");

	await Location.deleteMany({ company: company._id });
	await Company.findByIdAndDelete(company._id);
	ApiResponse.success(res, null, "Company deleted successfully");
});
