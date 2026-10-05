// Central registry of React Query keys so invalidations stay consistent.
export const queryKeys = {
	me: ["auth", "me"],
	companies: (params) => ["companies", "list", params ?? {}],
	users: ["masters", "users"],
	locationCities: ["masters", "locationCities"],
	departments: ["masters", "departments"],
	catalogItems: (departmentId, slug, activeOnly = true) => ["masters", "catalog", departmentId, slug, { activeOnly }],
};
