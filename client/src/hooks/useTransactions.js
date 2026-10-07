import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api/transaction.api';
import { queryKeys } from '../lib/queryKeys';

const fetchTransaction = async (id) => (await transactionsApi.getOne(id)).data.data;

// Fresh for a short while, so a record loaded on hover is ready by the time it is clicked.
const TRANSACTION_STALE_TIME = 30 * 1000;

export const useTransactions = (params) =>
  useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: async () => {
      const { data } = await transactionsApi.getAll(params);
      return { transactions: data.data ?? [], pagination: data.pagination };
    },
    placeholderData: keepPreviousData,
  });

export const useTransaction = (id) =>
  useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: () => fetchTransaction(id),
    staleTime: TRANSACTION_STALE_TIME,
    retry: false,
  });

// Starts loading a transaction before it is opened, e.g. when the pointer reaches its button.
// A failed prefetch is ignored: opening the transaction later loads it again and reports the error.
export const usePrefetchTransaction = () => {
  const queryClient = useQueryClient();
  return (id) =>
    queryClient
      .query({
        queryKey: queryKeys.transaction(id),
        queryFn: () => fetchTransaction(id),
        staleTime: TRANSACTION_STALE_TIME,
      })
      .catch(() => {});
};

// Departments, branches and the department's master items for the transaction form, in one call.
export const useTransactionOptions = (department) =>
  useQuery({
    queryKey: queryKeys.lookups(department),
    queryFn: async () => (await transactionsApi.getOptions(department)).data.data,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

const invalidateTransactions = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['transactions'] });

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await transactionsApi.create(payload);
    },
    onSuccess: () => invalidateTransactions(queryClient),
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      await transactionsApi.update(id, data);
    },
    onSuccess: () => invalidateTransactions(queryClient),
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await transactionsApi.delete(id);
    },
    onSuccess: () => invalidateTransactions(queryClient),
  });
};
