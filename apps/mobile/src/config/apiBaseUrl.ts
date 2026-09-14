/**
 * URL del backend — ya no es editable a mano en Ajustes (ver historial:
 * antes vivía en SecureStore junto a la API key compartida). Ahora que hay
 * un único deploy real en Vercel, es una constante de build. En desarrollo
 * cae a localhost; en producción se fija vía variable de entorno pública de
 * Expo (EXPO_PUBLIC_* se embebe en el bundle, no es secreta — una URL no lo es).
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
