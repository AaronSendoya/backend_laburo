import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { outboxRepository } from '@/db/repositories/outbox.repository';
import { runSync } from '@/sync/syncEngine';

export const FAILED_OUTBOX_KEY = ['outbox', 'failed'] as const;

export function useFailedOutboxOps() {
  return useQuery({ queryKey: FAILED_OUTBOX_KEY, queryFn: () => outboxRepository.listFailed() });
}

export function useRetryOutboxOp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opId: string) => outboxRepository.retry(opId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FAILED_OUTBOX_KEY });
      void runSync();
    },
  });
}

export function useDiscardOutboxOp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opId: string) => outboxRepository.discard(opId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: FAILED_OUTBOX_KEY }),
  });
}
