import { Inject, Injectable } from '@nestjs/common';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
  SyncOperation,
  SyncPushResponse,
  SyncPullResponse,
} from '@app-laburo/shared';
import { DRIZZLE } from '../database/database.constants';
import * as schema from '../database/schema';
import { TimeEntriesService } from '../time-entries/time-entries.service';

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Dueño de la idempotencia y el orden del sync. La persistencia real de cada
 * operación se delega a TimeEntriesService — este servicio solo orquesta:
 * "¿ya se aplicó este opId para ESTA cuenta? si no, aplicalo y registralo,
 * todo en una transacción". `userId` viene del JWT (JwtAuthGuard), nunca del
 * cliente — es lo que aísla los datos entre cuentas.
 */
@Injectable()
export class SyncService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly timeEntries: TimeEntriesService,
  ) {}

  /** Se procesa en orden estrictamente secuencial: create->update->delete de la misma entidad debe aplicarse en ese orden. */
  async push(
    userId: string,
    operations: SyncOperation[],
  ): Promise<SyncPushResponse> {
    const results: SyncPushResponse['results'] = [];
    for (const op of operations) {
      results.push(await this.applyOne(userId, op));
    }
    return { results };
  }

  private async applyOne(
    userId: string,
    op: SyncOperation,
  ): Promise<SyncPushResponse['results'][number]> {
    return this.db.transaction(async (tx) => {
      // INSERT ... ON CONFLICT DO NOTHING + RETURNING: en una sola vuelta nos dice
      // si este opId ya se había aplicado antes (retry) sin una race entre check y write.
      const [logRow] = await tx
        .insert(schema.syncOperationLog)
        .values({
          opId: op.opId,
          userId,
          entityId: op.entityId,
          opType: op.opType,
        })
        .onConflictDoNothing({ target: schema.syncOperationLog.opId })
        .returning({ opId: schema.syncOperationLog.opId });

      if (!logRow) {
        return { opId: op.opId, status: 'already_applied' as const };
      }

      if (op.opType === 'delete') {
        await this.timeEntries.softDelete(userId, op.entityId, tx);
      } else {
        // El schema zod compartido garantiza que payload no sea null para create/update.
        await this.timeEntries.upsert(userId, op.payload!, tx);
      }

      return { opId: op.opId, status: 'applied' as const };
    });
  }

  /** El cursor devuelto es el `updatedAt` máximo realmente visto, no la hora del servidor — evita huecos por desfase de reloj. */
  async pull(userId: string, since: Date | null): Promise<SyncPullResponse> {
    const entries = await this.timeEntries.listSince(userId, since);
    const cursor =
      entries.length > 0
        ? entries[entries.length - 1].updatedAt
        : (since?.toISOString() ?? new Date(0).toISOString());
    return { entries, cursor };
  }
}
