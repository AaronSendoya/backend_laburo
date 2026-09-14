import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { computeReportSummary, localDayKey, type ReportGroupBy } from '@app-laburo/shared';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { FormField } from '@/components/FormField';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { HoursBarChart } from '@/components/charts/HoursBarChart';
import { EmptyState } from '@/components/EmptyState';
import { useReportSearch } from '@/hooks/useTimeEntries';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { formatDayLabel, formatHours, formatMonthLabel, formatTime, formatWeekLabel } from '@/lib/format';
import { buildAndShareReportPdf } from '@/features/reports/buildReportHtml';
import { buildAndShareReportCsv } from '@/features/reports/buildReportCsv';

type Preset = 'week' | 'month' | 'last30';

function localKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const today = new Date();
  const to = localKey(today);
  if (preset === 'week') return { from: localKey(startOfWeek(today, { weekStartsOn: 1 })), to };
  if (preset === 'month') return { from: localKey(startOfMonth(today)), to };
  return { from: localKey(subDays(today, 29)), to };
}

const PRESET_OPTIONS: { value: Preset; label: string }[] = [
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'last30', label: '30 días' },
];

const GROUP_OPTIONS: { value: ReportGroupBy; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

export default function ReportsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [preset, setPreset] = useState<Preset>('week');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [missingCheckoutOnly, setMissingCheckoutOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('day');

  // Debounce: tipear letra por letra no debe disparar una consulta a SQLite (ni una
  // entrada nueva en el cache de React Query) por cada tecla — espera una pausa breve.
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const { from, to } = useMemo(() => rangeForPreset(preset), [preset]);
  const { data: entries = [] } = useReportSearch({ fromLocalDate: from, toLocalDate: to, keyword, missingCheckoutOnly });
  const summary = useMemo(() => computeReportSummary(entries, { groupBy }), [entries, groupBy]);

  const labelFormatter = groupBy === 'day' ? formatDayLabel : groupBy === 'week' ? formatWeekLabel : formatMonthLabel;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}>
      <ThemedText type="heading">Reportes</ThemedText>

      <GlassCard style={styles.filtersCard}>
        <SectionHeader icon="options-outline">Filtros</SectionHeader>

        <SegmentedControl options={PRESET_OPTIONS} value={preset} onChange={setPreset} />

        <FormField
          label="Buscar en la descripción"
          value={keywordInput}
          onChangeText={setKeywordInput}
          placeholder="Ej: reunión, backend..."
          autoCorrect={false}
        />

        <View style={styles.rowBetween}>
          <ThemedText type="small">Solo entradas sin salida</ThemedText>
          <Switch value={missingCheckoutOnly} onValueChange={setMissingCheckoutOnly} />
        </View>

        <View style={styles.groupByRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Agrupar por
          </ThemedText>
          <SegmentedControl options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} />
        </View>
      </GlassCard>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText type="smallBold" style={styles.statValue}>
            {formatHours(summary.totalHours)}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Total
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="smallBold" style={styles.statValue}>
            {summary.daysWorked}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Días trabajados
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="smallBold" style={styles.statValue}>
            {formatHours(summary.averageHoursPerDay)}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Promedio/día
          </ThemedText>
        </View>
      </View>

      <GlassCard style={styles.chartCard}>
        <SectionHeader icon="stats-chart-outline">Distribución</SectionHeader>
        {summary.series.length > 0 ? (
          <HoursBarChart series={summary.series} formatLabel={labelFormatter} height={200} />
        ) : (
          <View style={styles.emptyChart}>
            <EmptyState icon="bar-chart-outline" message="No hay horas registradas con estos filtros." />
          </View>
        )}
      </GlassCard>

      <View style={styles.exportRow}>
        <GlassButton
          variant="primary"
          onPress={() => void buildAndShareReportPdf({ entries, summary, from, to })}
          style={styles.compactButton}>
          Exportar PDF
        </GlassButton>
        <GlassButton onPress={() => void buildAndShareReportCsv(entries)} style={styles.compactButton}>
          Exportar CSV
        </GlassButton>
      </View>

      <View style={styles.list}>
        <SectionHeader icon="list-outline">{`Entradas (${entries.length})`}</SectionHeader>
        {entries.map((entry) => (
          <GlassCard key={entry.id} style={styles.entryCard}>
            <ThemedText type="smallBold">
              {formatDayLabel(localDayKey(new Date(entry.checkIn)))} · {formatTime(entry.checkIn)}–{entry.checkOut ? formatTime(entry.checkOut) : '…'}
            </ThemedText>
            {entry.note ? (
              <ThemedText themeColor="textSecondary" type="small">
                {entry.note}
              </ThemedText>
            ) : null}
          </GlassCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  filtersCard: { gap: Spacing.three },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupByRow: { gap: Spacing.one },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18 },
  chartCard: { gap: Spacing.two },
  emptyChart: { height: 120, alignItems: 'center', justifyContent: 'center' },
  exportRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  compactButton: { paddingVertical: 8, paddingHorizontal: 16 },
  list: { gap: Spacing.two },
  entryCard: { gap: 2 },
});
