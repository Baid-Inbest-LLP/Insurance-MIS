import {
	Agent,
	Branch,
	GiTransaction,
	LiTransaction,
	Master,
	Transaction,
} from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { escapeRegex } from "../utils/searchUtils.js";
import { ROLES, isHod, isStaffRole } from "../constants/roles.js";
import { MASTER_FIELDS, TRANSACTION_KINDS } from "../constants/transactions.js";
import { assertActiveDepartments } from "./department.service.js";

// Fields a user may leave empty; an update that leaves one out clears it.
const OPTIONAL_FIELDS = {
	[TRANSACTION_KINDS.GI]: [
		"agent",
		"officeCode",
		"reference",
		"clientGst",
		"vehicleNo",
		"maker",
		"model",
		"mfgDate",
		"ncb",
	],
	[TRANSACTION_KINDS.LI]: ["officeCode", "reference", "nextDueDate"],
};

const DETAIL_POPULATE = [
	{ path: "department", select: "name" },
	{ path: "branch", select: "label" },
	{ path: "agent", select: "name" },
	{ path: "createdBy", select: "name" },
];

// The table only shows these fields; the full record comes from the details endpoint.
const LIST_FIELDS =
	"kind department branch policyDate policyNo clientName insurer businessType lob source premium createdBy";
const LIST_POPULATE = [{ path: "branch", select: "label" }];

const hasDepartment = (actor, departmentId) =>
	actor.departments.some((id) => id.equals(departmentId));

// Staff roles work only inside their own departments; admin and superadmin work in all of them.
export const assertCanWorkIn = (actor, departmentId) => {
	if (isStaffRole(actor.role) && !hasDepartment(actor, departmentId))
		throw ApiError.forbidden("You do not have access to this department");
};

// Employees edit their own entries; a HOD edits any entry in their departments.
const canModify = (actor, transaction) => {
	if (!isStaffRole(actor.role)) return true;
	if (!hasDepartment(actor, transaction.department)) return false;
	return isHod(actor.role) || transaction.createdBy.equals(actor._id);
};

// Premium employees never see commission; everyone else sees it on the transactions they can read.
const canViewCommission = (actor) => actor.role !== ROLES.EMP_PREMIUM;

// Superadmin and admin manage commission everywhere, a HOD inside their departments, and a
// commission employee only on the entries they created.
const canManageCommission = (actor, { department, createdBy }) => {
	if (!isStaffRole(actor.role)) return true;
	if (!hasDepartment(actor, department)) return false;
	if (isHod(actor.role)) return true;
	return actor.role === ROLES.EMP_COMMISSION && createdBy.equals(actor._id);
};

const assertCanManageCommission = (allowed) => {
	if (!allowed) throw ApiError.forbidden("You do not have permission to manage commission");
};

const canDelete = (actor, transaction) =>
	!isStaffRole(actor.role) ||
	(isHod(actor.role) && hasDepartment(actor, transaction.department));

const findLiveTransaction = async (id) => {
	const transaction = await Transaction.findOne({ _id: id, deletedAt: null });
	if (!transaction) throw ApiError.notFound("Transaction not found");
	return transaction;
};

const rethrowDuplicate = (error) => {
	if (error.code === 11000)
		throw ApiError.conflict(
			"This policy number is already recorded for this insurer on the same policy date",
		);
	throw error;
};

const assertActiveAgent = async (agentId) => {
	if (!(await Agent.exists({ _id: agentId, isActive: true, deletedAt: null })))
		throw ApiError.badRequest("Agent not found or inactive");
};

const assertActiveBranch = async (branchId) => {
	if (!(await Branch.exists({ _id: branchId, isActive: true })))
		throw ApiError.badRequest("Branch not found or inactive");
};

