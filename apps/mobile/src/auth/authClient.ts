import type { AuthResponse, ChangePasswordRequest, LoginRequest, RegisterRequest } from '@app-laburo/shared';
import { API_BASE_URL } from '@/config/apiBaseUrl';
import { APP_CLIENT_SECRET } from '@/config/appClientSecret';
import { ApiError, authenticatedRequest, extractErrorMessage } from '@/sync/apiClient';
import { clearAuthSession, getAuthSession, setAuthSession } from './authStorage';

/** /auth/register y /auth/login son públicos — nunca pasan por el header de sesión de apiClient.authenticatedRequest(). */
async function publicRequest<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Error de red');
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

/** El secreto va como header (nunca lo escribe la persona) — ver config/appClientSecret.ts. */
export async function register(input: RegisterRequest): Promise<AuthResponse> {
  const result = await publicRequest<AuthResponse>('/auth/register', input, { 'x-app-secret': APP_CLIENT_SECRET });
  await setAuthSession(result);
  return result;
}

export async function login(input: LoginRequest): Promise<AuthResponse> {
  const result = await publicRequest<AuthResponse>('/auth/login', input);
  await setAuthSession(result);
  return result;
}

export async function logout(): Promise<void> {
  await clearAuthSession();
}

/**
 * Autenticado (no publicRequest): el servidor exige el token actual para
 * cambiar la contraseña. La respuesta trae un token nuevo — el backend
 * invalida el viejo de una (ver JwtAuthGuard#tokenVersion), así que hay que
 * guardar el nuevo enseguida o el siguiente pedido saldría 401.
 */
export async function changePassword(input: ChangePasswordRequest): Promise<AuthResponse> {
  const result = await authenticatedRequest<AuthResponse>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await setAuthSession(result);
  return result;
}

export { getAuthSession };
export type { AuthSession } from './authStorage';
