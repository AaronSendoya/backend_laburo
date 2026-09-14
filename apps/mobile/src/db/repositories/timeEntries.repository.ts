import { randomUUID } from 'expo-crypto';
import { and, desc, eq, gte, like, lt, isNull } from 'drizzle-orm';
import { timeEntryInputSchema, localDayKey, type TimeEntryRecord } from '@app-laburo/shared';
import { db } from '../client';
import { timeEntries, outbox } from '../schema';

export interface LocalTimeEntry {
  id: string;
  checkIn: string;
  checkOut: string | null;
  note: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface TimeEntryDraft {
  checkIn: string; // ISO-8601 UTC
  checkOut: string | null;
  note: string | null;
}

export interface ReportFilters {
  /** Fecha local YYYY-MM-DD, inclusive. */
  fromLocalDate: string;
  /** Fecha local YYYY-MM-DD, inclusive. */
  toLocalDate: string;
  keyword?: string;
  missingCheckoutOnly?: boolean;
}

/**
 * Cada método de escritura hace UN solo viaje síncrono a SQLite que cubre
 * "escribir la entidad" + "encolar la operación en el outbox", vía
 * db.transaction() (ver client.ts sobre por qué debe ser un callback NO
 * async). Si el proceso muere a mitad de camino, la transacción entera se
 * revierte — nunca queda una entidad sin su operación correspondiente en el
 * outbox, ni viceversa.
 */
export const timeEntriesRepository = {
  create(draft: TimeEntryDraft): LocalTimeEntry {
    const now = new Date().toISOString();
    const row: LocalTimeEntry = {
      id: randomUUID(),
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      note: draft.note,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    };

    db.transaction((tx) => {
      tx.insert(timeEntries).values(row).run();
      enqueue(tx, 'create', row.id, row, now);
    });

    return row;
  },

  update(id: string, draft: TimeEntryDraft): LocalTimeEntry {
    const now = new Date().toISOString();

    return db.transaction((tx) => {
      tx.update(timeEntries)
        .set({ checkIn: draft.checkIn, checkOut: draft.checkOut, note: draft.note, updatedAt: now, syncStatus: 'pending' })
        .where(eq(timeEntries.id, id))
        .run();

      const row = tx.select().from(timeEntries).where(eq(timeEntries.id, id)).get() as LocalTimeEntry | undefined;
      if (!row) {
        throw new Error(`TimeEntry ${id} no existe`);
      }

      enqueue(tx, 'update', id, row, now);
      return row;
    });
  },

  softDelete(id: string): void {
    const now = new Date().toISOString();

    db.transaction((tx) => {
      tx.update(timeEntries).set({ isDeleted: true, updatedAt: now, syncStatus: 'pending' }).where(eq(timeEntries.id, id)).run();

      // Compactación: si la creación de esta entidad todavía no se había
      // sincronizado, no tiene sentido avisarle al server — se cancela en
      // vez de mandar un create seguido de un delete.
      const pendingCreate = tx
        .select({ opId: outbox.opId })
        .from(outbox)
        .where(and(eq(outbox.entityId, id), eq(outbox.opType, 'create'), eq(outbox.status, 'pending')))
        .get();

      if (pendingCreate) {
        tx.delete(outbox).where(eq(outbox.entityId, id)).run();
        return;
      }

      tx.delete(outbox)
        .where(and(eq(outbox.entityId, id), eq(outbox.opType, 'update'), eq(outbox.status, 'pending')))
        .run();
      tx.insert(outbox).values({ opId: randomUUID(), entityId: id, opType: 'delete', payload: null, createdAt: now }).run();
    });
  },

  getById(id: string): LocalTimeEntry | null {
    const row = db.select().from(timeEntries).where(eq(timeEntries.id, id)).get();
    return (row as LocalTimeEntry | undefined) ?? null;
  },

  /** Todas las entradas no borradas de un día calendario LOCAL (YYYY-MM-DD), más recientes primero. */
  listByLocalDate(localDate: string): LocalTimeEntry[] {
    const { startUtc, endUtc } = localDayToUtcRange(localDate);
    const rows = db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.isDeleted, false), gte(timeEntries.checkIn, startUtc), lt(timeEntries.checkIn, endUtc)))
      .orderBy(desc(timeEntries.checkIn))
      .all();
    return rows as LocalTimeEntry[];
  },

  /** Fechas locales (YYYY-MM-DD) con al menos una entrada no borrada — alimenta el calendario. */
  listWorkedDates(): string[] {
    const rows = db.select({ checkIn: timeEntries.checkIn }).from(timeEntries).where(eq(timeEntries.isDeleted, false)).all();
    const dates = new Set<string>();
    for (const row of rows) {
      dates.add(localDayKey(new Date(row.checkIn)));
    }
    return Array.from(dates).sort();
  },

  /** La entrada abierta (sin checkOut) más reciente, si existe — define si el botón dice "Entrada" o "Salida". */
  getOpenEntry(): LocalTimeEntry | null {
    const row = db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.isDeleted, false), isNull(timeEntries.checkOut)))
      .orderBy(desc(timeEntries.checkIn))
      .limit(1)
      .get();
    return (row as LocalTimeEntry | undefined) ?? null;
  },

  /** Búsqueda filtrada para Reportes: rango de fechas local + texto libre + "solo sin salida". */
  search(filters: ReportFilters): LocalTimeEntry[] {
    const { startUtc } = localDayToUtcRange(filters.fromLocalDate);
    const { endUtc } = localDayToUtcRange(filters.toLocalDate);

    const conditions = [eq(timeEntries.isDeleted, false), gte(timeEntries.checkIn, startUtc), lt(timeEntries.checkIn, endUtc)];
    if (filters.keyword?.trim()) {
      conditions.push(like(timeEntries.note, `%${filters.keyword.trim()}%`));
    }
    if (filters.missingCheckoutOnly) {
      conditions.push(isNull(timeEntries.checkOut));
    }

    const rows = db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.checkIn))
      .all();
    return rows as LocalTimeEntry[];
  },

  /** Tras un push exitoso: marca "synced" solo si no se editó de nuevo mientras el push estaba en vuelo. */
  markSyncedIfNoPending(entityId: string): void {
    db.transaction((tx) => {
      const pending = tx.select({ opId: outbox.opId }).from(outbox).where(eq(outbox.entityId, entityId)).get();
      if (pending) return;
      tx.update(timeEntries).set({ syncStatus: 'synced' }).where(eq(timeEntries.id, entityId)).run();
    });
  },

  /**
   * Aplica TODOS los registros de una respuesta de /sync/pull en UNA sola
   * transacción — no una por fila. Con años de uso, el primer pull tras
   * instalar la app (o reinstalarla) puede traer miles de filas; abrir una
   * transacción SQLite por fila multiplica el costo de escritura en disco
   * por miles. Si hay una operación local pendiente para una entidad, se
   * descarta esa fila remota (el local, único escritor, gana) — defensivo
   * aunque en un solo dispositivo no debería pasar seguido.
   */
  applyRemoteBatch(records: readonly TimeEntryRecord[]): void {
    if (records.length === 0) return;

    db.transaction((tx) => {
      for (const record of records) {
        const pendingLocal = tx.select({ opId: outbox.opId }).from(outbox).where(eq(outbox.entityId, record.id)).get();
        if (pendingLocal) continue;

        if (record.isDeleted) {
          tx.delete(timeEntries).where(eq(timeEntries.id, record.id)).run();
          continue;
        }

        tx.insert(timeEntries)
          .values({
            id: record.id,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            note: record.note,
            isDeleted: false,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            syncStatus: 'synced',
          })
          .onConflictDoUpdate({
            target: timeEntries.id,
            set: {
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              note: record.note,
              updatedAt: record.updatedAt,
              syncStatus: 'synced',
            },
          })
          .run();
      }
    });
  },
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function enqueue(tx: Tx, opType: 'create' | 'update', entityId: string, row: LocalTimeEntry, clientUpdatedAt: string): void {
  const payload = timeEntryInputSchema.parse({
    id: row.id,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    note: row.note,
    clientUpdatedAt,
  });

  tx.insert(outbox)
    .values({ opId: randomUUID(), entityId, opType, payload: JSON.stringify(payload), createdAt: clientUpdatedAt })
    .run();
}

function localDayToUtcRange(localDate: string): { startUtc: string; endUtc: string } {
  const [y, m, d] = localDate.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}
