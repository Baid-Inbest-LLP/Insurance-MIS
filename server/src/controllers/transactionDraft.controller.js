import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as draftService from "../services/transactionDraft.service.js";

// The user's own drafts, most recently saved first.
export const listDrafts = asyncHandler(async (req, res) => {
	ApiResponse.success(res, await draftService.listDrafts({ actor: req.user }));
});

// Saves a new draft and returns its id.
export const createDraft = asyncHandler(async (req, res) => {
	const draft = await draftService.createDraft({ actor: req.user, data: req.body });

	ApiResponse.created(res, draft, "Draft saved");
});

export const updateDraft = asyncHandler(async (req, res) => {
	await draftService.updateDraft({
		id: req.validated.params.id,
		actor: req.user,
		data: req.body,
	});

	ApiResponse.success(res, null, "Draft saved");
});

export const deleteDraft = asyncHandler(async (req, res) => {
	await draftService.deleteDraft({ id: req.validated.params.id, actor: req.user });

	ApiResponse.success(res, null, "Draft deleted");
});
