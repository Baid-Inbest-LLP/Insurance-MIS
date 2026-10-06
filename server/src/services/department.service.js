import { Department, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ROLES } from "../constants/roles.js";

// Returns departments sorted by name, optionally including inactive ones.
export const listDepartments = ({ includeInactive = false }) =>
	Department.find(includeInactive ? {} : { isActive: true })
		.select("name code isActive")
		.sort({ name: 1 })
		.lean();

// Adds a department; duplicate names or codes are rejected by the database.
export const createDepartment = async ({ name, code }) => {
	await Department.create({ name, code });
};

// Updates a department's name, code or status; duplicate names or codes are rejected by the database.
export const updateDepartment = async ({ id, name, code, isActive }) => {
	const fields = Object.fromEntries(
		Object.entries({ name, code, isActive }).filter(([, value]) => value !== undefined),
	);
	const department = await Department.findByIdAndUpdate(id, fields, {
		runValidators: true,
	});
	if (!department) throw ApiError.notFound("Department not found");
};

// Throws a 409 if another active HOD already covers any of these departments.
export const assertNoOtherHod = async (departmentIds, excludedUserId = null) => {
	const hod = await User.findOne({
		role: ROLES.HOD,
		isActive: true,
		departments: { $in: departmentIds },
		...(excludedUserId && { _id: { $ne: excludedUserId } }),
	})
		.select("name departments")
		.populate("departments", "name")
		.lean();
	if (!hod) return;

	const takenNames = hod.departments
		.filter((d) => departmentIds.some((id) => String(id) === String(d._id)))
		.map((d) => d.name);
	throw ApiError.conflict(
		`${takenNames.join(", ")} already ${takenNames.length > 1 ? "have" : "has"} an HOD (${hod.name})`,
	);
};

// Throws a 400 unless every id (the list has no duplicates) belongs to an existing, active department.
export const assertActiveDepartments = async (ids) => {
	const activeCount = await Department.countDocuments({
		_id: { $in: ids },
		isActive: true,
	});
	if (activeCount !== ids.length)
		throw ApiError.badRequest("Department not found or inactive");
};
