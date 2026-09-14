import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { outbox, syncMeta } from '../schema';

export interface OutboxRow {
  opId: string;
  entityId: string;
  opType: 'create' | 'update' | 'delete';
  payload: string | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  status: 'pending' | 'in_flight' | 'failed';
}

export const outboxRepository = {
  listPending(limit = 50): OutboxRow[] {
    return db.select().from(outbox).where(eq(outbox.status, 'pending')).orderBy(asc(outbox.createdAt)).limit(limit).all() as OutboxRow[];
  },

  countPending(): number {
    return db.select({ opId: outbox.opId }).from(outbox).where(eq(outbox.status, 'pending')).all().length;
  },

  /** Se aplicó en el servidor (o ya estaba aplicada) — se puede borrar de la cola. */
  markApplied(opId: string): void {
    db.delete(outbox).where(eq(outbox.opId, opId)).run();
  },

  /** El servidor la rechazó (validación) — no reintentar para siempre, queda visible en Ajustes. */
  markFailed(opId: string, error: string): void {
    db.update(outbox)
      .set({ status: 'failed', lastError: error, attempts: sql`${outbox.attempts} + 1` })
      .where(eq(outbox.opId, opId))
      .run();
  },

  /** Error de red/servidor — se reintenta con backoff, solo se cuenta el intento. */
  incrementAttempts(opId: string, error: string): void {
    db.update(outbox)
      .set({ attempts: sql`${outbox.attempts} + 1`, lastError: error })
      .where(eq(outbox.opId, opId))
      .run();
  },

  listFailed(): OutboxRow[] {
    return db.select().from(outbox).where(eq(outbox.status, 'failed')).all() as OutboxRow[];
  },

  retry(opId: string): void {
    db.update(outbox).set({ status: 'pending', lastError: null }).where(eq(outbox.opId, opId)).run();
  },

  discard(opId: string): void {
    db.delete(outbox).where(eq(outbox.opId, opId)).run();
  },
};

export const syncMetaRepository = {
  get(key: string): string | null {
    const row = db.select().from(syncMeta).where(eq(syncMeta.key, key)).get();
    return row?.value ?? null;
  },
  set(key: string, value: string): void {
    db.insert(syncMeta).values({ key, value }).onConflictDoUpdate({ target: syncMeta.key, set: { value } }).run();
  },
};
