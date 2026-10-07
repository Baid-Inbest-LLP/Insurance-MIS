import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "../api/master.api";
import { queryKeys } from "../lib/queryKeys";

export const useUsers = (enabled = true) =>
	useQuery({
		queryKey: queryKeys.users,
		queryFn: async () => (await masterApi.users()).data.data ?? [],
		enabled,
	});

// City-scoped roles get only their own assigned city; other roles get every active city.
export const useLocationCities = (enabled = true) =>
	useQuery({
		queryKey: queryKeys.locationCities,
		queryFn: async () => (await masterApi.locationCities()).data.data ?? [],
		enabled,
		staleTime: 5 * 60 * 1000,
	});

// Superadmins can include inactive departments; other roles only ever get active ones.
export const useDepartments = ({ includeInactive = false, enabled = true } = {}) =>
	useQuery({
		queryKey: [...queryKeys.departments, { includeInactive }],
		queryFn: async () =>
			(
				await masterApi.departments(
					includeInactive ? { activeOnly: false } : undefined,
				)
			).data.data ?? [],
		enabled,
		staleTime: 5 * 60 * 1000,
	});

// Agents are shared by every department; superadmins can include inactive ones.
export const useAgents = ({ includeInactive = false } = {}) =>
	useQuery({
		queryKey: [...queryKeys.agents, { includeInactive }],
		queryFn: async () =>
			(
				await masterApi.agents(includeInactive ? { activeOnly: false } : undefined)
			).data.data ?? [],
		staleTime: 5 * 60 * 1000,
	});

// Agents also feed the transaction form's lookups, so both are refreshed.
const invalidateAgents = (queryClient) =>
	Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.agents }),
		queryClient.invalidateQueries({ queryKey: ["masters", "lookups"] }),
	]);

export const useCreateAgent = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data) => {
			await masterApi.createAgent(data);
		},
		onSuccess: () => invalidateAgents(queryClient),
	});
};

export const useUpdateAgent = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }) => {
			await masterApi.updateAgent(id, data);
		},
		onSuccess: () => invalidateAgents(queryClient),
	});
};

export const useDeleteAgent = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id) => {
			await masterApi.deleteAgent(id);
		},
		onSuccess: () => invalidateAgents(queryClient),
	});
};

export const useCreateDepartment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data) => {
			await masterApi.createDepartment(data);
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.departments }),
	});
};

export const useUpdateDepartment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }) => {
			await masterApi.updateDepartment(id, data);
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.departments }),
	});
};

export const useMasterItems =(departmentId, slug, { activeOnly = true, enabled = true } = {}) =>
	useQuery({
		queryKey: queryKeys.catalogItems(departmentId, slug, activeOnly),
		queryFn: async () =>
			(await masterApi.listCatalogItems(departmentId, slug, { activeOnly })).data.data.items ?? [],
		enabled: Boolean(departmentId) && Boolean(slug) && enabled,
		staleTime: 5 * 60 * 1000,
	});

const invalidateMasterItems = (queryClient, departmentId, slug) =>
	queryClient.invalidateQueries({ queryKey: ["masters", "catalog", departmentId, slug] });

export const useCreateMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ departmentId, slug, data }) =>
			(await masterApi.createCatalogItem(departmentId, slug, data)).data.data,
		onSuccess: (_data, { departmentId, slug }) => invalidateMasterItems(queryClient, departmentId, slug),
	});
};

export const useUpdateMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ departmentId, slug, itemId, data }) =>
			(await masterApi.updateCatalogItem(departmentId, slug, itemId, data)).data.data,
		onSuccess: (_data, { departmentId, slug }) => invalidateMasterItems(queryClient, departmentId, slug),
	});
};

export const useDeleteMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ departmentId, slug, itemId }) => {
			await masterApi.deleteCatalogItem(departmentId, slug, itemId);
		},
		onSuccess: (_data, { departmentId, slug }) => invalidateMasterItems(queryClient, departmentId, slug),
	});
};

export const useUpdateUser = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }) =>
			(await masterApi.updateUser(id, data)).data.data,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.users }),
	});
};

export const useDeleteUser = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id) => {
			await masterApi.deleteUser(id);
			return id;
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.users }),
	});
};

export const useResetUserPassword = () =>
	useMutation({
		mutationFn: async (id) =>
			(await masterApi.resetUserPassword(id)).data.data.password,
	});
