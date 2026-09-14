import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useEffectiveColorScheme } from '@/hooks/use-effective-color-scheme';
import { GlassTint, Radii } from '@/constants/theme';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const scheme = useEffectiveColorScheme();
  const tint = GlassTint[scheme];

  return (
    <View style={[styles.container, { backgroundColor: tint.fill, borderColor: tint.border }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={styles.segment} hitSlop={4}>
            <View style={[styles.segmentInner, selected && { backgroundColor: theme.tint }]}>
              <ThemedText type="small" themeColor="textSecondary" style={[styles.label, selected && styles.labelSelected]}>
                {option.label}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: Radii.pill, borderWidth: StyleSheet.hairlineWidth, padding: 3, gap: 2 },
  segment: { flex: 1 },
  segmentInner: { paddingVertical: 7, borderRadius: Radii.pill - 3, alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600' },
  labelSelected: { color: '#ffffff' },
});
