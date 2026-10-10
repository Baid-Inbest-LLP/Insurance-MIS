// Central registry of React Query keys so invalidations stay consistent.
export const queryKeys = {
	me: ["auth", "me"],
	companies: (params) => ["companies", "list", params ?? {}],
	lookups: (department) => ["masters", "lookups", department ?? ""],
	transaction: (id) => ["transactions", "detail", id],
	transactions: (params) => ["transactions", "list", params ?? {}],
	report: (name, params) => ["reports", name, params],
	users: ["masters", "users"],
	agents: ["masters", "agents"],
	locationCities: ["masters", "locationCities"],
	departments: ["masters", "departments"],
	catalogItems: (departmentId, slug, activeOnly = true) => ["masters", "catalog", departmentId, slug, { activeOnly }],
};
