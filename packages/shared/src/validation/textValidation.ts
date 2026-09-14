/**
 * Validación de texto libre reusada por cualquier campo editable por el
 * usuario (nombre de la empresa, descripción de una entrada, etc.). Lógica
 * pura y sin dependencias de UI para poder testearla y reusarla igual en
 * el formulario de entradas y en Ajustes.
 */

const SPANISH_PROFANITY = [
  'mierda',
  'puta',
  'puto',
  'putos',
  'putas',
  'carajo',
  'coño',
  'cono',
  'joder',
  'gilipollas',
  'cabron',
  'cabrón',
  'pendejo',
  'pendeja',
  'verga',
  'chinga',
  'chingada',
  'chingado',
  'hijueputa',
  'hijoputa',
  'hdp',
  'maricon',
  'maricón',
  'culero',
  'culera',
  'baboso',
  'imbecil',
  'imbécil',
  'pinche',
];

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(COMBINING_DIACRITICS, '');
}

export function containsProfanity(value: string): boolean {
  const normalized = stripAccents(value.toLowerCase());
  return SPANISH_PROFANITY.some((word) => new RegExp(`\\b${stripAccents(word)}\\b`, 'i').test(normalized));
}

/** true si algún carácter alfabético se repite más de `maxRun` veces seguidas ("jajajajaaaaa"). */
function hasLongRepeatedRun(value: string, maxRun = 4): boolean {
  let run = 1;
  for (let i = 1; i < value.length; i++) {
    const isRepeat = value.charAt(i).toLowerCase() === value.charAt(i - 1).toLowerCase() && /[a-zñáéíóúü]/i.test(value.charAt(i));
    run = isRepeat ? run + 1 : 1;
    if (run > maxRun) return true;
  }
  return false;
}

/** true si el texto entero (sin espacios) es un patrón corto de 1-3 caracteres repetido, ej. "jajajaja" o "asdasdasd". */
function hasRepeatingPattern(value: string, minRepeats = 4): boolean {
  const compact = value.replace(/\s+/g, '').toLowerCase();
  for (let patternLen = 1; patternLen <= 3; patternLen++) {
    if (compact.length < patternLen * minRepeats) continue;
    const pattern = compact.slice(0, patternLen);
    const rebuilt = pattern.repeat(Math.ceil(compact.length / patternLen)).slice(0, compact.length);
    if (rebuilt === compact) return true;
  }
  return false;
}

/** true si hay una "palabra" (sin espacios) irrazonablemente larga — típico de manotazos al teclado. */
function hasUnreasonablyLongToken(value: string, maxTokenLength = 22): boolean {
  return value.split(/\s+/).some((token) => token.length > maxTokenLength);
}

export interface TextValidationOptions {
  fieldLabel: string;
  required?: boolean;
  maxLength?: number;
}

export interface TextValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFreeText(value: string, options: TextValidationOptions): TextValidationResult {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    if (options.required) {
      return { valid: false, error: `${options.fieldLabel} no puede quedar vacío.` };
    }
    return { valid: true };
  }

  if (options.maxLength && trimmed.length > options.maxLength) {
    return { valid: false, error: `${options.fieldLabel} no puede superar los ${options.maxLength} caracteres.` };
  }

  if (hasLongRepeatedRun(trimmed) || hasRepeatingPattern(trimmed)) {
    return { valid: false, error: `${options.fieldLabel} tiene caracteres repetidos sin sentido — revisalo.` };
  }

  if (hasUnreasonablyLongToken(trimmed)) {
    return { valid: false, error: `${options.fieldLabel} tiene una palabra demasiado larga o texto sin espacios — revisá que no sea al azar.` };
  }

  if (containsProfanity(trimmed)) {
    return { valid: false, error: `${options.fieldLabel} contiene lenguaje inapropiado.` };
  }

  return { valid: true };
}
