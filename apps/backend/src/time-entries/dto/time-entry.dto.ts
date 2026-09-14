import { createZodDto } from 'nestjs-zod';
import {
  timeEntryInputSchema,
  timeEntryRecordSchema,
} from '@app-laburo/shared';

export class TimeEntryInputDto extends createZodDto(timeEntryInputSchema) {}
export class TimeEntryRecordDto extends createZodDto(timeEntryRecordSchema) {}
