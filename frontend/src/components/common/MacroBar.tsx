import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, spacing, radius } from '@/theme/typography';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
}

/** Renders a labelled animated macro progress bar. */
export function MacroBar({ label, current, target, unit = 'g', color }: MacroBarProps) {
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percent,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [percent, widthAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>
          {current}
          <Text style={styles.unit}>/{target}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: fontWeight.medium,
    color: Colors.outline,
  },
  value: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
  },
  unit: {
    fontWeight: fontWeight.regular,
    color: Colors.outline,
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(229, 238, 255, 0.7)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
