import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntryInputDto } from './dto/time-entry.dto';

/**
 * CRUD REST convencional — pensado para debug (curl/Postman) y extensibilidad
 * futura. El móvil nunca llama estos endpoints directamente: siempre pasa por
 * /sync/push y /sync/pull, incluso online (ver SyncModule).
 */
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntries: TimeEntriesService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.timeEntries.listAll(userId);
  }

  @Get(':id')
  async findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    const entry = await this.timeEntries.findById(userId, id);
    if (!entry) {
      throw new NotFoundException(`TimeEntry ${id} not found`);
    }
    return entry;
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() body: TimeEntryInputDto) {
    return this.timeEntries.upsert(userId, body);
  }

  @Put(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: TimeEntryInputDto,
  ) {
    return this.timeEntries.upsert(userId, { ...body, id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() userId: string, @Param('id') id: string) {
    await this.timeEntries.softDelete(userId, id);
  }
}
