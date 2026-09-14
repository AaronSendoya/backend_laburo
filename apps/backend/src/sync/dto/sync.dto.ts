import { createZodDto } from 'nestjs-zod';
import { syncPushRequestSchema, syncPullQuerySchema } from '@app-laburo/shared';

export class SyncPushRequestDto extends createZodDto(syncPushRequestSchema) {}
export class SyncPullQueryDto extends createZodDto(syncPullQuerySchema) {}
