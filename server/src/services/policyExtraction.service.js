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

// A policy and the master list can spell a company differently (Ltd/Limited, Co./Company, &/and).
const NAME_ABBREVIATIONS = { limited: "ltd", company: "co", private: "pvt", corporation: "corp" };

const normalizeName = (name) =>
	name
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((word) => word && word !== "the")
		.map((word) => NAME_ABBREVIATIONS[word] ?? word)
		.join(" ");

// Swaps the master item name the model chose for its id; no match gives null.
const resolveMasterItems = (fields, values, masterOptions) =>
	Object.fromEntries(
		fields.map(({ key, type }) => {
			const value = values[key];
			if (type !== FIELD_TYPES.MASTER || value === null) return [key, value];

			const item = masterOptions[key].find((option) => normalizeName(option.name) === normalizeName(value));
			return [key, item ? String(item._id) : null];
		}),
	);

// Reads a policy PDF into entry-form fields (null when not found); saves nothing.
// `kind` picks the prompt; `department` gives the permission check and master lists.
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
