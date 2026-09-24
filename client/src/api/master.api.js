import api from "./axios";

export const masterApi = {
	locations: () => api.get("/masters/locations"),
	locationCities: () => api.get("/masters/location-cities"),
	users: () => api.get("/masters/users"),
	createLocation: (data) => api.post("/masters/locations", data),
	updateUser: (id, data) => api.put(`/masters/users/${id}`, data),
	deleteUser: (id) => api.delete(`/masters/users/${id}`),
	resetUserPassword: (id) => api.post(`/masters/users/${id}/reset-password`),
};
