import { extractText, getDocumentProxy } from "unpdf";
import { ApiError } from "../utils/ApiError.js";

// Less text than this means a scan or image PDF.
const MIN_TEXT_LENGTH = 50;
// Keeps the prompt small; policy details are in the first pages.
const MAX_TEXT_LENGTH = 20000;

// Reads text from an in-memory PDF; scanned PDFs are rejected.
export const extractPdfText = async (buffer) => {
	let text;
	try {
		const pdf = await getDocumentProxy(new Uint8Array(buffer));
		({ text } = await extractText(pdf, { mergePages: true }));
	} catch {
		throw ApiError.badRequest(
			"This PDF could not be read. Check that it is a valid file and not password protected",
		);
	}

	const cleaned = text.replace(/[ \t]+/g, " ").trim();
	if (cleaned.length < MIN_TEXT_LENGTH)
		throw ApiError.badRequest(
			"No text found in this PDF. Scanned or image-only PDFs are not supported yet",
		);

	return cleaned.slice(0, MAX_TEXT_LENGTH);
};
