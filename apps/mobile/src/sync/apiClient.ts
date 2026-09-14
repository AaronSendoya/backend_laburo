import type { SyncOperation, SyncPushResponse, SyncPullResponse } from '@app-laburo/shared';
import { API_BASE_URL } from '@/config/apiBaseUrl';
import { getAuthSession } from '@/auth/authStorage';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

interface ErrorBody {
  message?: string | string[];
}

/** NestJS devuelve `message` como string o array (errores de validación de nestjs-zod) — cubrimos ambos. */
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorBody;
    if (Array.isArray(body.message)) return body.message.join(' ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    // sin body JSON legible — cae al mensaje genérico de abajo
  }
  return `El servidor respondió ${response.status}`;
}

/**
 * Todo pedido autenticado exige sesión — ya no hay una clave compartida que
 * "siempre está configurada". Sin sesión, esto tira y el SyncEngine lo
 * interpreta como "no hay nada que sincronizar todavía" (ver syncEngine.ts).
 */
export async function authenticatedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getAuthSession();
  if (!session) {
    throw new ApiError('Iniciá sesión para sincronizar con la nube.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}`, ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Error de red');
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

/** Ping público, sin auth — usado para "despertar" el backend apenas hay conectividad/foreground. */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export function pushOperations(operations: SyncOperation[]): Promise<SyncPushResponse> {
  return authenticatedRequest<SyncPushResponse>('/sync/push', { method: 'POST', body: JSON.stringify({ operations }) });
}

export function pullSince(since: string | null): Promise<SyncPullResponse> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  return authenticatedRequest<SyncPullResponse>(`/sync/pull${query}`);
}
