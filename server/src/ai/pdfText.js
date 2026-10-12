import { extractText, getDocumentProxy } from "unpdf";
import { ApiError } from "../utils/ApiError.js";

// Fewer characters than this means the PDF has no text layer (a scan or an image).
const MIN_TEXT_LENGTH = 50;
// Keeps the prompt small; the details we need are in the first pages of a policy.
const MAX_TEXT_LENGTH = 20000;

// Reads the text of a PDF held in memory. Scanned PDFs are rejected: there is nothing to read.
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
