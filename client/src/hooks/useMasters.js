import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "../api/master.api";
import { queryKeys } from "../lib/queryKeys";

export const useUsers = (enabled = true) =>
	useQuery({
		queryKey: queryKeys.users,
		queryFn: async () => (await masterApi.users()).data.data ?? [],
		enabled,
	});

// Accountants get only their own assigned city; superadmin gets every active city.
export const useLocationCities = (enabled = true) =>
	useQuery({
		queryKey: queryKeys.locationCities,
		queryFn: async () => (await masterApi.locationCities()).data.data ?? [],
		enabled,
		staleTime: 5 * 60 * 1000,
	});

export const useMasterItems = (section, slug, { activeOnly = true, enabled = true } = {}) =>
	useQuery({
		queryKey: queryKeys.catalogItems(section, slug, activeOnly),
		queryFn: async () =>
			(await masterApi.listCatalogItems(section, slug, { activeOnly })).data.data.items ?? [],
		enabled: Boolean(section) && Boolean(slug) && enabled,
		staleTime: 5 * 60 * 1000,
	});

const invalidateMasterItems = (queryClient, section, slug) =>
	queryClient.invalidateQueries({ queryKey: ["masters", "catalog", section, slug] });

export const useCreateMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ section, slug, data }) =>
			(await masterApi.createCatalogItem(section, slug, data)).data.data,
		onSuccess: (_data, { section, slug }) => invalidateMasterItems(queryClient, section, slug),
	});
};

export const useUpdateMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ section, slug, itemId, data }) =>
			(await masterApi.updateCatalogItem(section, slug, itemId, data)).data.data,
		onSuccess: (_data, { section, slug }) => invalidateMasterItems(queryClient, section, slug),
	});
};

export const useDeleteMasterItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ section, slug, itemId }) => {
			await masterApi.deleteCatalogItem(section, slug, itemId);
		},
		onSuccess: (_data, { section, slug }) => invalidateMasterItems(queryClient, section, slug),
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
