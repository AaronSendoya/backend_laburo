import { router, Stack, useLocalSearchParams } from 'expo-router';
import { EntryForm } from '@/features/entries/EntryForm';
import { HeaderCancelButton } from '@/components/HeaderCancelButton';
import { useCreateTimeEntry } from '@/hooks/useTimeEntries';

export default function NewEntryScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const create = useCreateTimeEntry();

  const initial = date ? { checkIn: new Date(`${date}T09:00:00`).toISOString(), checkOut: null, note: null } : undefined;

  return (
    <>
      <Stack.Screen options={{ headerLeft: () => <HeaderCancelButton /> }} />
      <EntryForm initial={initial} submitLabel="Guardar" onSubmit={(draft) => create.mutate(draft, { onSuccess: () => router.back() })} />
    </>
  );
}
