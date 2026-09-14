import { z } from 'zod';
import { timeEntryInputSchema, timeEntryRecordSchema } from './timeEntry.schema';

export const syncOpTypeSchema = z.enum(['create', 'update', 'delete']);
export type SyncOpType = z.infer<typeof syncOpTypeSchema>;

/**
 * Una operación tal como vive en el outbox local y se envía a /sync/push.
 * `opId` es la clave de idempotencia: generada una sola vez en el cliente,
 * nunca regenerada en un reintento.
 */
export const syncOperationSchema = z
  .object({
    opId: z.string().uuid(),
    entityId: z.string().uuid(),
    opType: syncOpTypeSchema,
    payload: timeEntryInputSchema.nullable(),
  })
  .refine((op) => op.opType === 'delete' || (op.payload !== null && op.payload.id === op.entityId), {
    message: 'payload is required for create/update and its id must match entityId',
    path: ['payload'],
  });
export type SyncOperation = z.infer<typeof syncOperationSchema>;

export const syncPushRequestSchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(100),
});
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;

export const syncPushResultSchema = z.object({
  opId: z.string().uuid(),
  status: z.enum(['applied', 'already_applied', 'rejected']),
  message: z.string().optional(),
});
export type SyncPushResult = z.infer<typeof syncPushResultSchema>;

export const syncPushResponseSchema = z.object({
  results: z.array(syncPushResultSchema),
});
export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;

export const syncPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});
export type SyncPullQuery = z.infer<typeof syncPullQuerySchema>;

export const syncPullResponseSchema = z.object({
  entries: z.array(timeEntryRecordSchema),
  cursor: z.string().datetime(),
});
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;
