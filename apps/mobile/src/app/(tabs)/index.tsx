import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { format, startOfMonth, startOfYear, subDays, subYears } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { computeReportSummary, computeStreak, isStaleOpenEntry, localDayKey, type ReportGroupBy } from '@app-laburo/shared';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { FAB } from '@/components/glass/FAB';
import { SyncStatusPill } from '@/components/glass/SyncStatusPill';
import { HoursBarChart } from '@/components/charts/HoursBarChart';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { FormField } from '@/components/FormField';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { useCreateTimeEntry, useOpenEntry, useReportSearch, useUpdateTimeEntry, useWorkedDates } from '@/hooks/useTimeEntries';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useHoursGoal, useStreakEnabled } from '@/hooks/useAppSettings';
import { useTheme } from '@/hooks/use-theme';
import { Radii, Spacing } from '@/constants/theme';
import { formatDayLabel, formatDuration, formatHours, formatLocalDateLabel, formatMonthLabel, formatTime, formatYearLabel } from '@/lib/format';
import { buildAndShareReportPdf } from '@/features/reports/buildReportHtml';
import { buildAndShareReportCsv } from '@/features/reports/buildReportCsv';

type RangeFilter = 'total' | 'today' | 'week' | 'month' | 'year';

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: 'total', label: 'Total' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: '7 días' },
  { value: 'month', label: '30 días' },
  { value: 'year', label: 'Año' },
];

// Sentinel bien anterior a cualquier registro real — "Total" es simplemente
// "desde siempre hasta hoy", sin necesitar una fecha mínima real de la cuenta.
const ALL_TIME_START = '1970-01-01';

function localKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function rangeFor(filter: RangeFilter, today: Date): { from: string; to: string; groupBy: ReportGroupBy } {
  const to = localKey(today);
  switch (filter) {
    case 'total':
      // Agrupado por AÑO, no por mes/día — así el gráfico escala con años de
      // uso (una barra por año) en vez de crecer sin límite con el total de
      // horas acumuladas. 2000 horas trabajadas en 1 año son 1 barra, en 5
      // años son 5 barras — nunca cientos de barras casi ilegibles.
      return { from: ALL_TIME_START, to, groupBy: 'year' };
    case 'today':
      return { from: to, to, groupBy: 'day' };
    case 'week':
      return { from: localKey(subDays(today, 6)), to, groupBy: 'day' };
    case 'month':
      return { from: localKey(subDays(today, 29)), to, groupBy: 'day' };
    case 'year':
      return { from: localKey(startOfYear(today)), to, groupBy: 'month' };
  }
}

