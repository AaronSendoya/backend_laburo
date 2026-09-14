import * as SecureStore from 'expo-secure-store';
import type { ThemePreference } from './themePreference.store';

const KEY = 'themePreference';

export async function loadThemePreference(): Promise<ThemePreference> {
  const value = await SecureStore.getItemAsync(KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await SecureStore.setItemAsync(KEY, preference);
}
