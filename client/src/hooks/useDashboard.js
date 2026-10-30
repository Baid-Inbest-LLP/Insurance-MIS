import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';

export const useDashboard = (params) =>
  useQuery({
    queryKey: ['dashboard', params],
    queryFn: async () => (await dashboardApi.get(params)).data.data,
  });
