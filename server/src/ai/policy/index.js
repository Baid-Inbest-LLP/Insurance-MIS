import { TRANSACTION_KINDS } from "../../constants/transactions.js";
import { giExtractor } from "./gi.extractor.js";
import { liExtractor } from "./li.extractor.js";

// One extractor (prompt + fields) per kind; add new kinds here.
export const POLICY_EXTRACTORS = {
	[TRANSACTION_KINDS.GI]: giExtractor,
	[TRANSACTION_KINDS.LI]: liExtractor,
};

export { FIELD_TYPES, buildAnswerSchema } from "./fieldSpec.js";
export { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
