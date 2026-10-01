import api from "./axios";

export const masterApi = {
	locations: () => api.get("/masters/locations"),
	locationCities: () => api.get("/masters/location-cities"),
	users: () => api.get("/masters/users"),
	createLocation: (data) => api.post("/masters/locations", data),
	updateUser: (id, data) => api.put(`/masters/users/${id}`, data),
	deleteUser: (id) => api.delete(`/masters/users/${id}`),
	resetUserPassword: (id) => api.post(`/masters/users/${id}/reset-password`),
	listCatalogItems: (section, slug, params) =>
		api.get(`/masters/catalog/${section}/${slug}`, { params }),
	createCatalogItem: (section, slug, data) =>
		api.post(`/masters/catalog/${section}/${slug}`, data),
	updateCatalogItem: (section, slug, itemId, data) =>
		api.put(`/masters/catalog/${section}/${slug}/${itemId}`, data),
	deleteCatalogItem: (section, slug, itemId) =>
		api.delete(`/masters/catalog/${section}/${slug}/${itemId}`),
};
