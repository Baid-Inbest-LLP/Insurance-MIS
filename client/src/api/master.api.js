import api from "./axios";

export const masterApi = {
	branches: () => api.get("/masters/branches"),
	locationCities: () => api.get("/masters/location-cities"),
	departments: (params) => api.get("/masters/departments", { params }),
	createDepartment: (data) => api.post("/masters/departments", data),
	updateDepartment: (id, data) => api.put(`/masters/departments/${id}`, data),
	users: () => api.get("/masters/users"),
	createBranch: (data) => api.post("/masters/branches", data),
	updateUser: (id, data) => api.put(`/masters/users/${id}`, data),
	deleteUser: (id) => api.delete(`/masters/users/${id}`),
	resetUserPassword: (id) => api.post(`/masters/users/${id}/reset-password`),
	listCatalogItems: (departmentId, slug, params) =>
		api.get(`/masters/catalog/${departmentId}/${slug}`, { params }),
	createCatalogItem: (departmentId, slug, data) =>
		api.post(`/masters/catalog/${departmentId}/${slug}`, data),
	updateCatalogItem: (departmentId, slug, itemId, data) =>
		api.put(`/masters/catalog/${departmentId}/${slug}/${itemId}`, data),
	deleteCatalogItem: (departmentId, slug, itemId) =>
		api.delete(`/masters/catalog/${departmentId}/${slug}/${itemId}`),
};
