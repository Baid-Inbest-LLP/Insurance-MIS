import { Agent, Branch, Master, Transaction } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { toObjectId } from "../utils/mongoAggregation.js";
import { COMMISSION_STATUSES, MASTER_FIELDS } from "../constants/transactions.js";
import { assertCanWorkIn, canViewCommission } from "./transaction.service.js";

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// Report amounts are validated to two decimal places. Sum their integer paise
// values so binary floating point cannot create a one-paisa total difference.
const sumOf = (rows, field) =>
	rows.reduce((total, row) => total + Math.round(((row[field] ?? 0) + Number.EPSILON) * 100), 0) / 100;

// GI keeps its total commission in `totalCommission`, LI in `amount`.
const COMMISSION_AMOUNT = { $ifNull: ["$commission.totalCommission", "$commission.amount"] };

// Names of the groups: line of business and insurer items live in the department's master lists, branches and
// agents in their own collections.
const masterNames =
	(field) =>
	async ({ department }) => {
		const master = await Master.findOne({ department, slug: MASTER_FIELDS[field].slug }).select("items").lean();
		return new Map(master?.items.map((item) => [String(item._id), item.name]));
	};

const branchNames = async ({ ids }) => {
	const branches = await Branch.find({ _id: { $in: ids } }).select("label").lean();
	return new Map(branches.map((branch) => [String(branch._id), branch.label]));
};

const agentNames = async ({ ids }) => {
	const agents = await Agent.find({ _id: { $in: ids } }).select("name").lean();
	return new Map(agents.map((agent) => [String(agent._id), agent.name]));
};

// The department's live transactions in a policy date range; `ids` are further filters on id fields (branch, lob,
// insurer, businessType, agent).
const reportMatch = ({ department, from, to, ...ids }) => {
	// Dates from the query are midnight UTC. Use the next midnight as an
	// exclusive boundary so the selected end date includes its whole day.
	const endExclusive = to && new Date(to.getTime());
	if (endExclusive) endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

	return {
		deletedAt: null,
		department: toObjectId(department),
		...Object.fromEntries(Object.entries(ids).map(([field, id]) => [field, toObjectId(id)])),
		...((from || endExclusive) && {
			policyDate: { ...(from && { $gte: from }), ...(endExclusive && { $lt: endExclusive }) },
		}),
	};
};

// One row per `groupField` value in a department, with the `sums` accumulated per group and their totals.
// `filters` holds the department, the policy date range and the report's own extra filter; `scope` narrows the
// transactions further.
const summarize = async ({ actor, filters, groupField, loadNames, sums, scope = {} }) => {
	assertCanWorkIn(actor, filters.department);

	const groups = await Transaction.aggregate([
		{ $match: { ...reportMatch(filters), ...scope } },
		{ $group: { _id: `$${groupField}`, ...sums } },
	]);

	const names = await loadNames({ department: filters.department, ids: groups.map((group) => group._id) });
	const fields = Object.keys(sums);

	const rows = groups
		.map(({ _id, ...values }) => ({
			[groupField]: { _id, name: names.get(String(_id)) ?? null },
			...Object.fromEntries(fields.map((field) => [field, round(values[field])])),
		}))
		.sort((a, b) => (a[groupField].name ?? "").localeCompare(b[groupField].name ?? ""));

	return { rows, totals: Object.fromEntries(fields.map((field) => [field, sumOf(rows, field)])) };
};

// Policies and premium per group, and commission too for those who may see it.
const premiumReport =
	(groupField, loadNames) =>
	({ actor, filters }) =>
		summarize({
			actor,
			filters,
			groupField,
			loadNames,
			sums: {
				policies: { $sum: 1 },
				netPremium: { $sum: "$netPremium" },
				gst: { $sum: "$gst" },
				premium: { $sum: "$premium" },
				...(canViewCommission(actor) && { commission: { $sum: COMMISSION_AMOUNT } }),
			},
		});

export const getLobWiseReport = premiumReport("lob", masterNames("lob"));

export const getOfficeWiseReport = premiumReport("branch", branchNames);

export const getAgentWiseReport = premiumReport("agent", agentNames);

export const getInsurerWiseReport = premiumReport("insurer", masterNames("insurer"));

const commissionOf = (status) => ({
	$sum: { $cond: [{ $eq: ["$commission.status", status] }, COMMISSION_AMOUNT, 0] },
});

// Commission per insurer, split into received and pending; only entries that have commission count.
export const getCommissionReport = ({ actor, filters }) => {
	if (!canViewCommission(actor)) throw ApiError.forbidden("You do not have permission to view commission");

	return summarize({
		actor,
		filters,
		groupField: "insurer",
		loadNames: masterNames("insurer"),
		scope: { "commission.status": { $in: COMMISSION_STATUSES } },
		sums: {
			policies: { $sum: 1 },
			premium: { $sum: "$premium" },
			commission: { $sum: COMMISSION_AMOUNT },
			received: commissionOf("received"),
			pending: commissionOf("pending"),
		},
	});
};
