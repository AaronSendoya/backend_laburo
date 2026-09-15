import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { localDayKey } from '@app-laburo/shared';
import type { LocalTimeEntry } from '@/db/repositories/timeEntries.repository';
import { formatTime } from '@/lib/format';

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function durationHoursDecimal(checkIn: string, checkOut: string | null): string {
  const end = checkOut ? new Date(checkOut).getTime() : Date.now();
  const hours = (end - new Date(checkIn).getTime()) / 3_600_000;
  return hours.toFixed(2);
}

function buildCsv(entries: LocalTimeEntry[]): string {
  const header = ['Fecha', 'Entrada', 'Salida', 'Duracion (h)', 'Descripcion'];
  const rows = entries.map((entry) =>
    [
      localDayKey(new Date(entry.checkIn)),
      formatTime(entry.checkIn),
      entry.checkOut ? formatTime(entry.checkOut) : '',
      durationHoursDecimal(entry.checkIn, entry.checkOut),
      entry.note ?? '',
    ]
      .map(escapeCsvField)
      .join(','),
  );
  // BOM al inicio para que Excel detecte UTF-8 y no rompa acentos/ñ.
  return `﻿${[header.join(','), ...rows].join('\n')}`;
}

/** Genera el CSV 100% on-device y abre la hoja de compartir nativa — mismo camino offline que el PDF. */
export async function buildAndShareReportCsv(entries: LocalTimeEntry[]): Promise<void> {
  const csv = buildCsv(entries);
  const file = new File(Paths.cache, `laburo-reporte-${Date.now()}.csv`);
  file.create({ overwrite: true });
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
  }
}
