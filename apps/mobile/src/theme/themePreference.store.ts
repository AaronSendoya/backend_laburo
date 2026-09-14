import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemePreferenceState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Arranca en 'system' (comportamiento previo, sin cambios visibles) hasta que
 * se hidrata desde SecureStore al bootear la app — ver theme/themePreference.ts.
 */
export const useThemePreferenceStore = create<ThemePreferenceState>((set) => ({
  preference: 'system',
  setPreference: (preference) => set({ preference }),
}));
