import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SyncService } from './sync.service';
import { SyncPushRequestDto, SyncPullQueryDto } from './dto/sync.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  push(@CurrentUser() userId: string, @Body() body: SyncPushRequestDto) {
    return this.sync.push(userId, body.operations);
  }

  @Get('pull')
  pull(@CurrentUser() userId: string, @Query() query: SyncPullQueryDto) {
    const since = query.since ? new Date(query.since) : null;
    return this.sync.pull(userId, since);
  }
}
