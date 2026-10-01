import { Master } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const normalizedName = (value) => value.trim().toLocaleLowerCase();

const findItem = (master, itemId) => master.items.id(itemId) || null;

const ensureUniqueName = (items, name, excludedItemId = null) => {
  const duplicate = items.some(
    (item) =>
      String(item._id) !== String(excludedItemId) &&
      normalizedName(item.name) === normalizedName(name),
  );
  if (duplicate)
    throw ApiError.conflict("An item with this name already exists");
};

// Returns active values to ordinary users. Superadmins can include inactive
// values when editing a master list.
export const listMasterItems = asyncHandler(async (req, res) => {
  const { section, slug } = req.validated.params;
  const master = await Master.findOne({ section, slug }).lean();
  const includeInactive =
    req.user.role === "superadmin" &&
    req.validated.query.activeOnly === "false";
  const items = (master?.items || []).filter(
    (item) => includeInactive || item.isActive,
  );

  ApiResponse.success(res, { section, slug, items });
});

export const createMasterItem = asyncHandler(async (req, res) => {
  const { section, slug } = req.validated.params;
  const { name, isActive = true } = req.body;
  let master = await Master.findOne({ section, slug });

  if (!master) master = new Master({ section, slug });
  ensureUniqueName(master.items, name);
  master.items.push({ name, isActive });
  await master.save();

  const item = master.items[master.items.length - 1];
  ApiResponse.created(res, { section, slug, item }, "Master item created");
});

export const updateMasterItem = asyncHandler(async (req, res) => {
  const { section, slug, itemId } = req.validated.params;
  const master = await Master.findOne({ section, slug });
  if (!master) throw ApiError.notFound("Master category not found");

  const item = findItem(master, itemId);
  if (!item) throw ApiError.notFound("Master item not found");

  if (req.body.name !== undefined) {
    ensureUniqueName(master.items, req.body.name, item._id);
    item.name = req.body.name;
  }
  if (req.body.isActive !== undefined) item.isActive = req.body.isActive;
  await master.save();

  ApiResponse.success(res, { section, slug, item }, "Master item updated");
});

export const deleteMasterItem = asyncHandler(async (req, res) => {
  const { section, slug, itemId } = req.validated.params;
  const master = await Master.findOne({ section, slug });
  if (!master) throw ApiError.notFound("Master category not found");

  const item = findItem(master, itemId);
  if (!item) throw ApiError.notFound("Master item not found");
  item.deleteOne();
  await master.save();

  ApiResponse.success(res, null, "Master item deleted");
});
