import { Module } from '@nestjs/common';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [TimeEntriesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
