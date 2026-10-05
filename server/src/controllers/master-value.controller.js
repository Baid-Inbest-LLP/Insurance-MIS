import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as masterValueService from "../services/master-value.service.js";

// Lists active items; superadmins can also include inactive ones.
export const listMasterItems = asyncHandler(async (req, res) => {
	const { section, slug } = req.validated.params;
	const includeInactive =
		req.user.role === "superadmin" &&
		req.validated.query.activeOnly === "false";
	const items = await masterValueService.listItems({
		section,
		slug,
		includeInactive,
	});

	ApiResponse.success(res, { section, slug, items });
});

// Adds a new item to a master list.
export const createMasterItem = asyncHandler(async (req, res) => {
	const { section, slug } = req.validated.params;
	const { name, isActive } = req.body;
	const item = await masterValueService.createItem({
		section,
		slug,
		name,
		isActive,
	});

	ApiResponse.created(res, { section, slug, item }, "Master item created");
});

// Updates an item's name or active status.
export const updateMasterItem = asyncHandler(async (req, res) => {
	const { section, slug, itemId } = req.validated.params;
	const { name, isActive } = req.body;
	const item = await masterValueService.updateItem({
		section,
		slug,
		itemId,
		name,
		isActive,
	});

	ApiResponse.success(res, { section, slug, item }, "Master item updated");
});

// Soft-deletes an item.
export const deleteMasterItem = asyncHandler(async (req, res) => {
	const { section, slug, itemId } = req.validated.params;
	await masterValueService.deleteItem({ section, slug, itemId });

	ApiResponse.success(res, null, "Master item deleted");
});
