// Central registry of React Query keys so invalidations stay consistent.
export const queryKeys = {
	me: ["auth", "me"],
	companies: (params) => ["companies", "list", params ?? {}],
	users: ["masters", "users"],
	locationCities: ["masters", "locationCities"],
	catalogItems: (department, slug, activeOnly = true) => ["masters", "catalog", department, slug, { activeOnly }],
};
