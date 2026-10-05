import { Department } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

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

// Throws a 400 unless the id belongs to an existing, active department.
export const assertActiveDepartment = async (id) => {
	if (!(await Department.exists({ _id: id, isActive: true })))
		throw ApiError.badRequest("Department not found or inactive");
};
