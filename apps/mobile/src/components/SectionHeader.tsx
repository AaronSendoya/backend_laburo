import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  children: string;
}

export function SectionHeader({ icon, children }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={13} color={theme.textSecondary} />
      <ThemedText type="smallBold" themeColor="textSecondary">
        {children.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
