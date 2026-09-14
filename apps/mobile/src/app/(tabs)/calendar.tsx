import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Calendar, type DateData } from 'react-native-calendars';
import { computeReportSummary } from '@app-laburo/shared';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { useTheme } from '@/hooks/use-theme';
import { useReportSearch } from '@/hooks/useTimeEntries';
import { hexToRgba, Spacing } from '@/constants/theme';
import { formatHours, formatMonthLabel } from '@/lib/format';

/** Horas de referencia para "un día lleno" — a partir de acá el día se marca con la intensidad máxima. */
const FULL_DAY_HOURS = 8;

function monthRange(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const from = `${monthKey}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export default function CalendarScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visibleMonth, setVisibleMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const { from, to } = useMemo(() => monthRange(visibleMonth), [visibleMonth]);
  const { data: monthEntries = [] } = useReportSearch({ fromLocalDate: from, toLocalDate: to });
  const monthSummary = useMemo(() => computeReportSummary(monthEntries, { groupBy: 'day' }), [monthEntries]);

  // Intensidad de color proporcional a las horas de ese día — el calendario funciona como un mini mapa de calor,
  // no solo "trabajé / no trabajé". La fecha de hoy no se muestra involuntariamente vacía: el tono acompaña el valor real.
  const markedDates = useMemo(
    () =>
      Object.fromEntries(
        monthSummary.series
          .filter((point) => point.hours > 0)
          .map((point) => {
            const intensity = Math.min(point.hours / FULL_DAY_HOURS, 1);
            return [
              point.key,
              {
                customStyles: {
                  container: { backgroundColor: hexToRgba(theme.tint, 0.18 + intensity * 0.5), borderRadius: 10 },
                  text: { color: theme.text, fontWeight: (intensity > 0.5 ? '700' : '500') as '700' | '500' },
                },
              },
            ];
          }),
      ),
    [monthSummary.series, theme.tint, theme.text],
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.summarySection}>
        <ThemedText type="heading">{formatMonthLabel(visibleMonth)}</ThemedText>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText type="smallBold" style={styles.summaryValue}>
              {formatHours(monthSummary.totalHours)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Total del mes
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText type="smallBold" style={styles.summaryValue}>
              {monthSummary.daysWorked}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Días trabajados
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText type="smallBold" style={styles.summaryValue}>
              {formatHours(monthSummary.averageHoursPerDay)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Promedio/día
            </ThemedText>
          </View>
        </View>
      </View>

      <GlassCard style={styles.calendarCard}>
        <Calendar
          current={`${visibleMonth}-01`}
          markingType="custom"
          markedDates={markedDates}
          onDayPress={(day: DateData) => router.push({ pathname: '/day/[date]', params: { date: day.dateString } })}
          onMonthChange={(month: DateData) => setVisibleMonth(month.dateString.slice(0, 7))}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            dayTextColor: theme.text,
            monthTextColor: theme.text,
            textDisabledColor: theme.textSecondary,
            todayTextColor: theme.tintText,
            arrowColor: theme.tint,
            textSectionTitleColor: theme.textSecondary,
          }}
        />
        <View style={styles.legendRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Menos horas
          </ThemedText>
          <View style={styles.legendSwatches}>
            {[0.18, 0.35, 0.5, 0.68].map((alpha) => (
              <View key={alpha} style={[styles.legendSwatch, { backgroundColor: hexToRgba(theme.tint, alpha) }]} />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Más horas
          </ThemedText>
        </View>
      </GlassCard>

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Tocá cualquier día — marcado o no — para ver o agregar registros de esa fecha.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  summarySection: { gap: Spacing.three },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 18 },
  calendarCard: { padding: Spacing.two, gap: Spacing.two },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  legendSwatches: { flexDirection: 'row', gap: 3 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  footnote: { textAlign: 'center' },
});
