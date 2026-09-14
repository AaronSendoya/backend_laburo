import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/use-theme';

interface PasswordToggleButtonProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordToggleButton({ visible, onToggle }: PasswordToggleButtonProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onToggle} hitSlop={10} style={styles.button}>
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 10 },
});
