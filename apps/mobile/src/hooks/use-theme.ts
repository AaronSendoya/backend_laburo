import { Colors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-effective-color-scheme';

export function useTheme() {
  return Colors[useEffectiveColorScheme()];
}
