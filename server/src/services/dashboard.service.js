import { Branch, Master, Transaction } from '../models/index.js';
import { MASTER_FIELDS } from '../constants/transactions.js';
import { ROLES, isStaffRole } from '../constants/roles.js';
import { assertCanWorkIn, canViewCommission } from './transaction.service.js';
import { toObjectId } from '../utils/mongoAggregation.js';

const round = (value) => Math.round(((value ?? 0) + Number.EPSILON) * 100) / 100;
const COMMISSION_AMOUNT = { $ifNull: ['$commission.totalCommission', '$commission.amount'] };
const NORMALIZED_CLIENT_NAME = {
  $toUpper: {
    $trim: {
      input: { $ifNull: ['$clientName', ''] },
    },
  },
};

const indiaCalendarParts = () => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts();
  return Object.fromEntries(parts.filter((part) => ['year', 'month', 'day'].includes(part.type)).map((part) => [part.type, Number(part.value)]));
};

const currentBusinessDate = () => {
  const { year, month, day } = indiaCalendarParts();
  return new Date(Date.UTC(year, month - 1, day));
};

const startOfFinancialYear = () => {
  const { year, month } = indiaCalendarParts();
  const financialYear = month < 4 ? year - 1 : year;
  return new Date(Date.UTC(financialYear, 3, 1));
};

const dashboardDateRange = (filters) => {
  const from = filters.from ?? startOfFinancialYear();
  const to = filters.to ?? currentBusinessDate();
  const endExclusive = new Date(to.getTime());
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { from, to, endExclusive };
};

