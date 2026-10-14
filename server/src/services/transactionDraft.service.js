import { TransactionDraft } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { assertActiveDepartments } from "./department.service.js";
import { assertCanWorkIn } from "./transaction.service.js";

// A draft is private: only the user who saved it can read or change it.
const findOwnDraft = async (id, actor) => {
	const draft = await TransactionDraft.findOne({ _id: id, createdBy: actor._id });
	if (!draft) throw ApiError.notFound("Draft not found");
	return draft;
};

const assertCanDraftIn = async (actor, department) => {
	assertCanWorkIn(actor, department);
	await assertActiveDepartments([department]);
};

// The user's own drafts, most recently saved first.
export const listDrafts = ({ actor }) =>
	TransactionDraft.find({ createdBy: actor._id })
		.select("kind department data updatedAt")
		.sort({ updatedAt: -1 })
		.lean();

export const createDraft = async ({ actor, data: { kind, department, data } }) => {
	await assertCanDraftIn(actor, department);
	const draft = await TransactionDraft.create({ kind, department, data, createdBy: actor._id });
	return { _id: draft._id };
};

// Saving again replaces the draft's contents.
export const updateDraft = async ({ id, actor, data: { kind, department, data } }) => {
	const draft = await findOwnDraft(id, actor);
	await assertCanDraftIn(actor, department);
	draft.set({ kind, department, data });
	await draft.save();
};

export const deleteDraft = async ({ id, actor }) => {
	const { deletedCount } = await TransactionDraft.deleteOne({ _id: id, createdBy: actor._id });
	if (!deletedCount) throw ApiError.notFound("Draft not found");
};
