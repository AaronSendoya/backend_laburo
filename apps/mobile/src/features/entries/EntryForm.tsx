import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { validateFreeText } from '@app-laburo/shared';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { FormField } from '@/components/FormField';
import { SectionHeader } from '@/components/SectionHeader';
import { Spacing } from '@/constants/theme';
import type { TimeEntryDraft } from '@/db/repositories/timeEntries.repository';

const NOTE_MAX_LENGTH = 500;

interface EntryFormInitial {
  checkIn: string;
  checkOut: string | null;
  note: string | null;
}

interface EntryFormProps {
  initial?: EntryFormInitial;
  onSubmit: (draft: TimeEntryDraft) => void;
  onDelete?: () => void;
  submitLabel: string;
}

export function EntryForm({ initial, onSubmit, onDelete, submitLabel }: EntryFormProps) {
  const [checkIn, setCheckIn] = useState(initial ? new Date(initial.checkIn) : new Date());
  const [hasCheckOut, setHasCheckOut] = useState(Boolean(initial?.checkOut));
  const [checkOut, setCheckOut] = useState(initial?.checkOut ? new Date(initial.checkOut) : new Date());
  const [note, setNote] = useState(initial?.note ?? '');
  const [dateError, setDateError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  function handleSubmit() {
    if (hasCheckOut && checkOut.getTime() <= checkIn.getTime()) {
      setDateError('La hora de salida debe ser posterior a la de entrada.');
      return;
    }
    setDateError(null);

    const noteResult = validateFreeText(note, { fieldLabel: 'La descripción', maxLength: NOTE_MAX_LENGTH });
    if (!noteResult.valid) {
      setNoteError(noteResult.error ?? null);
      return;
    }
    setNoteError(null);

    onSubmit({
      checkIn: checkIn.toISOString(),
      checkOut: hasCheckOut ? checkOut.toISOString() : null,
      note: note.trim() || null,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GlassCard style={styles.section}>
        <SectionHeader icon="log-in-outline">Entrada</SectionHeader>
        <DateTimePicker value={checkIn} mode="datetime" display="compact" onChange={(_event, date) => date && setCheckIn(date)} />
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.rowBetween}>
          <SectionHeader icon="log-out-outline">Salida</SectionHeader>
          <Switch value={hasCheckOut} onValueChange={setHasCheckOut} />
        </View>
        {hasCheckOut ? (
          <DateTimePicker value={checkOut} mode="datetime" display="compact" onChange={(_event, date) => date && setCheckOut(date)} />
        ) : (
          <ThemedText themeColor="textSecondary">Todavía estás trabajando — sin hora de salida.</ThemedText>
        )}
      </GlassCard>

      <GlassCard style={styles.section}>
        <FormField
          label="Descripción (opcional)"
          value={note}
          onChangeText={(text) => {
            setNote(text);
            setNoteError(null);
          }}
          error={noteError}
          placeholder="Ej: reunión de equipo, avance del módulo X..."
          multiline
          maxLength={NOTE_MAX_LENGTH}
          style={styles.noteInput}
        />
      </GlassCard>

      {dateError ? (
        <ThemedText themeColor="danger" style={styles.error}>
          {dateError}
        </ThemedText>
      ) : null}

      <GlassButton variant="primary" onPress={handleSubmit} style={styles.button}>
        {submitLabel}
      </GlassButton>

      {onDelete ? (
        <GlassButton variant="danger" onPress={onDelete} style={styles.button}>
          Eliminar
        </GlassButton>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.three },
  section: { gap: Spacing.two },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteInput: { minHeight: 70, textAlignVertical: 'top' },
  error: { textAlign: 'center' },
  button: { marginTop: Spacing.two },
});
