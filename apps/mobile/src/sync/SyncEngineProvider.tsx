import { type PropsWithChildren, useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { runSync } from './syncEngine';

/**
 * Dispara una sincronización al abrir la app, al volver a foreground, y cada
 * vez que vuelve la conexión. El motor mismo se encarga de no correr dos
 * veces en paralelo y de no hacer nada si no hay API key configurada.
 */
export function SyncEngineProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    void runSync();

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void runSync();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void runSync();
      }
    });

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, []);

  return children;
}
