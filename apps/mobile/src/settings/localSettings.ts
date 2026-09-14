import * as SecureStore from 'expo-secure-store';

const COMPANY_NAME_KEY = 'companyName';
const STREAK_ENABLED_KEY = 'streakEnabled';
const REMINDERS_ENABLED_KEY = 'remindersEnabled';
const REMINDER_THRESHOLD_HOURS_KEY = 'reminderThresholdHours';
const HOURS_GOAL_KEY = 'hoursGoal';

export const DEFAULT_REMINDER_THRESHOLD_HOURS = 8;

/** Nombre de la empresa/lugar donde el usuario hace la pasantía — configurable porque puede cambiar. */
export async function getCompanyName(): Promise<string | null> {
  return SecureStore.getItemAsync(COMPANY_NAME_KEY);
}

export async function setCompanyName(name: string): Promise<void> {
  await SecureStore.setItemAsync(COMPANY_NAME_KEY, name);
}

/** La racha de días trabajados es opcional — algunas personas no quieren esa presión. Apagada por defecto. */
export async function getStreakEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(STREAK_ENABLED_KEY)) === 'true';
}

export async function setStreakEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(STREAK_ENABLED_KEY, String(enabled));
}

/** Recordatorio local de "te olvidaste de marcar salida" — requiere permiso de notificaciones, apagado por defecto. */
export async function getRemindersEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(REMINDERS_ENABLED_KEY)) === 'true';
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(REMINDERS_ENABLED_KEY, String(enabled));
}

/** Horas sin cerrar antes de avisar — configurable, 8 por defecto (ver reminders.ts). */
export async function getReminderThresholdHours(): Promise<number> {
  const raw = await SecureStore.getItemAsync(REMINDER_THRESHOLD_HOURS_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REMINDER_THRESHOLD_HOURS;
}

export async function setReminderThresholdHours(hours: number): Promise<void> {
  await SecureStore.setItemAsync(REMINDER_THRESHOLD_HOURS_KEY, String(hours));
}

/** Meta total de horas de la pasantía (ej. 480) — null si todavía no se configuró, la app no fuerza ninguna. */
export async function getHoursGoal(): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(HOURS_GOAL_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function setHoursGoal(hours: number): Promise<void> {
  await SecureStore.setItemAsync(HOURS_GOAL_KEY, String(hours));
}

export async function clearHoursGoal(): Promise<void> {
  await SecureStore.deleteItemAsync(HOURS_GOAL_KEY);
}
