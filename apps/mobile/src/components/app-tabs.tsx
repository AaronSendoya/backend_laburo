import { NativeTabs } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, hexToRgba } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-effective-color-scheme';

export default function AppTabs() {
  const scheme = useEffectiveColorScheme();
  const colors = Colors[scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={hexToRgba(colors.tint, 0.14)}
      labelStyle={{ selected: { color: colors.tintText } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          selectedColor={colors.tint}
          sf={{ default: 'house', selected: 'house.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="home-outline" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          selectedColor={colors.tint}
          sf="calendar"
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="calendar-outline" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reports">
        <NativeTabs.Trigger.Label>Reportes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          selectedColor={colors.tint}
          sf="chart.bar.doc.horizontal"
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="bar-chart-outline" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          selectedColor={colors.tint}
          sf="gearshape"
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="settings-outline" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
