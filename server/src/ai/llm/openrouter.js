import { ApiError } from "../../utils/ApiError.js";

// Why an HTTP status from the provider means the call cannot work, in words for the user.
const failureFor = (status) => {
	if (status === 429)
		return ApiError.tooManyRequests("The AI service is busy. Please try again in a minute");
	if (status === 401 || status === 402 || status === 403)
		return ApiError.serviceUnavailable("The AI service is not available right now");
	return ApiError.badGateway("The AI service failed to answer. Please try again");
};

// A chat client for OpenRouter. Every provider exposes `complete({ system, user })` and
// resolves to the model's text answer, which keeps providers interchangeable.
export const createOpenRouterClient = ({ apiKey, baseUrl, model, timeoutMs }) => ({
	async complete({ system, user }) {
		if (!apiKey) throw ApiError.serviceUnavailable("AI autofill is not configured");

		let response;
		try {
			response = await fetch(`${baseUrl}/chat/completions`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"X-Title": "Insurance MIS",
				},
				body: JSON.stringify({
					model,
					temperature: 0,
					response_format: { type: "json_object" },
					messages: [
						{ role: "system", content: system },
						{ role: "user", content: user },
					],
				}),
				signal: AbortSignal.timeout(timeoutMs),
			});
		} catch (error) {
			// `fetch failed` hides the real reason (a wrong host, no network) in `error.cause`.
			console.error("OpenRouter request failed:", error.cause?.message ?? error.message);
			throw ApiError.badGateway(
				error.name === "TimeoutError"
					? "The AI service took too long to answer. Please try again"
					: "Could not reach the AI service. Please try again",
			);
		}

		const body = await response.json().catch(() => null);
		// OpenRouter can also report a provider failure inside a 200 response.
		const failedStatus = response.ok ? body?.error?.code : response.status;
		if (failedStatus) {
			console.error("OpenRouter error:", failedStatus, JSON.stringify(body?.error ?? body));
			throw failureFor(Number(failedStatus));
		}

		const content = body?.choices?.[0]?.message?.content;
		if (!content) throw ApiError.badGateway("The AI service returned an empty answer");
		return content;
	},
});
