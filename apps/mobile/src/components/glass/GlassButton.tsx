import { type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from 'expo-glass-effect';
import { GlassTint, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEffectiveColorScheme } from '@/hooks/use-effective-color-scheme';

interface GlassButtonProps extends PropsWithChildren {
  onPress: () => void;
  /** Estilo del contenido interno (padding). */
  style?: StyleProp<ViewStyle>;
  /** Estilo del contenedor externo — usar para `flex`/`alignSelf` (ej. dos botones repartiéndose una fila). */
  containerStyle?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'default' | 'danger';
  disabled?: boolean;
}

export function GlassButton({ children, onPress, style, containerStyle, variant = 'default', disabled }: GlassButtonProps) {
  const scheme = useEffectiveColorScheme();
  const theme = useTheme();
  const tint = GlassTint[scheme];
  const shadow = Shadows[scheme];

  const solidColor = variant === 'primary' ? theme.accent : variant === 'danger' ? theme.danger : undefined;
  // Sombra solo en los botones "sólidos" (primary/danger) — son la acción
  // principal de su contexto, la sombra ayuda a que se sientan flotando
  // encima del resto, mientras que el variant "default" queda más recesivo.
  const showShadow = Boolean(solidColor) && !disabled;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        { borderRadius: Radii.button },
        showShadow ? shadow : null,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        containerStyle,
      ]}>
      <GlassView
        isInteractive
        glassEffectStyle="regular"
        tintColor={solidColor}
        style={[
          styles.base,
          {
            borderRadius: Radii.button,
            backgroundColor: solidColor ?? tint.fill,
            borderColor: solidColor ? 'transparent' : tint.border,
          },
          style,
        ]}>
        <Text style={[styles.label, { color: solidColor ? '#ffffff' : theme.text }]}>{children}</Text>
      </GlassView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
