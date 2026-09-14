import { QueryClient } from '@tanstack/react-query';

/**
 * Los datos vienen de SQLite local, no de red — no hay costo por refetch,
 * así que staleTime en 0 y sin reintentos (un error de SQLite no se arregla
 * reintentando la misma query).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: false,
    },
  },
});
