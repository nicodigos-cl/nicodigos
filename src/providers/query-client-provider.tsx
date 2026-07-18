"use client";

import {
  QueryClient,
  QueryClientProvider as ReactQueryClientProvider,
} from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time and cache time can be configured as needed
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Optionally set mutation defaults here
      retry: 1,
    },
  },
});

interface QueryClientProviderProps {
  children: React.ReactNode;
}

export default function QueryClientProvider({
  children,
}: QueryClientProviderProps) {
  return (
    <ReactQueryClientProvider client={queryClient}>
      {children}
    </ReactQueryClientProvider>
  );
}
