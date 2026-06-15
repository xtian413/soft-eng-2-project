import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';

const MAX_OPTIMAL = 20;
const MIN_OPTIMAL = 10;

function getBarColor(count: number): string {
  if (count < MIN_OPTIMAL) return Colors.outline;             // Gray — under
  if (count <= MAX_OPTIMAL) return Colors.primary;            // Primary — optimal
  return Colors.secondaryContainer;                           // Orange — over
}

function getStatusLabel(count: number): string {
  if (count < MIN_OPTIMAL) return 'Under';
  if (count <= MAX_OPTIMAL) return 'Optimal';
  return 'Over';
}

interface MuscleGroupVolumeCardProps {
  muscleGroupWeeklySets: Record<string, number>;
}

export function MuscleGroupVolumeCard({ muscleGroupWeeklySets }: MuscleGroupVolumeCardProps) {
  const entries = Object.entries(muscleGroupWeeklySets);

  if (entries.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>WEEKLY MUSCLE VOLUME</Text>
        <View style={styles.infoBadge}>
          <Info size={12} color={Colors.outline} />
        </View>
      </View>

      {entries.map(([muscle, count]) => {
        const barPercent = Math.min((count / MAX_OPTIMAL) * 100, 100);
        const barColor = getBarColor(count);

        return (
          <View key={muscle} style={styles.muscleRow}>
            <View style={styles.muscleHeader}>
              <Text style={styles.muscleName}>{muscle}</Text>
              <Text style={[styles.setCount, { color: barColor }]}>
                {count} {count === 1 ? 'set' : 'sets'}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${barPercent}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.statusText, { color: barColor }]}>
                {getStatusLabel(count)}
              </Text>
            </View>
          </View>
        );
      })}

      <View style={styles.divider} />

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.outline }]} />
          <Text style={styles.legendText}>Under (0-9)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>Optimal (10-20)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.secondaryContainer }]} />
          <Text style={styles.legendText}>Over (21+)</Text>
        </View>
      </View>

      <Text style={styles.caption}>
        10–20 hard sets per muscle group per week is the recognized optimal range
        for hypertrophy.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
  },
  infoBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: 'rgba(190, 200, 210, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleRow: {
    marginBottom: spacing.md,
  },
  muscleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  muscleName: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
    textTransform: 'capitalize',
  },
  setCount: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  statusRow: {
    marginTop: 3,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(190, 200, 210, 0.12)',
    marginBottom: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  caption: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    lineHeight: 14,
    fontStyle: 'italic',
  },
});