/** El período equivalente inmediatamente anterior, para el "+2h30 vs. anterior" al lado del total. "Total" no tiene un "anterior" que comparar. */
function previousRangeFor(filter: RangeFilter, today: Date): { from: string; to: string } | null {
  switch (filter) {
    case 'total':
      return null;
    case 'today':
      return { from: localKey(subDays(today, 1)), to: localKey(subDays(today, 1)) };
    case 'week':
      return { from: localKey(subDays(today, 13)), to: localKey(subDays(today, 7)) };
    case 'month':
      return { from: localKey(subDays(today, 59)), to: localKey(subDays(today, 30)) };
    case 'year':
      // "mismo período del año pasado" (1 ene - misma fecha), no el año calendario completo —
      // así se compara manzanas con manzanas cuando el año actual todavía no terminó.
      return { from: localKey(subYears(startOfYear(today), 1)), to: localKey(subYears(today, 1)) };
  }
}

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: companyName } = useCompanyName();
  const { data: openEntry } = useOpenEntry();
  const create = useCreateTimeEntry();
  const update = useUpdateTimeEntry();
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('week');

  const today = new Date();
  const todayKey = localKey(today);

  const { data: todayEntries = [] } = useReportSearch({ fromLocalDate: todayKey, toLocalDate: todayKey });
  const todaySummary = useMemo(() => computeReportSummary(todayEntries, { groupBy: 'day' }), [todayEntries]);

  const { from, to, groupBy } = useMemo(() => rangeFor(rangeFilter, today), [rangeFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: rangeEntries = [] } = useReportSearch({ fromLocalDate: from, toLocalDate: to });
  const rangeSummary = useMemo(() => computeReportSummary(rangeEntries, { groupBy }), [rangeEntries, groupBy]);
  const labelFormatter = groupBy === 'year' ? formatYearLabel : groupBy === 'month' ? formatMonthLabel : formatDayLabel;

  // Comparación "vs. período anterior" — misma duración, corrida hacia atrás. "Total" no tiene anterior (previousRange = null).
  const previousRange = useMemo(() => previousRangeFor(rangeFilter, today), [rangeFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: previousRangeEntries = [] } = useReportSearch(
    { fromLocalDate: previousRange?.from ?? todayKey, toLocalDate: previousRange?.to ?? todayKey },
    { enabled: previousRange !== null },
  );
  const comparisonDelta = useMemo(() => {
    if (!previousRange) return null;
    const previousSummary = computeReportSummary(previousRangeEntries, { groupBy: 'day' });
    return rangeSummary.totalHours - previousSummary.totalHours;
  }, [previousRange, previousRangeEntries, rangeSummary.totalHours]);

  // Meta de horas (opcional, se configura en Ajustes) — solo se pide el historial completo si hay una meta puesta.
  const { data: hoursGoal } = useHoursGoal();
  const { data: allTimeEntries = [] } = useReportSearch({ fromLocalDate: ALL_TIME_START, toLocalDate: todayKey }, { enabled: Boolean(hoursGoal) });
  const allTimeTotalHours = useMemo(() => computeReportSummary(allTimeEntries, { groupBy: 'year' }).totalHours, [allTimeEntries]);
  const goalPercent = hoursGoal ? Math.min(100, Math.round((allTimeTotalHours / hoursGoal) * 100)) : 0;
  const goalReached = Boolean(hoursGoal) && allTimeTotalHours >= (hoursGoal ?? 0);
  const goalRemainingHours = hoursGoal ? Math.max(0, hoursGoal - allTimeTotalHours) : 0;

  // Exportar el mes calendario actual sin pasar por Reportes.
  const currentMonthFrom = localKey(startOfMonth(today));
  const { data: currentMonthEntries = [] } = useReportSearch({ fromLocalDate: currentMonthFrom, toLocalDate: todayKey });
  const currentMonthSummary = useMemo(() => computeReportSummary(currentMonthEntries, { groupBy: 'day' }), [currentMonthEntries]);

  const { data: recentEntries = [] } = useReportSearch({ fromLocalDate: localKey(subDays(today, 6)), toLocalDate: todayKey });
  const recent = useMemo(() => [...recentEntries].sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1)).slice(0, 5), [recentEntries]);

  // Buscador rápido — busca en TODO el historial (no solo lo reciente), con debounce para no
  // disparar una consulta por cada letra tipeada (mismo patrón que el buscador de Reportes).
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const isSearching = searchQuery.length > 0;
  const { data: searchResults = [] } = useReportSearch(
    { fromLocalDate: ALL_TIME_START, toLocalDate: todayKey, keyword: searchQuery },
    { enabled: isSearching },
  );
  const searchResultsSorted = useMemo(
    () => [...searchResults].sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1)).slice(0, 20),
    [searchResults],
  );
  const displayedEntries = isSearching ? searchResultsSorted : recent;

  const { data: streakEnabled = false } = useStreakEnabled();
  const { data: workedDates = [] } = useWorkedDates();
  const streak = useMemo(() => computeStreak(workedDates), [workedDates]);

  const staleOpenEntry = openEntry && isStaleOpenEntry(openEntry) ? openEntry : null;
  const liveOpenEntry = openEntry && !staleOpenEntry ? openEntry : null;

  function handleQuickCheckIn() {
    Alert.alert('Confirmar entrada', `¿Marcamos tu entrada ahora, a las ${formatTime(new Date().toISOString())}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Marcar entrada',
        onPress: () => create.mutate({ checkIn: new Date().toISOString(), checkOut: null, note: null }),
      },
    ]);
  }

  function handleQuickCheckOut() {
    if (!liveOpenEntry) return;
    Alert.alert(
      'Confirmar salida',
      `¿Marcamos tu salida ahora? Se va a cerrar la entrada de las ${formatTime(liveOpenEntry.checkIn)}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Marcar salida',
          style: 'destructive',
          onPress: () =>
            update.mutate({
              id: liveOpenEntry.id,
              draft: { checkIn: liveOpenEntry.checkIn, checkOut: new Date().toISOString(), note: liveOpenEntry.note },
            }),
        },
      ],
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.header}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {companyName || 'Sin lugar de trabajo configurado'}
          </ThemedText>
          <View style={styles.headerBadges}>
            {streakEnabled && streak > 0 ? (
              <View style={[styles.streakBadge, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="flame" size={13} color={theme.accent} />
                <ThemedText type="small" style={styles.streakText}>
                  {streak}
                </ThemedText>
              </View>
            ) : null}
            <SyncStatusPill />
          </View>
        </View>

        <View style={styles.hero}>
          <SegmentedControl options={RANGE_OPTIONS} value={rangeFilter} onChange={setRangeFilter} />

          <ThemedText type="title">{formatHours(rangeSummary.totalHours)}</ThemedText>

          <View style={styles.heroMetaRow}>
            {comparisonDelta !== null ? (
              <ThemedText type="smallBold" themeColor={comparisonDelta >= 0 ? 'success' : 'danger'}>
                {comparisonDelta >= 0 ? '+' : '-'}
                {formatHours(Math.abs(comparisonDelta))} vs. anterior
              </ThemedText>
            ) : null}
            {rangeFilter !== 'today' ? (
              <ThemedText type="small" themeColor="textSecondary">
                Hoy: {formatHours(todaySummary.totalHours)}
              </ThemedText>
            ) : null}
          </View>

          {hoursGoal ? (
            <View style={styles.goalBlock}>
              <AnimatedProgressBar percent={goalPercent} trackColor={theme.backgroundElement} fillColor={theme.accent} />
              <ThemedText type="small" themeColor="textSecondary">
                {goalReached
                  ? '¡Meta cumplida! 🎉'
                  : `${goalPercent}% · Te faltan ${formatHours(goalRemainingHours)} para tu meta de ${hoursGoal}h`}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {liveOpenEntry ? (
          <Pressable onPress={handleQuickCheckOut} style={[styles.quickBanner, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="exit-outline" size={18} color={theme.danger} />
            <ThemedText type="small" style={styles.quickBannerText}>
              Entrada abierta desde las {formatTime(liveOpenEntry.checkIn)} — tocá para marcar salida
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>
        ) : !staleOpenEntry ? (
          <Pressable onPress={handleQuickCheckIn} style={[styles.quickBanner, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="enter-outline" size={18} color={theme.tint} />
            <ThemedText type="small" style={styles.quickBannerText}>
              ¿Estás entrando justo ahora? Tocá para marcar
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>
        ) : null}

        {staleOpenEntry ? (
          <GlassCard style={styles.staleCard}>
            <View style={styles.staleHeader}>
              <Ionicons name="alert-circle" size={18} color={theme.warning} />
              <ThemedText type="smallBold" style={styles.staleTitle}>
                Entrada sin cerrar
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Quedó abierta desde el {formatLocalDateLabel(staleOpenEntry.checkIn.slice(0, 10))} a las {formatTime(staleOpenEntry.checkIn)} — parece
              que te olvidaste de marcar la salida. Corregila para que no afecte tus totales.
            </ThemedText>
            <GlassButton variant="primary" onPress={() => router.push({ pathname: '/entry/[id]', params: { id: staleOpenEntry.id } })}>
              Corregir esta entrada
            </GlassButton>
          </GlassCard>
        ) : null}

        <View style={styles.recentSection}>
          <SectionHeader icon="time-outline">{isSearching ? `Resultados (${displayedEntries.length})` : 'Actividad reciente'}</SectionHeader>
          <FormField label="Buscar por descripción" value={searchInput} onChangeText={setSearchInput} placeholder="Ej: reunión, backend..." autoCorrect={false} />
          {displayedEntries.length === 0 ? (
            <EmptyState
              icon={isSearching ? 'search-outline' : 'construct-outline'}
              message={isSearching ? 'No encontramos entradas con esa descripción.' : 'Todavía no cavaste nada por acá. Tocá + para arrancar.'}
            />
          ) : (
            displayedEntries.map((entry) => (
              <Pressable key={entry.id} onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}>
                <GlassCard style={styles.recentCard}>
                  <View style={styles.recentRow}>
                    <View>
                      <ThemedText type="smallBold">
                        {isSearching ? `${formatDayLabel(localDayKey(new Date(entry.checkIn)))} · ` : ''}
                        {formatTime(entry.checkIn)} — {entry.checkOut ? formatTime(entry.checkOut) : 'en curso'}
                      </ThemedText>
                      {entry.note ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {entry.note}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText themeColor="tintText" type="smallBold">
                      {formatDuration(entry.checkIn, entry.checkOut)}
                    </ThemedText>
                  </View>
                </GlassCard>
              </Pressable>
            ))
          )}
        </View>

        <GlassCard style={styles.chartCard}>
          <SectionHeader icon="stats-chart-outline">Distribución</SectionHeader>

          {rangeSummary.series.length > 0 ? (
            <HoursBarChart series={rangeSummary.series} formatLabel={labelFormatter} height={200} />
          ) : (
            <View style={styles.emptyChart}>
              <EmptyState icon="bar-chart-outline" message="No hay horas registradas en este período." />
            </View>
          )}

          <View style={styles.chartStatsRow}>
            <View style={styles.chartStat}>
              <ThemedText type="smallBold">{rangeSummary.daysWorked}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Días trabajados
              </ThemedText>
            </View>
            <View style={styles.chartStat}>
              <ThemedText type="smallBold">{formatHours(rangeSummary.averageHoursPerDay)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Promedio/día
              </ThemedText>
            </View>
          </View>

          <View style={styles.exportRow}>
            <GlassButton
              onPress={() =>
                void buildAndShareReportPdf({ entries: currentMonthEntries, summary: currentMonthSummary, from: currentMonthFrom, to: todayKey })
              }
              style={styles.compactButton}>
              PDF del mes
            </GlassButton>
            <GlassButton onPress={() => void buildAndShareReportCsv(currentMonthEntries)} style={styles.compactButton}>
              CSV del mes
            </GlassButton>
          </View>
        </GlassCard>
      </ScrollView>

      <FAB onPress={() => router.push('/entry/new')} style={{ bottom: insets.bottom + 90 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six * 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBadges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radii.pill },
  streakText: { fontWeight: '700' },
  hero: { gap: Spacing.two },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 20 },
  goalBlock: { gap: Spacing.one, marginTop: Spacing.one },
  quickBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 12, paddingHorizontal: Spacing.three, borderRadius: Radii.button },
  quickBannerText: { flex: 1 },
  staleCard: { gap: Spacing.two },
  staleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  staleTitle: { fontSize: 15 },
  recentSection: { gap: Spacing.two },
  recentCard: { paddingVertical: Spacing.two },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartCard: { gap: Spacing.three },
  emptyChart: { height: 120, alignItems: 'center', justifyContent: 'center' },
  chartStatsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.five },
  chartStat: { alignItems: 'center', gap: 2 },
  exportRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  compactButton: { paddingVertical: 8, paddingHorizontal: 16 },
});
