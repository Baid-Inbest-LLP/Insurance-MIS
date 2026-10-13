import { ApiError } from "../../utils/ApiError.js";

// Models sometimes wrap JSON in a markdown fence or extra text.
export const parseJsonObject = (text) => {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");

	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		throw ApiError.badGateway("The AI returned an answer that could not be read. Please try again");
	}
};
