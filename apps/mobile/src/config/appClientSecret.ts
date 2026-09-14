/**
 * Secreto compartido con el backend (APP_CLIENT_SECRET), embebido en el
 * bundle de la app — se manda solo, como header, en cada /auth/register.
 * Filtra registros que no vengan de la app real sin pedirle nada a la
 * persona (nada de códigos para escribir a mano). No es a prueba de alguien
 * que decompile el bundle — para este proyecto personal, el riesgo real es
 * que cualquiera que encuentre la URL pública se registre solo, y eso sí lo
 * evita.
 */
export const APP_CLIENT_SECRET = process.env.EXPO_PUBLIC_APP_CLIENT_SECRET ?? '';
