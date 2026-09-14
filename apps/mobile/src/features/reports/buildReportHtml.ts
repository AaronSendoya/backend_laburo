import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { localDayKey, type ReportSummary } from '@app-laburo/shared';
import type { LocalTimeEntry } from '@/db/repositories/timeEntries.repository';
import { formatDuration, formatHours, formatLocalDateLabel, formatTime } from '@/lib/format';

interface BuildReportPdfInput {
  entries: LocalTimeEntry[];
  summary: ReportSummary;
  from: string;
  to: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildReportHtml({ entries, summary, from, to }: BuildReportPdfInput): string {
  const rows = entries
    .map(
      (entry) => `
      <tr>
        <td>${formatLocalDateLabel(localDayKey(new Date(entry.checkIn)), 'dd/MM/yyyy')}</td>
        <td>${formatTime(entry.checkIn)}</td>
        <td>${entry.checkOut ? formatTime(entry.checkOut) : '—'}</td>
        <td>${formatDuration(entry.checkIn, entry.checkOut)}</td>
        <td>${escapeHtml(entry.note ?? '')}</td>
      </tr>`,
    )
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
          .stats { display: flex; gap: 16px; margin-bottom: 24px; }
          .stat { border: 1px solid #ddd; border-radius: 12px; padding: 12px 16px; flex: 1; }
          .stat .value { font-size: 20px; font-weight: 700; }
          .stat .label { font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
          th { color: #666; font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>Reporte de horas — Pista8</h1>
        <div class="subtitle">${formatLocalDateLabel(from, 'dd/MM/yyyy')} – ${formatLocalDateLabel(to, 'dd/MM/yyyy')}</div>
        <div class="stats">
          <div class="stat"><div class="value">${formatHours(summary.totalHours)}</div><div class="label">TOTAL</div></div>
          <div class="stat"><div class="value">${summary.daysWorked}</div><div class="label">DÍAS TRABAJADOS</div></div>
          <div class="stat"><div class="value">${formatHours(summary.averageHoursPerDay)}</div><div class="label">PROMEDIO/DÍA</div></div>
        </div>
        <table>
          <thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Duración</th><th>Descripción</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
}

/** Genera el PDF 100% on-device (WKWebView, sin red) y abre la hoja de compartir nativa. */
export async function buildAndShareReportPdf(input: BuildReportPdfInput): Promise<void> {
  const html = buildReportHtml(input);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
  }
}
