import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_EMAIL_KEY = 'authEmail';

export interface AuthSession {
  token: string;
  email: string;
}

/** null si no hay sesión — el estado por defecto de la app, y el único que hace falta para seguir 100% local. */
export async function getAuthSession(): Promise<AuthSession | null> {
  const [token, email] = await Promise.all([SecureStore.getItemAsync(AUTH_TOKEN_KEY), SecureStore.getItemAsync(AUTH_EMAIL_KEY)]);
  if (!token || !email) return null;
  return { token, email };
}

export async function setAuthSession(session: AuthSession): Promise<void> {
  await Promise.all([SecureStore.setItemAsync(AUTH_TOKEN_KEY, session.token), SecureStore.setItemAsync(AUTH_EMAIL_KEY, session.email)]);
}

/** Cierra sesión: borra el token, nunca toca time_entries/outbox locales — los datos del dispositivo siguen ahí. */
export async function clearAuthSession(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(AUTH_TOKEN_KEY), SecureStore.deleteItemAsync(AUTH_EMAIL_KEY)]);
}
