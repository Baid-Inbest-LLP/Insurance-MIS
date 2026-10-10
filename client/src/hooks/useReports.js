import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/report.api';
import { queryKeys } from '../lib/queryKeys';

export const useReport = (report, params, enabled) =>
  useQuery({
    queryKey: queryKeys.report(report, params),
    queryFn: async () => (await reportsApi.get(report, params)).data.data,
    placeholderData: keepPreviousData,
    enabled,
  });
