import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { MigrationsGate } from '@/db/MigrationsGate';
import { queryClient } from '@/lib/queryClient';
import { SyncEngineProvider } from '@/sync/SyncEngineProvider';
import { useEffectiveColorScheme } from '@/hooks/use-effective-color-scheme';
import { loadThemePreference } from '@/theme/themePreference';
import { useThemePreferenceStore } from '@/theme/themePreference.store';
import { useNotificationResponseNavigation } from '@/notifications/useNotificationResponseNavigation';

SplashScreen.preventAutoHideAsync();

/**
 * (tabs) maneja su propia UI (NativeTabs) y no lleva header. day/[date] y
 * entry/* SÍ son pantallas empujadas de una Stack normal — así consiguen
 * header nativo con botón "atrás"/"Cancelar" y el safe-area resuelto solo,
 * en vez de flotar sueltas sobre los tabs sin forma de volver.
 */
export default function RootLayout() {
  const colorScheme = useEffectiveColorScheme();
  useNotificationResponseNavigation();

  useEffect(() => {
    void loadThemePreference().then((preference) => useThemePreferenceStore.getState().setPreference(preference));
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <AnimatedSplashOverlay />
        <MigrationsGate>
          <SyncEngineProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="day/[date]" options={{ title: 'Detalle del día', headerBackTitle: 'Calendario' }} />
              <Stack.Screen name="entry/new" options={{ title: 'Nueva entrada', presentation: 'modal' }} />
              <Stack.Screen name="entry/[id]" options={{ title: 'Editar entrada', presentation: 'modal' }} />
              <Stack.Screen name="auth/register" options={{ title: 'Crear cuenta', presentation: 'modal' }} />
              <Stack.Screen name="auth/login" options={{ title: 'Iniciar sesión', presentation: 'modal' }} />
              <Stack.Screen name="auth/change-password" options={{ title: 'Cambiar contraseña', presentation: 'modal' }} />
            </Stack>
          </SyncEngineProvider>
        </MigrationsGate>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
