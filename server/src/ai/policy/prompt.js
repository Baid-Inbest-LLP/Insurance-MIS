import { describeFields } from "./fieldSpec.js";

// Rules that hold for every kind of policy.
const GENERAL_RULES = `Rules:
- Use only what is written in the document. Never guess. Adding up figures the document shows is allowed.
- When a value is not in the document, or you are not sure of it, use null.
- Dates are written as YYYY-MM-DD.
- Amounts are plain numbers in rupees: no currency symbol, no thousands separators ("7,00,000.00" becomes 700000).
- Reply with one JSON object that has exactly the keys listed below, and nothing else: no markdown, no explanation.`;

// `instructions` is the part written for one kind of policy; `fields` is what to read from it.
export const buildSystemPrompt = ({ instructions, fields }, masterNames) =>
	[
		instructions,
		GENERAL_RULES,
		`Keys to return:\n${describeFields(fields, masterNames)}`,
	].join("\n\n");

export const buildUserPrompt = (policyText) =>
	`Policy document text:\n"""\n${policyText}\n"""`;
