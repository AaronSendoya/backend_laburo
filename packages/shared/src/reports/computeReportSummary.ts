/**
 * Subconjunto mínimo de un TimeEntry necesario para calcular un reporte.
 * Deliberadamente no es TimeEntryRecord completo: tanto el repositorio local
 * (SQLite) como cualquier otro origen de datos pueden satisfacer esta forma
 * sin acoplarse al schema exacto de sync.
 */
export interface ReportableEntry {
  checkIn: string; // ISO-8601 UTC
  checkOut: string | null; // ISO-8601 UTC, null = todavía trabajando
  note: string | null;
}

export type ReportGroupBy = 'day' | 'week' | 'month' | 'year';

export interface ReportGroupPoint {
  /** Clave ordenable y agrupable: YYYY-MM-DD (day), YYYY-MM-DD del lunes (week), YYYY-MM (month) o YYYY (year). Formatear para mostrar es responsabilidad de la UI. */
  key: string;
  hours: number;
}

export interface ReportSummary {
  totalHours: number;
  averageHoursPerDay: number;
  daysWorked: number;
  entryCount: number;
  series: ReportGroupPoint[];
}

export interface ComputeReportSummaryOptions {
  groupBy: ReportGroupBy;
  /** Hora "actual" para calcular las horas de una entrada todavía abierta. Inyectable para tests determinísticos. */
  now?: Date;
}

/**
 * Función pura: agrupa y suma horas usando el calendario LOCAL del dispositivo
 * (no UTC) — un check-in a las 23:30 hora local debe contar para ese día
 * local, no para el día UTC siguiente. El filtrado (rango de fechas, texto,
 * "sin salida") ocurre antes, a nivel de la consulta SQL del repositorio;
 * esta función solo resume lo que ya le llega filtrado.
 */
export function computeReportSummary(entries: ReportableEntry[], options: ComputeReportSummaryOptions): ReportSummary {
  const now = options.now ?? new Date();
  const groups = new Map<string, number>();
  const daysWorked = new Set<string>();
  let totalHours = 0;

  for (const entry of entries) {
    const hours = entryHours(entry, now);
    totalHours += hours;

    const checkInDate = new Date(entry.checkIn);
    daysWorked.add(localDayKey(checkInDate));

    const groupKey = groupKeyFor(checkInDate, options.groupBy);
    groups.set(groupKey, (groups.get(groupKey) ?? 0) + hours);
  }

  const series = Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, hours]) => ({ key, hours: roundHours(hours) }));

  return {
    totalHours: roundHours(totalHours),
    averageHoursPerDay: daysWorked.size > 0 ? roundHours(totalHours / daysWorked.size) : 0,
    daysWorked: daysWorked.size,
    entryCount: entries.length,
    series,
  };
}

/**
 * Una entrada sin checkOut cuenta tiempo transcurrido hasta `now` SOLO si el
 * check-in fue hoy (mismo día local). Una entrada abierta de días atrás es
 * una entrada olvidada, no una sesión real de varios días — contarla contra
 * `now` inflaría los totales sin límite cada día que sigue sin cerrarse.
 * Esas entradas "viejas y abiertas" se detectan aparte (ver isStaleOpenEntry
 * en la app) para avisarle al usuario que las cierre, en vez de sumarlas acá.
 */
function entryHours(entry: ReportableEntry, now: Date): number {
  const start = new Date(entry.checkIn).getTime();

  if (!entry.checkOut) {
    const isSameLocalDay = localDayKey(new Date(entry.checkIn)) === localDayKey(now);
    if (!isSameLocalDay) return 0;
    return Math.max(0, (now.getTime() - start) / 3_600_000);
  }

  const end = new Date(entry.checkOut).getTime();
  return Math.max(0, (end - start) / 3_600_000);
}

function groupKeyFor(date: Date, groupBy: ReportGroupBy): string {
  if (groupBy === 'day') return localDayKey(date);
  if (groupBy === 'week') return localWeekKey(date);
  if (groupBy === 'month') return localMonthKey(date);
  return localYearKey(date);
}

/** YYYY-MM-DD en el calendario LOCAL (no UTC) — clave compartida entre el resumen de reportes y el calendario de días trabajados. */
export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Clave de semana = fecha local del lunes de esa semana. */
function localWeekKey(d: Date): string {
  const dayOfWeek = (d.getDay() + 6) % 7; // lunes=0 ... domingo=6
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek);
  return localDayKey(monday);
}

function localMonthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** YYYY — usado para agrupar rangos muy largos (ej. "Total"), donde agrupar por mes o día daría un gráfico de cientos de barras. */
function localYearKey(d: Date): string {
  return String(d.getFullYear());
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** true si una entrada quedó abierta (sin salida) en un día anterior a hoy — probablemente un olvido del usuario. */
export function isStaleOpenEntry(entry: Pick<ReportableEntry, 'checkIn' | 'checkOut'>, now: Date = new Date()): boolean {
  if (entry.checkOut) return false;
  return localDayKey(new Date(entry.checkIn)) !== localDayKey(now);
}

/**
 * Días consecutivos trabajados terminando hoy. Si hoy todavía no se trabajó,
 * la racha se sigue contando hasta ayer (no se "rompe" recién a la mañana
 * siguiente) — mismo criterio que usan apps de hábitos: se pierde a la
 * medianoche sin actividad, no apenas abrís la app antes de trabajar.
 */
export function computeStreak(workedDates: readonly string[], now: Date = new Date()): number {
  const worked = new Set(workedDates);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!worked.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (worked.has(localDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}
