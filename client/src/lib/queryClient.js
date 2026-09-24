import { QueryClient } from '@tanstack/react-query';

// Pull a user-friendly message out of an axios error.
export const getApiErrorMessage = (error, fallback = 'Something went wrong') => {
  // A request that got no response at all means the API is down or unreachable.
  if (error?.isAxiosError && !error.response) {
    return 'Cannot reach the server. Make sure the API is running and MONGODB_URI is set in server/.env.';
  }
  return error?.response?.data?.message || error?.message || fallback;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  },
});
