import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreferenceStore } from '@/theme/themePreference.store';

/** Combina el esquema del sistema con la preferencia explícita del usuario (Ajustes › Apariencia). */
export function useEffectiveColorScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const preference = useThemePreferenceStore((s) => s.preference);

  if (preference === 'light' || preference === 'dark') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
