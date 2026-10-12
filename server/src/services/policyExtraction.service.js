import { ApiError } from "../utils/ApiError.js";
import { generateJson } from "../ai/llm/index.js";
import { extractPdfText } from "../ai/pdfText.js";
import {
	FIELD_TYPES,
	POLICY_EXTRACTORS,
	buildAnswerSchema,
	buildSystemPrompt,
	buildUserPrompt,
} from "../ai/policy/index.js";
import { getMasterOptions } from "./lookup.service.js";
import { assertCanWorkIn } from "./transaction.service.js";

const normalizeName = (name) => name.trim().toLowerCase();

// Replaces the master item name the model chose with that item's id; a name that is not in the
// department's list (or none at all) becomes null.
const resolveMasterItems = (fields, values, masterOptions) =>
	Object.fromEntries(
		fields.map(({ key, type }) => {
			const value = values[key];
			if (type !== FIELD_TYPES.MASTER || value === null) return [key, value];

			const item = masterOptions[key].find((option) => normalizeName(option.name) === normalizeName(value));
			return [key, item ? String(item._id) : null];
		}),
	);

// Reads an uploaded policy PDF and returns the transaction fields found in it, ready to fill the
// entry form. Fields the document does not show are null. Nothing is saved.
// `kind` (gi or li) picks the prompt; `department` is still needed for the permission check and
// for the master lists the model chooses from.
export const extractPolicyFields = async ({ actor, department, kind, file }) => {
	assertCanWorkIn(actor, department);
	const extractor = POLICY_EXTRACTORS[kind];

	const [policyText, masterOptions] = await Promise.all([
		extractPdfText(file.buffer),
		getMasterOptions(department),
	]);
	const masterNames = Object.fromEntries(
		Object.entries(masterOptions).map(([field, items]) => [field, items.map(({ name }) => name)]),
	);

	const answer = await generateJson({
		system: buildSystemPrompt(extractor, masterNames),
		user: buildUserPrompt(policyText),
	});
	const parsed = buildAnswerSchema(extractor.fields).safeParse(answer);
	if (!parsed.success)
		throw ApiError.badGateway("The AI returned an answer that could not be read. Please try again");

	const values = extractor.normalize ? extractor.normalize(parsed.data) : parsed.data;
	return { fields: resolveMasterItems(extractor.fields, values, masterOptions) };
};
