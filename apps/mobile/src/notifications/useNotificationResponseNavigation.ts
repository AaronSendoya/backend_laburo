import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

/** Si el usuario toca el recordatorio de "entrada sin cerrar", lo lleva directo a corregirla. */
export function useNotificationResponseNavigation() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const entryId = response.notification.request.content.data?.entryId;
      if (typeof entryId === 'string') {
        router.push({ pathname: '/entry/[id]', params: { id: entryId } });
      }
    });
    return () => subscription.remove();
  }, []);
}
