import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from 'expo-glass-effect';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEffectiveColorScheme } from '@/hooks/use-effective-color-scheme';

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

const SIZE = 58;

export function FAB({ onPress, icon = 'add', style }: FABProps) {
  const theme = useTheme();
  const scheme = useEffectiveColorScheme();
  const shadow = Shadows[scheme];

  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [styles.wrap, shadow, style, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <GlassView isInteractive glassEffectStyle="regular" tintColor={theme.accent} style={styles.inner}>
        <Ionicons name={icon} size={26} color="#ffffff" />
      </GlassView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    borderRadius: Radii.pill,
  },
  inner: {
    width: SIZE,
    height: SIZE,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
