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

export const useMasterItems = (department, slug, { activeOnly = true, enabled = true } = {}) =>
	useQuery({
		queryKey: queryKeys.catalogItems(department, slug, activeOnly),
		queryFn: async () =>
			(await masterApi.listCatalogItems(department, slug, { activeOnly })).data.data.items ?? [],
		enabled: Boolean(department) && Boolean(slug) && enabled,
		staleTime: 5 * 60 * 1000,
	});

const invalidateMasterItems = (queryClient, department, slug) =>
	queryClient.invalidateQueries({ queryKey: ["masters", "catalog", department, slug] });

export const useCreateMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ department, slug, data }) =>
			(await masterApi.createCatalogItem(department, slug, data)).data.data,
		onSuccess: (_data, { department, slug }) => invalidateMasterItems(queryClient, department, slug),
	});
};

export const useUpdateMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ department, slug, itemId, data }) =>
			(await masterApi.updateCatalogItem(department, slug, itemId, data)).data.data,
		onSuccess: (_data, { department, slug }) => invalidateMasterItems(queryClient, department, slug),
	});
};

export const useDeleteMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ department, slug, itemId }) => {
			await masterApi.deleteCatalogItem(department, slug, itemId);
		},
		onSuccess: (_data, { department, slug }) => invalidateMasterItems(queryClient, department, slug),
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