// Each id must be a live, active item of that department's master list.
const assertMasterItems = async (departmentId, references) => {
	const fields = Object.keys(references).filter((field) => references[field]);
	if (!fields.length) return;

	// The database looks for each id inside its list, so the lists themselves are never loaded.
	const valid = await Master.find({
		department: departmentId,
		$or: fields.map((field) => ({
			slug: MASTER_FIELDS[field].slug,
			items: { $elemMatch: { _id: references[field], isActive: true, deletedAt: null } },
		})),
	})
		.select("slug")
		.lean();
	const validSlugs = new Set(valid.map((master) => master.slug));

	for (const field of fields) {
		const { slug, label } = MASTER_FIELDS[field];
		if (!validSlugs.has(slug))
			throw ApiError.badRequest(`${label} is not an active item of this department`);
	}
};

// On update, only references that changed are checked, so an old record stays editable
// after one of its master items is deactivated.
const assertReferences = async (data, existing = null) => {
	const changed = (field) => !existing || String(existing[field] ?? "") !== String(data[field] ?? "");
	const references = Object.fromEntries(
		Object.keys(MASTER_FIELDS)
			.filter((field) => data[field] && changed(field))
			.map((field) => [field, data[field]]),
	);

	await Promise.all([
		existing ? null : assertActiveDepartments([data.department]),
		changed("branch") ? assertActiveBranch(data.branch) : null,
		data.agent && changed("agent") ? assertActiveAgent(data.agent) : null,
		assertMasterItems(data.department, references),
	]);
};

// The distinct departments and master item ids a page of transactions refers to.
const collectMasterIds = (transactions) => {
	const departments = new Map();
	const items = new Map();
	for (const transaction of transactions) {
		departments.set(String(transaction.department), transaction.department);
		for (const field of Object.keys(MASTER_FIELDS))
			if (transaction[field]) items.set(String(transaction[field]), transaction[field]);
	}
	return { departmentIds: [...departments.values()], itemIds: [...items.values()] };
};

// Maps `departmentId:slug:itemId` to the item's current name, loading only the items in use.
const loadMasterNames = async ({ departmentIds, itemIds }) => {
	const masters = await Master.aggregate([
		{ $match: { department: { $in: departmentIds } } },
		{
			$project: {
				department: 1,
				slug: 1,
				items: {
					$filter: { input: "$items", as: "item", cond: { $in: ["$$item._id", itemIds] } },
				},
			},
		},
	]);
	const names = new Map();
	for (const master of masters)
		for (const item of master.items)
			names.set(`${master.department}:${master.slug}:${item._id}`, item.name);
	return names;
};

// A master item id as { _id, name }, or null when the transaction has none.
const masterItem = (transaction, field, names, departmentId) => {
	const id = transaction[field];
	return id
		? { _id: id, name: names.get(`${departmentId}:${MASTER_FIELDS[field].slug}:${id}`) ?? null }
		: null;
};

// The stored record without internal fields; master item ids become { _id, name }.
const toTransactionDto = (transaction, names) => {
	const { __v, deletedAt, updatedBy, branch, agent, ...dto } = transaction;

	for (const field of Object.keys(MASTER_FIELDS)) {
		if (field === "productType" && transaction.kind !== TRANSACTION_KINDS.LI) continue;
		dto[field] = masterItem(transaction, field, names, transaction.department._id);
	}

	dto.agent = agent ? { _id: agent._id, name: agent.name } : null;
	dto.branch = { _id: branch._id, code: branch.label };
	return dto;
};

// A table row: department and creator stay plain ids, which is all the row's permission checks need.
const toListItem = ({ branch, ...transaction }, names) => ({
	...transaction,
	branch: { _id: branch._id, code: branch.label },
	insurer: masterItem(transaction, "insurer", names, transaction.department),
	businessType: masterItem(transaction, "businessType", names, transaction.department),
	lob: masterItem(transaction, "lob", names, transaction.department),
});

// `transactions` are plain records; the references named in `populate` are filled in
// while the master item names load.
const hydrate = async (transactions, { populate, toDto }) => {
	if (!transactions.length) return [];

	const [populated, names] = await Promise.all([
		Transaction.populate(transactions, populate),
		loadMasterNames(collectMasterIds(transactions)),
	]);
	return populated.map((transaction) => toDto(transaction, names));
};

