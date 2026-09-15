import * as Notifications from 'expo-notifications';
import { DEFAULT_REMINDER_THRESHOLD_HOURS } from '@/settings/localSettings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Programa el recordatorio con el ID de la propia entrada como identificador
 * de la notificación — así no hace falta guardar nada en la base local para
 * poder cancelarla después: alcanza con cancelReminder(entry.id).
 */
export async function scheduleOpenEntryReminder(
  entryId: string,
  checkInIso: string,
  thresholdHours: number = DEFAULT_REMINDER_THRESHOLD_HOURS,
): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const triggerDate = new Date(new Date(checkInIso).getTime() + thresholdHours * 3_600_000);
  if (triggerDate.getTime() <= Date.now()) return; // ya pasó el umbral (ej. entrada cargada manualmente para una hora vieja)

  await Notifications.scheduleNotificationAsync({
    identifier: entryId,
    content: {
      title: 'Entrada sin cerrar',
      body: 'Todavía no marcaste tu salida — abrí Laburo si ya terminaste de trabajar.',
      data: { entryId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function cancelOpenEntryReminder(entryId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(entryId).catch(() => undefined);
}
