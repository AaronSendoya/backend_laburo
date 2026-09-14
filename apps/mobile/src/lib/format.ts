import { differenceInMinutes, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

export function formatDuration(checkInIso: string, checkOutIso: string | null): string {
  const end = checkOutIso ? parseISO(checkOutIso) : new Date();
  const minutes = Math.max(0, differenceInMinutes(end, parseISO(checkInIso)));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** dateKey = 'YYYY-MM-DD' (calendario local, ver @app-laburo/shared#localDayKey). */
export function formatLocalDateLabel(dateKey: string, pattern = "d 'de' MMMM"): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return format(new Date(y, m - 1, d), pattern, { locale: es });
}

export function formatDayLabel(dateKey: string): string {
  return formatLocalDateLabel(dateKey, 'd MMM');
}

/** mondayKey = fecha local (YYYY-MM-DD) del lunes de esa semana, ver computeReportSummary. */
export function formatWeekLabel(mondayKey: string): string {
  return `Sem. ${formatLocalDateLabel(mondayKey, 'd MMM')}`;
}

/** monthKey = 'YYYY-MM'. */
export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMM yyyy', { locale: es });
}

/** yearKey = 'YYYY'. */
export function formatYearLabel(yearKey: string): string {
  return yearKey;
}
