import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { queryKeys } from '../lib/queryKeys';
import { clearSession, getStoredUser, isAuthenticated, saveSession } from '../lib/session';
import { isSuperAdmin } from '../constants/roles';

// The authenticated user. Source of truth for `user` across the app.
export const useMe = () =>
  useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await authApi.getMe()).data.data,
    enabled: isAuthenticated(),
    initialData: getStoredUser() ?? undefined,
    staleTime: 5 * 60 * 1000,
  });

// Whether the current user is a superadmin — the common role check across the app.
export const useIsSuperAdmin = () => {
  const { data: user } = useMe();
  return isSuperAdmin(user?.role);
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials) => (await authApi.login(credentials)).data.data,
    onSuccess: (data) => {
      saveSession(data);
      queryClient.setQueryData(queryKeys.me, data.user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        /* best-effort: clear the local session even if the call fails */
      }
    },
    onSuccess: () => {
      clearSession();
      queryClient.clear();
    },
  });
};

export const useRegister = () =>
  useMutation({ mutationFn: async (data) => (await authApi.register(data)).data.data });

export const useChangePassword = () =>
  useMutation({ mutationFn: async (data) => (await authApi.changePassword(data)).data });
