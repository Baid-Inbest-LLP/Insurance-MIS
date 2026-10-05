import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isSuperAdmin } from "../constants/roles.js";
import * as masterValueService from "../services/master-value.service.js";

// Lists active items; superadmins can also include inactive ones.
export const listMasterItems = asyncHandler(async (req, res) => {
	const { departmentId, slug } = req.validated.params;
	const includeInactive =
		isSuperAdmin(req.user.role) &&
		req.validated.query.activeOnly === "false";
	const items = await masterValueService.listItems({
		departmentId,
		slug,
		includeInactive,
	});

	ApiResponse.success(res, { departmentId, slug, items });
});

// Adds a new item to a master list.
export const createMasterItem = asyncHandler(async (req, res) => {
	const { departmentId, slug } = req.validated.params;
	const { name, isActive } = req.body;
	const item = await masterValueService.createItem({
		departmentId,
		slug,
		name,
		isActive,
	});

	ApiResponse.created(res, { departmentId, slug, item }, "Master item created");
});

// Updates an item's name or active status.
export const updateMasterItem = asyncHandler(async (req, res) => {
	const { departmentId, slug, itemId } = req.validated.params;
	const { name, isActive } = req.body;
	const item = await masterValueService.updateItem({
		departmentId,
		slug,
		itemId,
		name,
		isActive,
	});

	ApiResponse.success(res, { departmentId, slug, item }, "Master item updated");
});

// Soft-deletes an item.
export const deleteMasterItem = asyncHandler(async (req, res) => {
	const { departmentId, slug, itemId } = req.validated.params;
	await masterValueService.deleteItem({ departmentId, slug, itemId });

	ApiResponse.success(res, null, "Master item deleted");
});
