import { z } from 'zod';

/**
 * Todos los timestamps viajan como ISO-8601 UTC (sufijo "Z").
 * La conversión a hora local ocurre únicamente en la capa de presentación,
 * para que agrupar por "día trabajado" no dependa de en qué huso se escribió el dato.
 */
const isoUtcDateTime = z.string().datetime();

const timeEntryInputShape = z.object({
  id: z.string().uuid(),
  checkIn: isoUtcDateTime,
  checkOut: isoUtcDateTime.nullable(),
  note: z.string().max(500).nullable(),
  clientUpdatedAt: isoUtcDateTime,
});

function checkOutAfterCheckIn(entry: { checkIn: string; checkOut: string | null }): boolean {
  if (!entry.checkOut) return true;
  return new Date(entry.checkOut).getTime() > new Date(entry.checkIn).getTime();
}

const CHECK_OUT_RULE = {
  message: 'checkOut must be strictly after checkIn',
  path: ['checkOut'],
};

/** Forma que el cliente envía al crear/actualizar (vía outbox -> /sync/push). */
export const timeEntryInputSchema = timeEntryInputShape.refine(checkOutAfterCheckIn, CHECK_OUT_RULE);
export type TimeEntryInput = z.infer<typeof timeEntryInputSchema>;

const timeEntryRecordShape = timeEntryInputShape.extend({
  isDeleted: z.boolean(),
  createdAt: isoUtcDateTime,
  updatedAt: isoUtcDateTime,
  version: z.number().int().positive(),
});

/** Forma completa del registro tal como vive en Postgres y se devuelve en /sync/pull. */
export const timeEntryRecordSchema = timeEntryRecordShape.refine(checkOutAfterCheckIn, CHECK_OUT_RULE);
export type TimeEntryRecord = z.infer<typeof timeEntryRecordSchema>;
