/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Paleta de marca (definida por el usuario):
 *  - Slate #0B0F19        → fondo principal en dark mode
 *  - Azul Hielo #38BDF8   → "primario": badges, bordes activos, íconos, highlights (NUNCA texto sobre fondo claro)
 *  - Coral Neón #FF5C35   → "acento": botones de acción clave / CTAs primarios
 *  - Grafito #1E293B      → superficie: cards, modales, barras de navegación (dark mode)
 *  - Blanco Roto #F8FAFC  → fondo general en light mode
 *  - Texto contraste #FFFFFF / #0F172A → según el fondo, para WCAG
 * Los roles que la paleta no especifica (surface de light mode, texto secundario)
 * se completaron con la misma familia "slate" de la que salen esos valores, para
 * que no desentonen.
 */
export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F8FAFC',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
    textSecondary: '#64748B',
    tint: '#38BDF8',
    // Azul Hielo oscurecido, solo para TEXTO/links sobre fondo claro — la
    // paleta pide explícitamente no usar el tint plano como texto ahí (no
    // pasa el contraste WCAG sobre Blanco Roto). En dark mode el tint plano
    // ya tiene contraste de sobra, así que ahí es el mismo valor.
    tintText: '#0284C7',
    accent: '#FF5C35',
    success: '#16A34A',
    danger: '#DC2626',
    warning: '#D97706',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0B0F19',
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',
    textSecondary: '#94A3B8',
    tint: '#38BDF8',
    tintText: '#38BDF8',
    accent: '#FF5C35',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Tokens para las superficies "glass". GlassView de expo-glass-effect ya
 * renderiza el material Liquid Glass nativo en iOS 26+; estos colores son el
 * relleno/borde que se aplican siempre (incluso en el fallback a View plano
 * en iOS viejo, Android o web), para que la superficie nunca quede invisible.
 */
export const GlassTint = {
  light: {
    fill: 'rgba(255,255,255,0.55)',
    border: 'rgba(255,255,255,0.6)',
  },
  dark: {
    // Grafito (#1E293B) translúcido, no un gris genérico — así la superficie
    // "glass" del fallback (sin Liquid Glass nativo) queda dentro de la
    // paleta de marca en vez de un tono neutro sin relación.
    fill: 'rgba(30,41,59,0.6)',
    border: 'rgba(255,255,255,0.12)',
  },
} as const;

export const Radii = {
  chip: 10,
  card: 20,
  button: 16,
  sheet: 28,
  pill: 999,
} as const;

/**
 * Sombra por debajo de cada superficie "glass" — sin esto, las cards solo
 * tienen un borde de 1px y quedan visualmente planas contra el fondo,
 * sobre todo quando expo-glass-effect cae al fallback de View simple (todo
 * dispositivo pre-iOS 26). En light mode una sombra oscura suave alcanza;
 * en dark mode hace falta más opacidad/radio para que se note contra un
 * fondo ya oscuro.
 */
export const Shadows = {
  light: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  dark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

/** Convierte un color hex ("#RRGGBB") a rgba() con la opacidad indicada — usado para "pintar" intensidad (ej. horas trabajadas por día en el calendario). */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
