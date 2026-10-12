import { Agent, Branch, Department, Master } from "../models/index.js";
import { isStaffRole } from "../constants/roles.js";
import { MASTER_FIELDS } from "../constants/transactions.js";
import { assertCanWorkIn } from "./transaction.service.js";

const MASTER_SLUGS = Object.values(MASTER_FIELDS).map(({ slug }) => slug);

const toOption = ({ _id, name }) => ({ _id, name });

const emptyMasterOptions = () =>
	Object.fromEntries(Object.keys(MASTER_FIELDS).map((field) => [field, []]));

// A department's active master items, keyed by the transaction field they fill.
export const getMasterOptions = async (department) => {
	const masters = await Master.find({ department, slug: { $in: MASTER_SLUGS } }).lean();
	const itemsBySlug = new Map(
		masters.map(({ slug, items }) => [
			slug,
			items.filter((item) => item.isActive && !item.deletedAt).map(toOption),
		]),
	);

	return Object.fromEntries(
		Object.entries(MASTER_FIELDS).map(([field, { slug }]) => [field, itemsBySlug.get(slug) ?? []]),
	);
};

// Everything an entry form needs in one call: the user's departments, the branches, the agents
// (shared by all departments) and, when a department is given, its active master items keyed
// by the field they fill.
export const getLookups = async ({ actor, department }) => {
	if (department) assertCanWorkIn(actor, department);

	const [departments, branches, agents, masters] = await Promise.all([
		Department.find({
			isActive: true,
			...(isStaffRole(actor.role) && { _id: { $in: actor.departments } }),
		})
			.select("name code")
			.sort({ name: 1 })
			.lean(),
		Branch.find({ isActive: true }).select("label").sort({ createdAt: 1, _id: 1 }).lean(),
		Agent.find({ isActive: true, deletedAt: null }).select("name").sort({ name: 1 }).lean(),
		department ? getMasterOptions(department) : emptyMasterOptions(),
	]);

	return {
		departments,
		branches: branches.map(({ _id, label }) => ({ _id, code: label })),
		agents,
		masters,
	};
};
