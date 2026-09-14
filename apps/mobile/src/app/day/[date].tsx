import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { FAB } from '@/components/glass/FAB';
import { EmptyState } from '@/components/EmptyState';
import { useDeleteTimeEntry, useEntriesByDate } from '@/hooks/useTimeEntries';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatLocalDateLabel, formatTime } from '@/lib/format';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { data: entries = [] } = useEntriesByDate(date);
  const remove = useDeleteTimeEntry();
  const theme = useTheme();

  function handleDelete(id: string) {
    Alert.alert('Eliminar entrada', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: formatLocalDateLabel(date) }} />

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState icon="calendar-outline" message="No hay entradas registradas este día todavía." />
          </View>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <ThemedText type="smallBold">
                  {formatTime(item.checkIn)} — {item.checkOut ? formatTime(item.checkOut) : 'en curso'}
                </ThemedText>
                {item.note ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    {item.note}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText themeColor="tintText" type="smallBold">
                {formatDuration(item.checkIn, item.checkOut)}
              </ThemedText>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push({ pathname: '/entry/[id]', params: { id: item.id } })}
                hitSlop={8}
                style={styles.actionLink}>
                <Ionicons name="pencil-outline" size={15} color={theme.tintText} />
                <ThemedText type="small" themeColor="tintText">
                  Editar
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => handleDelete(item.id)} hitSlop={8} style={styles.actionLink}>
                <Ionicons name="trash-outline" size={15} color={theme.danger} />
                <ThemedText type="small" themeColor="danger">
                  Eliminar
                </ThemedText>
              </Pressable>
            </View>
          </GlassCard>
        )}
      />

      <FAB onPress={() => router.push({ pathname: '/entry/new', params: { date } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  list: { gap: Spacing.three, paddingBottom: Spacing.six * 1.5 },
  empty: { marginTop: Spacing.five },
  entryCard: { gap: Spacing.two },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entryInfo: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.four },
  actionLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
