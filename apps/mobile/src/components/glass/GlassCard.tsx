import { type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { GlassTint, Radii, Shadows } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-effective-color-scheme';

interface GlassCardProps extends PropsWithChildren {
  /** Estilo del contenido interno (padding/gap/alignItems) — la card en sí siempre ocupa el ancho que le da su padre. */
  style?: StyleProp<ViewStyle>;
  /** Estilo del contenedor externo — usar para `flex`/`alignSelf` (ej. varias cards repartiéndose una fila). */
  containerStyle?: StyleProp<ViewStyle>;
  radius?: number;
}

/**
 * Superficie "glass" reutilizable. En iOS 26+ GlassView renderiza el material
 * Liquid Glass nativo real; en cualquier otra plataforma cae a una View
 * simple, así que el relleno/borde translúcido de abajo siempre se aplica
 * para que nunca se vea como una caja sin estilo.
 *
 * La sombra va en un contenedor externo SIN `overflow: hidden` — ese overflow
 * vive en el elemento de adentro (necesario para recortar el contenido a
 * `borderRadius`, sobre todo en el fallback de View simple) y en iOS recorta
 * cualquier sombra que se le ponga al mismo elemento.
 */
export function GlassCard({ children, style, containerStyle, radius = Radii.card }: GlassCardProps) {
  const scheme = useEffectiveColorScheme();
  const tint = GlassTint[scheme];
  const shadow = Shadows[scheme];

  return (
    <View style={[{ borderRadius: radius }, shadow, containerStyle]}>
      <GlassView
        glassEffectStyle="regular"
        style={[styles.base, { borderRadius: radius, backgroundColor: tint.fill, borderColor: tint.border }, style]}>
        {children}
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 16,
  },
});