const completeMonthlySeries = (monthly, { from, to }) => {
  const byMonth = new Map(monthly.map((row) => [`${row._id.year}-${String(row._id.month).padStart(2, '0')}`, row]));
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  const result = [];

  while (cursor <= lastMonth) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const row = byMonth.get(key);
    result.push({ month: key, policies: row?.policies ?? 0, premium: round(row?.premium) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return result;
};

const dashboardMatch = (actor, filters) => {
  if (filters.department) assertCanWorkIn(actor, filters.department);
  const { from, endExclusive } = dashboardDateRange(filters);

  return {
    deletedAt: null,
    ...(isStaffRole(actor.role) && {
      department: filters.department ? toObjectId(filters.department) : { $in: actor.departments },
    }),
    ...([ROLES.EMP_PREMIUM, ROLES.EMP_COMMISSION].includes(actor.role) && { createdBy: actor._id }),
    ...(!isStaffRole(actor.role) && filters.department && { department: toObjectId(filters.department) }),
    ...Object.fromEntries(
      ['branch', 'lob', 'insurer', 'businessType', 'agent']
        .filter((field) => filters[field])
        .map((field) => [field, toObjectId(filters[field])]),
    ),
    ...(filters.source && { source: filters.source }),
    ...(filters.productType && { productType: filters.productType }),
    policyDate: { $gte: from, ...(endExclusive && { $lt: endExclusive }) },
  };
};

const dashboardContext = (actor, filters) => ({
  match: dashboardMatch(actor, filters),
  departmentIds: filters.department ? [toObjectId(filters.department)] : isStaffRole(actor.role) ? actor.departments : [],
  includeCommission: canViewCommission(actor),
});

const contextDepartmentIds = async ({ departmentIds, match }) =>
  departmentIds.length ? departmentIds : Transaction.distinct('department', match);

const groupBy = (field, extra = {}) => [
  { $group: { _id: `$${field}`, policies: { $sum: 1 }, premium: { $sum: '$premium' }, ...extra } },
  { $sort: { premium: -1, _id: 1 } },
];

const mapNames = async (departmentIds, masterField, ids) => {
  const relevant = ids.filter(Boolean);
  if (!relevant.length) return new Map();
  const masters = await Master.aggregate([
    { $match: { department: { $in: departmentIds }, slug: MASTER_FIELDS[masterField].slug } },
    { $unwind: '$items' },
    { $match: { 'items._id': { $in: relevant } } },
    { $project: { _id: 0, id: '$items._id', name: '$items.name' } },
  ]);
  return new Map(masters.map((item) => [String(item.id), item.name]));
};

const namedRows = (groups, names) =>
  groups.map((group) => ({
    id: group._id ? String(group._id) : null,
    name: names.get(String(group._id)) ?? 'Unspecified',
    policies: group.policies,
    premium: round(group.premium),
  }));

// A panel asks only for its own aggregation. This avoids recalculating every
// dashboard chart when a user changes the financial year in one component.
export const getDashboardSection = async ({ actor, filters }) => {
  const { match, departmentIds, includeCommission } = dashboardContext(actor, filters);
  const section = filters.section;
  const withMeta = (data) => ({ permissions: { commission: includeCommission }, ...data });

  if (section === 'years') {
    const { policyDate: _policyDate, ...accessMatch } = match;
    const years = await Transaction.aggregate([
      { $match: { ...accessMatch, policyDate: { $exists: true } } },
      { $project: { year: { $year: '$policyDate' }, month: { $month: '$policyDate' } } },
      { $project: { financialYear: { $cond: [{ $lt: ['$month', 4] }, { $subtract: ['$year', 1] }, '$year'] } } },
      { $group: { _id: '$financialYear' } },
      { $sort: { _id: -1 } },
    ]);
    return withMeta({ years: years.map((row) => row._id) });
  }

  if (section === 'overview') {
    const [summary] = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: null, policies: { $sum: 1 }, premium: { $sum: '$premium' }, commission: { $sum: COMMISSION_AMOUNT }, clients: { $addToSet: NORMALIZED_CLIENT_NAME } } },
    ]);
    return withMeta({ kpis: {
      policies: summary?.policies ?? 0,
      premium: round(summary?.premium),
      activeClientNames: summary?.clients?.filter(Boolean).length ?? 0,
      ...(includeCommission && { commission: round(summary?.commission) }),
    } });
  }

  if (section === 'monthly') {
    const monthly = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: { year: { $year: '$policyDate' }, month: { $month: '$policyDate' } }, policies: { $sum: 1 }, premium: { $sum: '$premium' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    return withMeta({ monthly: completeMonthlySeries(monthly, dashboardDateRange(filters)) });
  }

  if (section === 'products') {
    const groups = await Transaction.aggregate([{ $match: match }, ...groupBy('productType')]);
    return withMeta({ productTypes: groups.map((group) => ({ id: group._id || null, name: group._id || 'Unspecified', policies: group.policies, premium: round(group.premium) })) });
  }

  if (section === 'sources') {
    const groups = await Transaction.aggregate([{ $match: match }, ...groupBy('source')]);
    return withMeta({ sources: groups.map((group) => ({ id: group._id, name: group._id || 'Unspecified', policies: group.policies, premium: round(group.premium) })) });
  }

  if (section === 'companies' || section === 'business-types') {
    const field = section === 'companies' ? 'insurer' : 'businessType';
    const groups = await Transaction.aggregate([{ $match: match }, ...groupBy(field)]);
    const names = await mapNames(await contextDepartmentIds({ departmentIds, match }), field, groups.map((group) => group._id));
    return withMeta({ [section === 'companies' ? 'insurers' : 'businessTypes']: namedRows(groups, names) });
  }

  if (section === 'offices') {
    const groups = await Transaction.aggregate([{ $match: match }, ...groupBy('branch')]);
    const branches = await Branch.find({ _id: { $in: groups.map((group) => group._id).filter(Boolean) } }).select('label').lean();
    return withMeta({ offices: namedRows(groups, new Map(branches.map((branch) => [String(branch._id), branch.label]))) });
  }

  if (section === 'recent') {
    const recent = await Transaction.find(match).select('policyDate policyNo clientName premium insurer branch source').sort({ policyDate: -1, _id: -1 }).limit(8).lean();
    const allDepartmentIds = await contextDepartmentIds({ departmentIds, match });
    const [insurers, branches] = await Promise.all([
      mapNames(allDepartmentIds, 'insurer', recent.map((row) => row.insurer)),
      Branch.find({ _id: { $in: recent.map((row) => row.branch) } }).select('label').lean(),
    ]);
    const branchNames = new Map(branches.map((branch) => [String(branch._id), branch.label]));
    return withMeta({ recentPolicies: recent.map((row) => ({ _id: row._id, policyDate: row.policyDate, policyNo: row.policyNo, clientName: row.clientName, premium: round(row.premium), insurer: insurers.get(String(row.insurer)) ?? 'Unspecified', office: branchNames.get(String(row.branch)) ?? 'Unspecified', source: row.source })) });
  }

  return withMeta({});
};

