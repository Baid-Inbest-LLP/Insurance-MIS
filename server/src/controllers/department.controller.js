import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isSuperAdmin } from "../constants/roles.js";
import * as departmentService from "../services/department.service.js";

// Lists active departments; superadmins can also include inactive ones.
export const listDepartments = asyncHandler(async (req, res) => {
	const includeInactive =
		isSuperAdmin(req.user.role) && req.validated.query.activeOnly === "false";
	const departments = await departmentService.listDepartments({
		includeInactive,
	});

	ApiResponse.success(res, departments);
});

// Adds a new department.
export const createDepartment = asyncHandler(async (req, res) => {
	const { name, code } = req.body;
	await departmentService.createDepartment({ name, code });

	ApiResponse.created(res, null, "Department created");
});

// Updates a department's name, code or status.
export const updateDepartment = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const { name, code, isActive } = req.body;
	await departmentService.updateDepartment({ id, name, code, isActive });

	ApiResponse.success(res, null, "Department updated");
});
