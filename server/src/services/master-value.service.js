import { Master } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

// Picks the fields exposed to API clients.
const toItemDto = ({ _id, name, isActive }) => ({ _id, name, isActive });

// An item is live until it has been soft-deleted.
const isLive = (item) => !item.deletedAt;

// Finds a live item by id inside a master document, or throws a 404.
const getLiveItem = (master, itemId) => {
	const item = master?.items.id(itemId);
	if (!item || !isLive(item))
		throw ApiError.notFound("Master item not found");
	return item;
};

// Throws a 409 if another live item already uses this name (case-insensitive).
const ensureUniqueName = (master, name, excludedItemId = null) => {
	const duplicate = master.items.some(
		(item) =>
			isLive(item) &&
			String(item._id) !== String(excludedItemId) &&
			item.name.localeCompare(name, undefined, {
				sensitivity: "accent",
			}) === 0,
	);
	if (duplicate)
		throw ApiError.conflict("An item with this name already exists");
};

// Returns the live items of a master list, optionally including inactive ones.
export const listItems = async ({ department, slug, includeInactive = false }) => {
	const master = await Master.findOne({ department, slug }).lean();
	return (master?.items || [])
		.filter((item) => isLive(item) && (includeInactive || item.isActive))
		.map(toItemDto);
};

// Adds an item, creating the master document if needed.
export const createItem = async ({ department, slug, name, isActive }) => {
	const master =
		(await Master.findOne({ department, slug })) ||
		new Master({ department, slug });
	ensureUniqueName(master, name);

	master.items.push({ name, isActive });
	await master.save();

	return toItemDto(master.items[master.items.length - 1]);
};

// Updates an item's name or active status.
export const updateItem = async ({
	department,
	slug,
	itemId,
	name,
	isActive,
}) => {
	const master = await Master.findOne({ department, slug });
	const item = getLiveItem(master, itemId);

	if (name !== undefined) {
		ensureUniqueName(master, name, item._id);
		item.name = name;
	}
	if (isActive !== undefined) item.isActive = isActive;
	await master.save();

	return toItemDto(item);
};

// Soft-deletes an item.
export const deleteItem = async ({ department, slug, itemId }) => {
	const master = await Master.findOne({ department, slug });
	const item = getLiveItem(master, itemId);

	item.deletedAt = new Date();
	item.isActive = false;
	await master.save();
};
