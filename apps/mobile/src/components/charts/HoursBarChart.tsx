import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { ReportGroupPoint } from '@app-laburo/shared';
import { useTheme } from '@/hooks/use-theme';

interface HoursBarChartProps {
  series: ReportGroupPoint[];
  formatLabel: (key: string) => string;
  height?: number;
}

/**
 * Un solo componente de gráfica, alimentado por computeReportSummary (en
 * @app-laburo/shared) y reusado tanto en el Dashboard como en Reportes —
 * mismo dato, misma función, sin lógica duplicada.
 */
export function HoursBarChart({ series, formatLabel, height = 180 }: HoursBarChartProps) {
  const theme = useTheme();

  if (series.length === 0) {
    return null;
  }

  const data = series.map((point) => ({
    value: point.hours,
    label: formatLabel(point.key),
    frontColor: theme.tint,
  }));

  return (
    <View>
      <BarChart
        data={data}
        height={height}
        barWidth={22}
        spacing={18}
        roundedTop
        noOfSections={4}
        yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
        yAxisColor={theme.textSecondary}
        xAxisColor={theme.textSecondary}
        isAnimated
      />
    </View>
  );
}
