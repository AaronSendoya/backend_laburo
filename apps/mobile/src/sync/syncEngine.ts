import NetInfo from '@react-native-community/netinfo';
import type { SyncOperation } from '@app-laburo/shared';
import { outboxRepository, syncMetaRepository } from '@/db/repositories/outbox.repository';
import { timeEntriesRepository } from '@/db/repositories/timeEntries.repository';
import { queryClient } from '@/lib/queryClient';
import { FAILED_OUTBOX_KEY } from '@/hooks/useOutbox';
import { getAuthSession } from '@/auth/authStorage';
import { pullSince, pushOperations, checkHealth } from './apiClient';
import { useSyncStatusStore } from './syncStatus.store';

const LAST_PULLED_AT_KEY = 'lastPulledAt';
const BASE_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;
/**
 * Tope de tandas de 50 por corrida (hasta 1000 operaciones). Sin este loop,
 * un backlog grande (ej. cargar de una sentada un año de registros pasados,
 * o volver de varias semanas sin conexión) tardaría una corrida de sync por
 * cada 50 operaciones — con triggers esporádicos (foreground/reconexión),
 * podía sentirse "trabado" en Pendiente por mucho tiempo. Si igual sobra
 * backlog al llegar al tope, la próxima corrida lo sigue drenando.
 */
const MAX_PUSH_BATCHES_PER_SYNC = 20;

let syncing = false;
let backoffMs = BASE_BACKOFF_MS;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * push -> pull, siempre en ese orden. Nunca corre dos veces en paralelo
 * (mutex por variable de módulo — alcanza porque JS es single-threaded).
 */
export async function runSync(): Promise<void> {
  if (syncing) return;
  syncing = true;
  const store = useSyncStatusStore.getState();

  try {
    const session = await getAuthSession();
    if (!session) {
      // Sin cuenta creada/logueada nunca se sube nada — es la app local de
      // siempre, la nube es 100% opt-in (ver Ajustes > Respaldo en la nube).
      store.setStatus('offline');
      return;
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      store.setStatus('offline');
      return;
    }

    // Ping best-effort en paralelo a lo que sea que haga el usuario — ayuda a
    // que el backend ya esté despierto para cuando el push de abajo lo necesite.
    void checkHealth();

    const pushOk = await pushPending(store);
    if (!pushOk) return; // el error ya quedó reflejado en el store; se reintenta con backoff

    await pullRemote();

    const pendingCount = outboxRepository.countPending();
    store.setPendingCount(pendingCount);
    store.setStatus(pendingCount > 0 ? 'pending' : 'synced');
    store.setLastSyncedAt(new Date().toISOString());
    store.setLastError(null);
    backoffMs = BASE_BACKOFF_MS;
  } finally {
    syncing = false;
    void queryClient.invalidateQueries({ queryKey: FAILED_OUTBOX_KEY });
  }
}

async function pushPending(store: ReturnType<typeof useSyncStatusStore.getState>): Promise<boolean> {
  for (let batch = 0; batch < MAX_PUSH_BATCHES_PER_SYNC; batch++) {
    const pending = outboxRepository.listPending(50);
    if (pending.length === 0) return true;

    const operations: SyncOperation[] = pending.map((row) => ({
      opId: row.opId,
      entityId: row.entityId,
      opType: row.opType,
      payload: row.payload ? JSON.parse(row.payload) : null,
    }));

    try {
      const response = await pushOperations(operations);
      for (const result of response.results) {
        if (result.status === 'rejected') {
          outboxRepository.markFailed(result.opId, result.message ?? 'El servidor rechazó la operación');
          continue;
        }
        const op = pending.find((row) => row.opId === result.opId);
        outboxRepository.markApplied(result.opId);
        if (op) timeEntriesRepository.markSyncedIfNoPending(op.entityId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const row of pending) {
        outboxRepository.incrementAttempts(row.opId, message);
      }
      store.setStatus('error');
      store.setLastError(message);
      scheduleRetry();
      return false;
    }

    if (pending.length < 50) return true; // esa tanda era la última — outbox drenado
  }
  return true; // tope de esta corrida alcanzado; lo que queda lo sigue drenando la próxima
}

async function pullRemote(): Promise<void> {
  const since = syncMetaRepository.get(LAST_PULLED_AT_KEY);
  const result = await pullSince(since);
  timeEntriesRepository.applyRemoteBatch(result.entries);
  syncMetaRepository.set(LAST_PULLED_AT_KEY, result.cursor);
}

function scheduleRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  const jitter = Math.random() * 1_000;
  retryTimer = setTimeout(() => void runSync(), backoffMs + jitter);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
}

/** Después de cualquier escritura local: espera un toque para no disparar un sync por cada tecla, y corre. */
export function triggerSyncSoon(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void runSync(), 2_000);
}
