import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../api/company.api';
import { queryKeys } from '../lib/queryKeys';

export const useCompanies = (params) =>
  useQuery({
    queryKey: queryKeys.companies(params),
    queryFn: async () => {
      const { data } = await companiesApi.getAll(params);
      return {
        companies: data.data ?? [],
        total: data.pagination?.total ?? data.data?.length ?? 0,
      };
    },
    placeholderData: keepPreviousData,
  });

const invalidateCompanyData = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ['companies'] });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await companiesApi.create(payload)).data.data,
    onSuccess: () => invalidateCompanyData(queryClient),
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => (await companiesApi.update(id, data)).data.data,
    onSuccess: () => invalidateCompanyData(queryClient),
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await companiesApi.delete(id);
      return id;
    },
    onSuccess: () => invalidateCompanyData(queryClient),
  });
};
