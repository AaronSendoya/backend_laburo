import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChangePasswordRequest, LoginRequest, RegisterRequest } from '@app-laburo/shared';
import { changePassword, getAuthSession, login, logout, register } from '@/auth/authClient';
import { triggerSyncSoon } from '@/sync/syncEngine';

const AUTH_SESSION_KEY = ['auth', 'session'] as const;

export function useAuthSession() {
  return useQuery({ queryKey: AUTH_SESSION_KEY, queryFn: getAuthSession });
}

/** true solo cuando ya se confirmó que hay sesión — durante la carga inicial es false, no "deslogueado". */
export function useIsAuthenticated(): boolean {
  const { data } = useAuthSession();
  return Boolean(data);
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterRequest) => register(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY });
      triggerSyncSoon();
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginRequest) => login(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY });
      triggerSyncSoon();
    },
  });
}

/** Nunca toca los datos locales — solo borra la sesión y deja de sincronizar hasta que alguien vuelva a iniciar sesión. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY }),
  });
}

/** El token nuevo ya queda guardado por authClient.changePassword — solo hay que refrescar la sesión cacheada. */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePasswordRequest) => changePassword(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY }),
  });
}