export const getDashboard = async ({ actor, filters }) => {
  if (filters.section) return getDashboardSection({ actor, filters });
  const match = dashboardMatch(actor, filters);
  const departmentIds = filters.department ? [toObjectId(filters.department)] : isStaffRole(actor.role) ? actor.departments : [];
  const includeCommission = canViewCommission(actor);

  const [summaryRows, monthly, insurerGroups, lobGroups, branchGroups, sourceGroups, businessGroups, productGroups, recent] =
    await Promise.all([
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            policies: { $sum: 1 },
            premium: { $sum: '$premium' },
            netPremium: { $sum: '$netPremium' },
            commission: { $sum: COMMISSION_AMOUNT },
            clients: { $addToSet: NORMALIZED_CLIENT_NAME },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { year: { $year: '$policyDate' }, month: { $month: '$policyDate' } },
            policies: { $sum: 1 },
            premium: { $sum: '$premium' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Transaction.aggregate([{ $match: match }, ...groupBy('insurer')]),
      Transaction.aggregate([{ $match: match }, ...groupBy('lob')]),
      Transaction.aggregate([{ $match: match }, ...groupBy('branch')]),
      Transaction.aggregate([{ $match: match }, ...groupBy('source')]),
      Transaction.aggregate([{ $match: match }, ...groupBy('businessType')]),
      Transaction.aggregate([{ $match: match }, ...groupBy('productType')]),
      Transaction.find(match)
        .select('policyDate policyNo clientName premium insurer branch source')
        .sort({ policyDate: -1, _id: -1 })
        .limit(8)
        .lean(),
    ]);

  // Admins can span departments, so load every department that occurs in their
  // result set before resolving embedded master-list names.
  const allDepartmentIds = departmentIds.length
    ? departmentIds
    : await Transaction.distinct('department', match);
  const idsFor = (groups) => groups.map((group) => group._id).filter(Boolean);
  const [insurers, lobs, businesses, branches] = await Promise.all([
    mapNames(allDepartmentIds, 'insurer', idsFor(insurerGroups)),
    mapNames(allDepartmentIds, 'lob', idsFor(lobGroups)),
    mapNames(allDepartmentIds, 'businessType', idsFor(businessGroups)),
    Branch.find({ _id: { $in: idsFor(branchGroups) } }).select('label').lean(),
  ]);
  const branchNames = new Map(branches.map((branch) => [String(branch._id), branch.label]));
  const recentInsurers = await mapNames(allDepartmentIds, 'insurer', recent.map((row) => row.insurer));
  const recentBranches = await Branch.find({ _id: { $in: recent.map((row) => row.branch) } }).select('label').lean();
  const recentBranchNames = new Map(recentBranches.map((branch) => [String(branch._id), branch.label]));
  const summary = summaryRows[0] ?? { policies: 0, premium: 0, netPremium: 0, commission: 0, clients: [] };

  return {
    permissions: { commission: includeCommission },
    appliedFilters: { ...filters, from: filters.from ?? startOfFinancialYear() },
    kpis: {
      policies: summary.policies,
      premium: round(summary.premium),
      netPremium: round(summary.netPremium),
      activeClients: summary.clients.filter(Boolean).length,
      ...(includeCommission && { commission: round(summary.commission) }),
    },
    monthly: completeMonthlySeries(monthly, dashboardDateRange(filters)),
    insurers: namedRows(insurerGroups, insurers).slice(0, 10),
    lobs: namedRows(lobGroups, lobs),
    offices: namedRows(branchGroups, branchNames),
    sources: sourceGroups.map((group) => ({ id: group._id, name: group._id || 'Unspecified', policies: group.policies, premium: round(group.premium) })),
    businessTypes: namedRows(businessGroups, businesses),
    productTypes: productGroups.map((group) => ({ id: group._id, name: group._id || 'Unspecified', policies: group.policies, premium: round(group.premium) })),
    recentPolicies: recent.map((row) => ({
      _id: row._id,
      policyDate: row.policyDate,
      policyNo: row.policyNo,
      clientName: row.clientName,
      premium: round(row.premium),
      insurer: recentInsurers.get(String(row.insurer)) ?? 'Unspecified',
      office: recentBranchNames.get(String(row.branch)) ?? 'Unspecified',
      source: row.source,
    })),
  };
};
