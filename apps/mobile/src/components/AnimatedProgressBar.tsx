import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Radii } from '@/constants/theme';

interface AnimatedProgressBarProps {
  percent: number; // 0-100
  trackColor: string;
  fillColor: string;
}

/** Barra de progreso que anima el llenado en vez de aparecer ya completa — un detalle chico que ayuda a que la UI se sienta viva. */
export function AnimatedProgressBar({ percent, trackColor, fillColor }: AnimatedProgressBarProps) {
  // useState (no useRef) con inicializador perezoso: da una identidad estable
  // de Animated.Value entre renders sin el patrón "acceder a .current durante
  // el render" que el linter (react-hooks/refs, por el React Compiler) rechaza.
  const [widthAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(100, Math.max(0, percent)),
      duration: 700,
      useNativeDriver: false, // "width" no soporta el native driver
    }).start();
  }, [percent, widthAnim]);

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: Radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radii.pill },
});
