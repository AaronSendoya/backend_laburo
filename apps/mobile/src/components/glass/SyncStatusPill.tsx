import { StyleSheet, Text, View } from 'react-native';
import { useSyncStatusStore, type SyncStatus } from '@/sync/syncStatus.store';
import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/constants/theme';

const CONFIG: Record<SyncStatus, { label: (n: number) => string; colorKey: ThemeColor }> = {
  synced: { label: () => 'Sincronizado', colorKey: 'success' },
  pending: { label: (n) => `Pendiente (${n})`, colorKey: 'warning' },
  offline: { label: () => 'Sin conexión', colorKey: 'textSecondary' },
  error: { label: () => 'Error de sync', colorKey: 'danger' },
};

export function SyncStatusPill() {
  const status = useSyncStatusStore((s) => s.status);
  const pendingCount = useSyncStatusStore((s) => s.pendingCount);
  const theme = useTheme();
  const config = CONFIG[status];

  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.dot, { backgroundColor: theme[config.colorKey] }]} />
      <Text style={[styles.text, { color: theme.textSecondary }]}>{config.label(pendingCount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 13, fontWeight: '500' },
});
