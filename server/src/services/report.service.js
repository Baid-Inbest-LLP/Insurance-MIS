import { Agent, Branch, Company, Department, Master, Transaction } from "../models/index.js";
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

// A drill-down for the exported Agent report. Each row is one insured client within
// its source, office, reference and agent grouping.
export const getAgentClientWiseReport = async ({ actor, filters }) => {
	assertCanWorkIn(actor, filters.department);

	const groups = await Transaction.aggregate([
		{ $match: reportMatch(filters) },
		{
			$group: {
				_id: {
					source: "$source",
					branch: "$branch",
					reference: { $ifNull: ["$reference", ""] },
					agent: "$agent",
					clientName: "$clientName",
					// Missing client names must remain separate rows. Otherwise all
					// unnamed policies are incorrectly aggregated into one client.
					clientKey: { $ifNull: ["$clientName", { $toString: "$_id" }] },
				},
				policies: { $sum: 1 },
				premium: { $sum: "$premium" },
			},
		},
	]);

	const branchIds = groups.map((group) => group._id.branch);
	const [branchDocs, agents, department] = await Promise.all([
		Branch.find({ _id: { $in: branchIds } }).select("label company").lean(),
		agentNames({ ids: groups.map((group) => group._id.agent).filter(Boolean) }),
		Department.findById(filters.department).select("code").lean(),
	]);
	const branches = new Map(branchDocs.map((branch) => [String(branch._id), branch.label]));
	const companyIds = [...new Set(branchDocs.map((branch) => (branch.company ? String(branch.company) : null)).filter(Boolean))];
	const company = companyIds.length === 1
		? await Company.findById(companyIds[0]).select("name code taxId").lean()
		: null;

	const rows = groups
		.map(({ _id, policies, premium }) => ({
			source: _id.source,
			branch: { _id: _id.branch, name: branches.get(String(_id.branch)) ?? "-" },
			reference: _id.reference || "-",
			agent: { _id: _id.agent ?? null, name: agents.get(String(_id.agent)) ?? "-" },
			clientName: _id.clientName || "Unnamed client",
			policies,
			premium: round(premium),
		}))
		.sort((a, b) =>
			[
				"sourceOrder",
				"branch.name",
				"reference",
				"agent.name",
				"clientName",
			].reduce((result, key) => {
				if (result) return result;
				if (key === "sourceOrder") {
					const sourceOrder = { DIRECT: 0, AGENTS: 1 };
					return (sourceOrder[String(a.source).toUpperCase()] ?? 99) - (sourceOrder[String(b.source).toUpperCase()] ?? 99);
				}
				const read = (row) => key.split(".").reduce((value, part) => value?.[part], row) ?? "";
				return String(read(a)).localeCompare(String(read(b)));
			}, 0),
		);

	return {
		rows,
		companyInfo: company
			? { name: company.name, code: company.code || company.name, taxId: company.taxId || "" }
			: null,
		departmentCode: department?.code || "",
		totals: {
			policies: rows.reduce((total, row) => total + row.policies, 0),
			premium: sumOf(rows, "premium"),
		},
	};
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
