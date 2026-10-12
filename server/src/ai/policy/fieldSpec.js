import { z } from "zod";
import { date, GST_PATTERN } from "../../validators/transaction.validator.js";

// A field to read from a policy is described once; the prompt and the answer check are both built from it.
export const FIELD_TYPES = {
	TEXT: "text",
	DATE: "date",
	AMOUNT: "amount",
	PERCENT: "percent",
	YEARS: "years",
	GST_NUMBER: "gstNumber",
	CHOICE: "choice",
	MASTER: "master",
};

export const textField = (key, description, max) => ({ key, type: FIELD_TYPES.TEXT, description, max });
export const dateField = (key, description) => ({ key, type: FIELD_TYPES.DATE, description });
export const amountField = (key, description) => ({ key, type: FIELD_TYPES.AMOUNT, description });
export const percentField = (key, description) => ({ key, type: FIELD_TYPES.PERCENT, description });
export const yearsField = (key, description) => ({ key, type: FIELD_TYPES.YEARS, description });
export const gstNumberField = (key, description) => ({ key, type: FIELD_TYPES.GST_NUMBER, description });
export const choiceField = (key, description, options) => ({
	key,
	type: FIELD_TYPES.CHOICE,
	description,
	options,
});
// The model names one item of the department's master list; the server turns the name into an id.
export const masterField = (key, description) => ({ key, type: FIELD_TYPES.MASTER, description });

// Models write numbers as text ("8,303.00") now and then; anything unreadable becomes null later.
const toNumber = (value) => (typeof value === "string" ? Number(value.replace(/[,\s]/g, "")) : value);
const numeric = (schema) => z.preprocess(toNumber, schema);
const roundedAmount = numeric(z.number().finite().min(0)).transform((value) => Number(value.toFixed(2)));

const isoDate = date("Date").transform((value) => value.toISOString().slice(0, 10));

const SCHEMA_BY_TYPE = {
	[FIELD_TYPES.TEXT]: ({ max }) => z.string().trim().min(1).max(max),
	[FIELD_TYPES.DATE]: () => isoDate,
	[FIELD_TYPES.AMOUNT]: () => roundedAmount,
	[FIELD_TYPES.PERCENT]: () => numeric(z.number().min(0).max(100)),
	[FIELD_TYPES.YEARS]: () => numeric(z.number().int().min(1)),
	[FIELD_TYPES.GST_NUMBER]: () => z.string().trim().toUpperCase().regex(GST_PATTERN),
	[FIELD_TYPES.CHOICE]: ({ options }) => z.enum(options),
	[FIELD_TYPES.MASTER]: () => z.string().trim().min(1),
};

// Checks the model's answer field by field. A missing, empty or invalid value becomes null,
// so one bad field never throws away the rest of the answer.
export const buildAnswerSchema = (fields) =>
	z.object(
		Object.fromEntries(
			fields.map((field) => [field.key, SCHEMA_BY_TYPE[field.type](field).nullable().catch(null)]),
		),
	);

const typeHint = (field, masterNames) => {
	switch (field.type) {
		case FIELD_TYPES.DATE:
			return "date as YYYY-MM-DD";
		case FIELD_TYPES.AMOUNT:
			return "number in rupees";
		case FIELD_TYPES.PERCENT:
			return "number from 0 to 100";
		case FIELD_TYPES.YEARS:
			return "whole number of years";
		case FIELD_TYPES.GST_NUMBER:
			return "15-character GSTIN";
		case FIELD_TYPES.CHOICE:
			return `one of ${field.options.map((option) => `"${option}"`).join(", ")}`;
		case FIELD_TYPES.MASTER: {
			const names = masterNames[field.key] ?? [];
			return names.length
				? `one of ${names.map((name) => `"${name}"`).join(", ")}, copied exactly`
				: "text";
		}
		default:
			return "text";
	}
};

// The field list shown to the model, one line per field.
export const describeFields = (fields, masterNames) =>
	fields
		.map((field) => `- "${field.key}" (${typeHint(field, masterNames)}): ${field.description}`)
		.join("\n");
