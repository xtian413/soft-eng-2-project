import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';

interface CircularProgressProps {
  /** Value between 0 and 100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Center label: main number */
  mainLabel?: string;
  /** Center label: sub text */
  subLabel?: string;
  /** Center label: caption below sub */
  caption?: string;
}

/** Renders a circular SVG progress ring matching the Gemi calorie ring spec. */
export function CircularProgress({
  percent,
  size = 160,
  strokeWidth = 10,
  mainLabel,
  subLabel,
  caption,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const dashoffset = circumference - (clampedPercent / 100) * circumference;

  const animatedOffset = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    Animated.timing(animatedOffset, {
      toValue: dashoffset,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [dashoffset, animatedOffset]);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* SVG ring */}
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(229, 238, 255, 0.6)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center text overlay */}
      <View style={styles.centerContent}>
        {mainLabel !== undefined && (
          <Text style={styles.mainLabel}>{mainLabel}</Text>
        )}
        {subLabel !== undefined && (
          <Text style={styles.subLabel}>{subLabel}</Text>
        )}
        {caption !== undefined && (
          <Text style={styles.caption}>{caption}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  mainLabel: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryContainer,
    textAlign: 'center',
    marginTop: 2,
  },
  caption: {
    fontSize: 10,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 1,
  },
});
