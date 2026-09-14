import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { EntryForm } from '@/features/entries/EntryForm';
import { HeaderCancelButton } from '@/components/HeaderCancelButton';
import { useDeleteTimeEntry, useEntry, useUpdateTimeEntry } from '@/hooks/useTimeEntries';
import { useTheme } from '@/hooks/use-theme';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, isLoading } = useEntry(id);
  const update = useUpdateTimeEntry();
  const remove = useDeleteTimeEntry();
  const theme = useTheme();

  if (isLoading || !entry) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerLeft: () => <HeaderCancelButton /> }} />
      <EntryForm
        initial={entry}
        submitLabel="Guardar cambios"
        onSubmit={(draft) => update.mutate({ id, draft }, { onSuccess: () => router.back() })}
        onDelete={() => remove.mutate(id, { onSuccess: () => router.back() })}
      />
    </>
  );
}
