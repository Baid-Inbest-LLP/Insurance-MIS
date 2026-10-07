import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isSuperAdmin } from "../constants/roles.js";
import * as agentService from "../services/agent.service.js";

// Lists active agents; superadmins can also include inactive ones.
export const listAgents = asyncHandler(async (req, res) => {
	const includeInactive =
		isSuperAdmin(req.user.role) && req.validated.query.activeOnly === "false";
	const agents = await agentService.listAgents({ includeInactive });

	ApiResponse.success(res, agents);
});

export const createAgent = asyncHandler(async (req, res) => {
	const { name, isActive } = req.body;
	await agentService.createAgent({ name, isActive });

	ApiResponse.created(res, null, "Agent created");
});

export const updateAgent = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const { name, isActive } = req.body;
	await agentService.updateAgent({ id, name, isActive });

	ApiResponse.success(res, null, "Agent updated");
});

export const deleteAgent = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	await agentService.deleteAgent({ id });

	ApiResponse.success(res, null, "Agent deleted");
});
