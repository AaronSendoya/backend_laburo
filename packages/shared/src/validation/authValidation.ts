/**
 * Validación de email/contraseña para los formularios de crear cuenta e
 * iniciar sesión. Separada de textValidation.ts porque las reglas acá son de
 * formato/fortaleza, no de "texto libre razonable" (una contraseña buena
 * *debería* parecer aleatoria). Reusa el mismo shape de resultado para que
 * el componente FormField del móvil no necesite dos formas de mostrar error.
 */

export interface FieldValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lista corta e intencional: no reemplaza reglas de fortaleza, solo bloquea
// los casos más obvios que la gente prueba primero.
const COMMON_WEAK_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'qwerty123',
  '11111111',
  'abc12345',
  'contrasena',
  'contraseña',
  'admin123',
  'letmein1',
]);

export function validateEmail(value: string): FieldValidationResult {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Ingresá tu correo.' };
  }
  if (trimmed.length > 255) {
    return { valid: false, error: 'El correo es demasiado largo.' };
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Ingresá un correo válido.' };
  }

  return { valid: true };
}

/**
 * Mínimo 10 caracteres + letras y números combinados. bcrypt ignora todo lo
 * que pase de 72 bytes, así que lo tope ahí para que nunca se trunque en
 * silencio (una contraseña larga que "funciona" solo por sus primeros 72
 * caracteres es un bug de seguridad sutil).
 */
export function validatePassword(value: string): FieldValidationResult {
  if (value.length === 0) {
    return { valid: false, error: 'Ingresá una contraseña.' };
  }
  if (value.length < 10) {
    return { valid: false, error: 'Usá al menos 10 caracteres.' };
  }
  if (value.length > 72) {
    return { valid: false, error: 'La contraseña no puede superar los 72 caracteres.' };
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return { valid: false, error: 'Combiná letras y números.' };
  }
  if (COMMON_WEAK_PASSWORDS.has(value.toLowerCase())) {
    return { valid: false, error: 'Esa contraseña es muy común — elegí otra.' };
  }

  return { valid: true };
}

export function validatePasswordConfirmation(password: string, confirmation: string): FieldValidationResult {
  if (confirmation.length === 0) {
    return { valid: false, error: 'Repetí la contraseña.' };
  }
  if (password !== confirmation) {
    return { valid: false, error: 'Las contraseñas no coinciden.' };
  }
  return { valid: true };
}
