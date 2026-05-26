import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Dumbbell, Flame } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';

interface StatsRowProps {
  totalVolumeKg: number;
  weekStreak: number;
  loading: boolean;
}

function formatVolume(kg: number): { value: string; suffix: string } {
  if (kg >= 1000) {
    return { value: (kg / 1000).toFixed(kg >= 10000 ? 0 : 1), suffix: 'k' };
  }
  return { value: String(Math.round(kg)), suffix: '' };
}

/** Renders Total Volume and Week Streak side by side */
export function StatsRow({ totalVolumeKg, weekStreak, loading }: StatsRowProps) {
  const vol = formatVolume(totalVolumeKg);

  return (
    <View style={styles.row}>
      {/* Total Volume */}
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(14,165,233,0.1)' }]}>
          <Dumbbell size={18} color={Colors.primary} />
        </View>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.valueRow}>
            <Text style={styles.value}>{vol.value}</Text>
            {!!vol.suffix && (
              <Text style={styles.valueSuffix}>{vol.suffix}</Text>
            )}
          </View>
        )}
        <Text style={styles.label}>TOTAL VOLUME</Text>
      </View>

      {/* Week Streak */}
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(157,67,0,0.1)' }]}>
          <Flame size={18} color={Colors.secondaryContainer} />
        </View>
        {loading ? (
          <ActivityIndicator color={Colors.secondaryContainer} style={styles.loader} />
        ) : (
          <Text style={styles.value}>{weekStreak}</Text>
        )}
        <Text style={styles.label}>WEEK STREAK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190,200,210,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  value: {
    fontSize: typography.xxxl,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    lineHeight: typography.xxxl * 1.1,
  },
  valueSuffix: {
    fontSize: typography.xl,
    color: Colors.outlineVariant,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },
});
