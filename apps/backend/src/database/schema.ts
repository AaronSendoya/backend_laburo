import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Una cuenta = un dueño de datos. El registro requiere un código de
 * invitación (ver AuthService) — no es multi-tenant público, solo evita que
 * el modelo de "clave compartida" de antes se vuelva "clave por usuario".
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  // Se incrementa al cambiar la contraseña — un JWT firmado con una versión
  // vieja deja de servir aunque no haya vencido (ver JwtAuthGuard). Es lo que
  // hace que "cambiar contraseña" también funcione como "cerrar todas las sesiones".
  tokenVersion: integer('token_version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow(),
});

/**
 * Timestamps son siempre timestamptz. Los eventos de entrada/salida son puntos
 * en el tiempo reales (no "hora de pared"), así que timezone-naive sería incorrecto.
 */
export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey(), // generado en el cliente (móvil), nunca por el servidor
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    checkIn: timestamp('check_in', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    checkOut: timestamp('check_out', { withTimezone: true, precision: 3 }),
    note: varchar('note', { length: 500 }),
    isDeleted: boolean('is_deleted').notNull().default(false), // tombstone, nunca hard-delete
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    clientUpdatedAt: timestamp('client_updated_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    version: integer('version').notNull().default(1),
  },
  // Reemplaza al índice viejo (solo updatedAt): ahora TODA lectura filtra
  // primero por dueño — este es el patrón de acceso real de /sync/pull.
  (table) => [
    index('time_entries_user_updated_idx').on(table.userId, table.updatedAt),
  ],
);

/**
 * Registro de idempotencia: cada operación del outbox del cliente trae un opId
 * generado una sola vez. Si se reintenta un push, el servidor ve que ya se
 * aplicó y no vuelve a tocar los datos. userId acá es solo para aislar/auditar
 * por cuenta — opId ya es único globalmente (uuid), así que no hace falta en
 * la restricción de unicidad.
 */
export const syncOperationLog = pgTable(
  'sync_operation_log',
  {
    opId: uuid('op_id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id').notNull(),
    opType: varchar('op_type', { length: 10 }).notNull(), // 'create' | 'update' | 'delete'
    appliedAt: timestamp('applied_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('sync_operation_log_user_idx').on(table.userId)],
);
