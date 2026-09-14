import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { TimeEntryInput, TimeEntryRecord } from '@app-laburo/shared';
import { DRIZZLE } from '../database/database.constants';
import * as schema from '../database/schema';

type Db = PostgresJsDatabase<typeof schema>;
type TimeEntryRow = typeof schema.timeEntries.$inferSelect;

/**
 * Dueño único de la persistencia de TimeEntry. Tanto el controller REST de
 * debug como SyncModule llaman a estos mismos métodos — un solo camino de
 * código para online y offline, sin lógica duplicada.
 *
 * Todo método recibe `userId` (del JWT, vía @CurrentUser() en el controller
 * — nunca del body/query) y lo aplica en el WHERE de cada query: es la única
 * defensa real de que una cuenta no pueda leer/tocar filas de otra.
 *
 * Los métodos de escritura aceptan un `executor` opcional (la conexión normal
 * o una transacción `tx`) para que SyncModule pueda envolver "aplicar la
 * operación" + "loguear el opId" en una única transacción atómica.
 */
@Injectable()
export class TimeEntriesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** create y update del cliente son el mismo upsert: la fila entera viaja siempre. */
  async upsert(
    userId: string,
    input: TimeEntryInput,
    executor: Db = this.db,
  ): Promise<TimeEntryRecord> {
    const checkIn = new Date(input.checkIn);
    const checkOut = input.checkOut ? new Date(input.checkOut) : null;
    const clientUpdatedAt = new Date(input.clientUpdatedAt);

    const [row] = await executor
      .insert(schema.timeEntries)
      .values({
        id: input.id,
        userId,
        checkIn,
        checkOut,
        note: input.note,
        clientUpdatedAt,
      })
      .onConflictDoUpdate({
        target: schema.timeEntries.id,
        set: {
          checkIn,
          checkOut,
          note: input.note,
          clientUpdatedAt,
          isDeleted: false,
          updatedAt: new Date(),
          version: sql`${schema.timeEntries.version} + 1`,
        },
        // Un id de otra cuenta nunca se pisa: si el user_id no matchea, esta
        // condición hace que Postgres no actualice esa fila (ON CONFLICT ...
        // DO UPDATE ... WHERE que no matchea = no-op, no un error) — así que
        // abajo chequeamos explícitamente que sí haya vuelto una fila.
        setWhere: eq(schema.timeEntries.userId, userId),
      })
      .returning();

    if (!row) {
      // uuid client-generado que ya existe pero es de otra cuenta —
      // prácticamente imposible por azar, pero no hay que exponer ni pisar
      // la fila ajena si pasa.
      throw new ConflictException(
        `TimeEntry ${input.id} belongs to a different account`,
      );
    }

    return toRecord(row);
  }

  async softDelete(
    userId: string,
    id: string,
    executor: Db = this.db,
  ): Promise<TimeEntryRecord | null> {
    const [row] = await executor
      .update(schema.timeEntries)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.timeEntries.id, id),
          eq(schema.timeEntries.userId, userId),
        ),
      )
      .returning();

    return row ? toRecord(row) : null;
  }

  async findById(userId: string, id: string): Promise<TimeEntryRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.timeEntries)
      .where(
        and(
          eq(schema.timeEntries.id, id),
          eq(schema.timeEntries.userId, userId),
        ),
      );
    return row ? toRecord(row) : null;
  }

  /** Todo lo modificado después de `since` (incluye soft-deletes) — usado por /sync/pull. */
  async listSince(
    userId: string,
    since: Date | null,
  ): Promise<TimeEntryRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.timeEntries)
      .where(
        and(
          eq(schema.timeEntries.userId, userId),
          since ? gt(schema.timeEntries.updatedAt, since) : undefined,
        ),
      )
      .orderBy(asc(schema.timeEntries.updatedAt));
    return rows.map(toRecord);
  }

  /** Listado convencional para el debug REST (sin borrados). */
  async listAll(userId: string): Promise<TimeEntryRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.timeEntries)
      .where(
        and(
          eq(schema.timeEntries.userId, userId),
          eq(schema.timeEntries.isDeleted, false),
        ),
      )
      .orderBy(asc(schema.timeEntries.checkIn));
    return rows.map(toRecord);
  }
}

function toRecord(row: TimeEntryRow): TimeEntryRecord {
  return {
    id: row.id,
    checkIn: row.checkIn.toISOString(),
    checkOut: row.checkOut ? row.checkOut.toISOString() : null,
    note: row.note,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    clientUpdatedAt: row.clientUpdatedAt.toISOString(),
    version: row.version,
  };
}
