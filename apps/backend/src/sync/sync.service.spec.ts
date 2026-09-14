import type { TimeEntryRecord } from '@app-laburo/shared';
import { SyncService } from './sync.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';

function makeEntry(overrides: Partial<TimeEntryRecord>): TimeEntryRecord {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    checkIn: '2026-09-07T12:00:00.000Z',
    checkOut: null,
    note: null,
    isDeleted: false,
    createdAt: '2026-09-07T12:00:00.000Z',
    updatedAt: '2026-09-07T12:00:00.000Z',
    clientUpdatedAt: '2026-09-07T12:00:00.000Z',
    version: 1,
    ...overrides,
  };
}

const USER_ID = '11111111-1111-1111-1111-111111111111';

describe('SyncService#pull', () => {
  // El cursor debe ser el updatedAt máximo REALMENTE devuelto, no la hora del
  // servidor — así nunca se saltea una fila cuyo commit se solapó con el pull.
  it('uses the last entry updatedAt as the cursor when entries are returned', async () => {
    const entries = [
      makeEntry({ updatedAt: '2026-09-07T12:00:00.000Z' }),
      makeEntry({ id: '2', updatedAt: '2026-09-07T12:05:00.000Z' }),
    ];
    const timeEntries = {
      listSince: jest.fn().mockResolvedValue(entries),
    } as unknown as TimeEntriesService;
    const service = new SyncService({} as never, timeEntries);

    const result = await service.pull(USER_ID, null);

    expect(result.entries).toEqual(entries);
    expect(result.cursor).toBe('2026-09-07T12:05:00.000Z');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn(), no un método real con `this`
    expect(timeEntries.listSince).toHaveBeenCalledWith(USER_ID, null);
  });

  it('falls back to the requested `since` when nothing changed, instead of advancing to "now"', async () => {
    const since = new Date('2026-09-07T12:00:00.000Z');
    const timeEntries = {
      listSince: jest.fn().mockResolvedValue([]),
    } as unknown as TimeEntriesService;
    const service = new SyncService({} as never, timeEntries);

    const result = await service.pull(USER_ID, since);

    expect(result.entries).toEqual([]);
    expect(result.cursor).toBe(since.toISOString());
  });

  it('falls back to the epoch when there is no `since` and nothing exists yet', async () => {
    const timeEntries = {
      listSince: jest.fn().mockResolvedValue([]),
    } as unknown as TimeEntriesService;
    const service = new SyncService({} as never, timeEntries);

    const result = await service.pull(USER_ID, null);

    expect(result.cursor).toBe(new Date(0).toISOString());
  });
});
