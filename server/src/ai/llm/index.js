import { config } from "../../config/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { createOpenRouterClient } from "./openrouter.js";
import { parseJsonObject } from "./parseJson.js";

// To add a provider, give it the same `complete({ system, user })` and list it here.
const PROVIDERS = {
	openrouter: () =>
		createOpenRouterClient({ ...config.ai.openRouter, timeoutMs: config.ai.timeoutMs }),
};

let client;
const getClient = () => {
	if (client) return client;

	const create = PROVIDERS[config.ai.provider];
	if (!create) throw ApiError.serviceUnavailable("AI autofill is not configured");
	client = create();
	return client;
};

// Asks the model and returns its answer as a JSON object.
export const generateJson = async (prompt) => parseJsonObject(await getClient().complete(prompt));
