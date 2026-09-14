import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timeEntriesRepository, type TimeEntryDraft, type ReportFilters } from '@/db/repositories/timeEntries.repository';
import { triggerSyncSoon } from '@/sync/syncEngine';
import { getRemindersEnabled, getReminderThresholdHours } from '@/settings/localSettings';
import { cancelOpenEntryReminder, scheduleOpenEntryReminder } from '@/notifications/reminders';

const keys = {
  all: ['time-entries'] as const,
  byDate: (localDate: string) => ['time-entries', 'by-date', localDate] as const,
  workedDates: ['time-entries', 'worked-dates'] as const,
  openEntry: ['time-entries', 'open-entry'] as const,
  search: (filters: ReportFilters) => ['time-entries', 'search', filters] as const,
  byId: (id: string) => ['time-entries', 'by-id', id] as const,
};

export function useWorkedDates() {
  return useQuery({ queryKey: keys.workedDates, queryFn: () => timeEntriesRepository.listWorkedDates() });
}

export function useEntriesByDate(localDate: string) {
  return useQuery({ queryKey: keys.byDate(localDate), queryFn: () => timeEntriesRepository.listByLocalDate(localDate) });
}

/** La entrada abierta (sin salida), si existe — define si el botón principal dice "Entrada" o "Salida". */
export function useOpenEntry() {
  return useQuery({ queryKey: keys.openEntry, queryFn: () => timeEntriesRepository.getOpenEntry() });
}

export function useEntry(id: string | undefined) {
  return useQuery({
    queryKey: keys.byId(id ?? ''),
    queryFn: () => timeEntriesRepository.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useReportSearch(filters: ReportFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: keys.search(filters),
    queryFn: () => timeEntriesRepository.search(filters),
    enabled: options?.enabled ?? true,
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: keys.all });
    triggerSyncSoon();
  };
}

export function useCreateTimeEntry() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (draft: TimeEntryDraft) => Promise.resolve(timeEntriesRepository.create(draft)),
    onSuccess: (entry, draft) => {
      invalidateAll();
      if (draft.checkOut === null) {
        void Promise.all([getRemindersEnabled(), getReminderThresholdHours()]).then(([enabled, thresholdHours]) => {
          if (enabled) void scheduleOpenEntryReminder(entry.id, entry.checkIn, thresholdHours);
        });
      }
    },
  });
}

export function useUpdateTimeEntry() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: TimeEntryDraft }) => Promise.resolve(timeEntriesRepository.update(id, draft)),
    onSuccess: (entry, { id, draft }) => {
      invalidateAll();
      if (draft.checkOut !== null) {
        // se cerró (o ya estaba cerrada) — no tiene sentido seguir esperando el recordatorio.
        void cancelOpenEntryReminder(id);
      }
    },
  });
}

export function useDeleteTimeEntry() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(timeEntriesRepository.softDelete(id)),
    onSuccess: (_result, id) => {
      invalidateAll();
      void cancelOpenEntryReminder(id);
    },
  });
}
