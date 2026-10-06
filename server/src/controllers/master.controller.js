import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Company, Branch, LocationCity, User } from "../models/index.js";
import { normalizeBranchLabel } from "../utils/branchFormat.js";
import { ApiError } from "../utils/ApiError.js";
import {
	ROLES,
	USER_ROLES,
	isHod,
	isStaffRole,
	isSuperAdmin,
} from "../constants/roles.js";
import { resetUserPassword } from "../services/auth.service.js";
import {
	assertActiveDepartments,
	assertNoOtherHod,
} from "../services/department.service.js";

const crud = (Model, name) => ({
	list: asyncHandler(async (req, res) => {
		const filter =
			req.query.activeOnly === "false" ? {} : { isActive: true };
		const items = await Model.find(filter).sort({ name: 1 }).lean();
		ApiResponse.success(res, items);
	}),
	create: asyncHandler(async (req, res) => {
		const item = await Model.create(req.body);
		ApiResponse.created(res, item, `${name} created`);
	}),
	update: asyncHandler(async (req, res) => {
		const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});
		if (!item) throw ApiError.notFound(`${name} not found`);
		ApiResponse.success(res, item, `${name} updated`);
	}),
	remove: asyncHandler(async (req, res) => {
		const item = await Model.findByIdAndDelete(req.params.id);
		if (!item) throw ApiError.notFound(`${name} not found`);
		ApiResponse.success(res, null, `${name} deleted`);
	}),
});

export const branchController = crud(Branch, "Branch");

// Every active city, used by the branch form.
export const getLocationCities = asyncHandler(async (_req, res) => {
	const cities = await LocationCity.find({ isActive: true })
		.select("name")
		.sort({ createdAt: 1 })
		.lean();
	ApiResponse.success(res, cities);
});

export const getLookupData = asyncHandler(async (_req, res) => {
	const [companies, branchDocs] = await Promise.all([
		Company.find({ isActive: true })
			.select("name code")
			.sort({ name: 1 })
			.lean(),
		Branch.find({ isActive: true })
			.populate("company", "name")
			.select("name label company isDefault")
			.sort({ label: 1 })
			.lean(),
	]);

	const companyBranches = {};
	for (const branch of branchDocs) {
		const companyName = branch.company?.name;
		if (!companyName) continue;
		if (!companyBranches[companyName]) companyBranches[companyName] = [];
		const branchLabel = normalizeBranchLabel(branch.label);
		if (branchLabel) companyBranches[companyName].push(branchLabel);
	}

	const branchLabels = [
		...new Set(
			branchDocs
				.map((l) => normalizeBranchLabel(l.label))
				.filter(Boolean),
		),
	].sort((a, b) => a.localeCompare(b));

	ApiResponse.success(res, {
		companies: companies.map((c) => c.name),
		companyCodeByName: Object.fromEntries(
			companies
				.filter((c) => c.name && c.code)
				.map((c) => [c.name, c.code]),
		),
		branches: branchLabels,
		companyBranches,
		paymentMethods: ["Bank", "Cash", "UPI", "Debit/Credit Card"],
		roles: USER_ROLES,
		months: [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		],
		quarters: ["Q1", "Q2", "Q3", "Q4"],
	});
});

const canManageUser = (actorRole, targetRole) =>
	isSuperAdmin(actorRole) && targetRole !== ROLES.SUPERADMIN;

export const listUsers = asyncHandler(async (req, res) => {
	const users = await User.find()
		.select("name userName role isActive departments")
		.populate("departments", "name")
		.sort({ createdAt: 1 })
		.lean();
	ApiResponse.success(res, users);
});

export const updateUser = asyncHandler(async (req, res) => {
	const actor = req.user;
	const user = await User.findById(req.params.id);
	if (!user) throw ApiError.notFound("User not found");

	const isSelf = user._id.equals(actor._id);
	if (!isSelf && !canManageUser(actor.role, user.role)) {
		throw ApiError.forbidden(
			"You do not have permission to manage this user",
		);
	}

	const { name, userName, role, isActive, departments } = req.body;
	const wasActive = user.isActive;
	const wasHod = isHod(user.role);
	if (name !== undefined) user.name = name;
	if (role !== undefined && role !== user.role) {
		if (isSuperAdmin(user.role))
			throw ApiError.forbidden("Superadmin role cannot be changed");
		user.role = role;
		if (!isStaffRole(role)) user.departments = [];
	}
	if (departments !== undefined && isStaffRole(user.role)) {
		const addedDepartments = departments.filter(
			(id) => !user.departments.some((current) => current.equals(id)),
		);
		if (addedDepartments.length) await assertActiveDepartments(addedDepartments);
		user.departments = departments;
	}
	if (userName !== undefined) {
		const existing = await User.findOne({
			userName,
			_id: { $ne: user._id },
		});
		if (existing) throw ApiError.conflict("User name already in use");
		user.userName = userName;
	}
	if (isActive !== undefined) {
		if (isSelf && !isActive) {
			throw ApiError.forbidden("You cannot deactivate your own account");
		}
		user.isActive = isActive;
	}

	const isNewHod = isHod(user.role) && !wasHod;
	const isReactivated = user.isActive && !wasActive;
	if (
		isHod(user.role) &&
		(departments !== undefined || isReactivated || isNewHod)
	) {
		await assertNoOtherHod(user.departments, user._id);
	}

	await user.save();
	ApiResponse.success(res, null, "User updated");
});

export const deleteUser = asyncHandler(async (req, res) => {
	const actor = req.user;
	const user = await User.findById(req.params.id);
	if (!user) throw ApiError.notFound("User not found");

	if (user._id.equals(actor._id)) {
		throw ApiError.forbidden("You cannot delete your own account");
	}
	if (!canManageUser(actor.role, user.role)) {
		throw ApiError.forbidden(
			"You do not have permission to delete this user",
		);
	}

	await user.deleteOne();
	ApiResponse.success(res, null, "User deleted");
});

export const resetPassword = asyncHandler(async (req, res) => {
	const newPassword = await resetUserPassword(req.params.id, req.user);
	ApiResponse.success(
		res,
		{ password: newPassword },
		"Password reset successfully",
	);
});