// Staff only see their own departments; admin and superadmin see all.
export const listTransactions = async ({ actor, filters }) => {
	const { page, limit, search, from, to, kind, department } = filters;
	const query = { deletedAt: null };

	if (isStaffRole(actor.role)) {
		if (department) assertCanWorkIn(actor, department);
		query.department = department ?? { $in: actor.departments };
	} else if (department) {
		query.department = department;
	}
	if (kind) query.kind = kind;
	for (const field of ["branch", "insurer", "lob", "agent"])
		if (filters[field]) query[field] = filters[field];
	if (from || to)
		query.policyDate = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
	if (search) {
		const pattern = escapeRegex(search);
		query.$or = [
			{ policyNo: { $regex: pattern, $options: "i" } },
			{ clientName: { $regex: pattern, $options: "i" } },
		];
	}

	const [total, transactions] = await Promise.all([
		Transaction.countDocuments(query),
		Transaction.find(query)
			.select(LIST_FIELDS)
			.sort({ policyDate: -1, _id: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
	]);

	return {
		items: await hydrate(transactions, { populate: LIST_POPULATE, toDto: toListItem }),
		pagination: { page, pages: Math.ceil(total / limit) || 1, total, limit },
	};
};

export const getTransaction = async ({ id, actor }) => {
	const transaction = await Transaction.findOne({ _id: id, deletedAt: null }).lean();
	if (!transaction) throw ApiError.notFound("Transaction not found");

	assertCanWorkIn(actor, transaction.department);
	const [dto] = await hydrate([transaction], { populate: DETAIL_POPULATE, toDto: toTransactionDto });
	if (!canViewCommission(actor)) delete dto.commission;
	return dto;
};

export const createTransaction = async ({ actor, data }) => {
	assertCanWorkIn(actor, data.department);
	if (data.commission)
		assertCanManageCommission(
			canManageCommission(actor, { department: data.department, createdBy: actor._id }),
		);
	await assertReferences(data);

	const Model = data.kind === TRANSACTION_KINDS.GI ? GiTransaction : LiTransaction;
	try {
		await Model.create({ ...data, createdBy: actor._id });
	} catch (error) {
		rethrowDuplicate(error);
	}
};

// `data` is the full set of fields: anything optional that it leaves out is cleared.
export const updateTransaction = async ({ id, actor, data }) => {
	const transaction = await findLiveTransaction(id);
	if (!canModify(actor, transaction))
		throw ApiError.forbidden("You do not have permission to edit this transaction");

	const { kind, department, commission, ...fields } = data;
	if (kind !== transaction.kind)
		throw ApiError.badRequest("Transaction type cannot be changed");
	if (!transaction.department.equals(department))
		throw ApiError.badRequest("Department cannot be changed");

	// Commission is replaced like every other field, but only by someone allowed to manage it;
	// for anyone else the stored commission is left exactly as it is.
	const manageCommission = canManageCommission(actor, transaction);
	if (commission) assertCanManageCommission(manageCommission);

	await assertReferences(data, transaction);

	for (const field of OPTIONAL_FIELDS[kind])
		if (fields[field] === undefined) transaction.set(field, undefined);
	const sent = Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== undefined),
	);
	transaction.set({ ...sent, updatedBy: actor._id });
	if (manageCommission) transaction.set("commission", commission);

	try {
		await transaction.save();
	} catch (error) {
		rethrowDuplicate(error);
	}
};

export const deleteTransaction = async ({ id, actor }) => {
	const transaction = await findLiveTransaction(id);
	if (!canDelete(actor, transaction))
		throw ApiError.forbidden("You do not have permission to delete this transaction");

	transaction.deletedAt = new Date();
	transaction.updatedBy = actor._id;
	await transaction.save();
};
