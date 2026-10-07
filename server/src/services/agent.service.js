import { Agent } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

const rethrowDuplicate = (error) => {
	if (error.code === 11000)
		throw ApiError.conflict("An agent with this name already exists");
	throw error;
};

const findLiveAgent = async (id) => {
	const agent = await Agent.findOne({ _id: id, deletedAt: null });
	if (!agent) throw ApiError.notFound("Agent not found");
	return agent;
};

// Returns the live agents sorted by name, optionally including inactive ones.
export const listAgents = ({ includeInactive = false }) =>
	Agent.find({ deletedAt: null, ...(!includeInactive && { isActive: true }) })
		.select("name isActive")
		.sort({ name: 1 })
		.lean();

export const createAgent = async ({ name, isActive }) => {
	try {
		await Agent.create({ name, isActive });
	} catch (error) {
		rethrowDuplicate(error);
	}
};

// Updates an agent's name or active status.
export const updateAgent = async ({ id, name, isActive }) => {
	const agent = await findLiveAgent(id);
	if (name !== undefined) agent.name = name;
	if (isActive !== undefined) agent.isActive = isActive;

	try {
		await agent.save();
	} catch (error) {
		rethrowDuplicate(error);
	}
};

// Soft-deletes an agent; transactions that used it keep pointing at it.
export const deleteAgent = async ({ id }) => {
	const agent = await findLiveAgent(id);
	agent.deletedAt = new Date();
	agent.isActive = false;
	await agent.save();
};
