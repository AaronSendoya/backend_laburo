import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Todos los timestamps se guardan como texto ISO-8601 UTC (SQLite no tiene
 * tipo timestamp nativo). La conversión a hora local ocurre solo en la UI —
 * ver computeReportSummary en @app-laburo/shared, que agrupa por día LOCAL.
 *
 * Índices pensados para años de uso diario (miles de filas): el patrón de
 * acceso dominante siempre filtra por is_deleted=false y ordena/rangea por
 * check_in (calendario, reportes, racha, entrada abierta) — un índice
 * compuesto cubre ese filtro sin escanear la tabla entera.
 */
export const timeEntries = sqliteTable(
  'time_entries',
  {
    id: text('id').primaryKey(), // uuid generado en el cliente
    checkIn: text('check_in').notNull(),
    checkOut: text('check_out'),
    note: text('note'),
    isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    syncStatus: text('sync_status', { enum: ['synced', 'pending', 'error'] })
      .notNull()
      .default('pending'),
  },
  (table) => [index('time_entries_deleted_checkin_idx').on(table.isDeleted, table.checkIn)],
);

/**
 * Outbox: cada escritura en time_entries agrega una fila acá, EN LA MISMA
 * transacción (ver timeEntries.repository.ts). El SyncEngine drena esto en
 * orden hacia /sync/push.
 */
export const outbox = sqliteTable(
  'outbox',
  {
    opId: text('op_id').primaryKey(),
    entityId: text('entity_id').notNull(),
    opType: text('op_type', { enum: ['create', 'update', 'delete'] }).notNull(),
    payload: text('payload'), // snapshot JSON del TimeEntryInput; null para 'delete'
    createdAt: text('created_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    status: text('status', { enum: ['pending', 'in_flight', 'failed'] })
      .notNull()
      .default('pending'),
  },
  (table) => [index('outbox_status_created_idx').on(table.status, table.createdAt), index('outbox_entity_idx').on(table.entityId)],
);

/** Metadata de sync de una sola fila por clave, ej. key='lastPulledAt'. */
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
