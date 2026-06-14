import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import type { LocalWorkoutWithSets } from '@/local/schema';

interface LiftHistoryViewProps {
  workouts: LocalWorkoutWithSets[];
  loading: boolean;
  error: string | null;
}

/** Strips trailing .0 decimals for cleaner weight display. */
function formatWeight(kg: number): string {
  return kg % 1 === 0 ? String(Math.round(kg)) : kg.toFixed(1);
}

/** Groups workout sets by exercise name, preserving order. */
function groupSetsByExercise(workout: LocalWorkoutWithSets) {
  const map = new Map<string, typeof workout.sets>();
  for (const set of workout.sets) {
    const existing = map.get(set.exercise_name);
    if (existing) {
      existing.push(set);
    } else {
      map.set(set.exercise_name, [set]);
    }
  }
  return Array.from(map.entries());
}

/** Read-only view of workout/lift history for a specific date. */
export function LiftHistoryView({
  workouts,
  loading,
  error,
}: LiftHistoryViewProps) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading workout history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load workouts</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (workouts.length === 0) {
    return (
      <View style={styles.centered}>
        <Dumbbell size={36} color={Colors.outlineVariant} />
        <Text style={styles.emptyTitle}>No Workouts</Text>
        <Text style={styles.emptyText}>
          No workout sessions recorded for this date.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {workouts.map((workout) => {
        const exerciseGroups = groupSetsByExercise(workout);
        const totalSets = workout.sets.length;
        const totalExercises = exerciseGroups.length;
        const workoutTime = workout.performed_at.split('T')[1]?.slice(0, 5) || '--:--';

        return (
          <View key={workout.id} style={styles.workoutCard}>
            {/* Workout header */}
            <View style={styles.workoutHeader}>
              <View style={styles.workoutNameRow}>
                <View style={styles.workoutIconWrap}>
                  <Dumbbell size={16} color={Colors.primary} />
                </View>
                <View style={styles.workoutNameCol}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <Text style={styles.workoutMeta}>
                    {workoutTime} · {totalSets} set{totalSets !== 1 ? 's' : ''} · {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Exercise groups */}
            {exerciseGroups.map(([exerciseName, sets]) => (
              <View key={exerciseName} style={styles.exerciseSection}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exerciseName}</Text>
                  <Text style={styles.exerciseSetCount}>
                    {sets.length} set{sets.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Set rows */}
                {sets.map((set, idx) => (
                  <View key={set.id} style={styles.setRow}>
                    <View style={styles.setBadgeCol}>
                      <View style={styles.setBadge}>
                        <Text style={styles.setBadgeText}>{idx + 1}</Text>
                      </View>
                    </View>
                    <View style={styles.setDetailCol}>
                      <Text style={styles.setDetailText}>
                        {set.weight_kg != null ? `${formatWeight(set.weight_kg)} kg` : '—'} × {set.reps ?? '—'} reps
                      </Text>
                      {set.rir != null && (
                        <Text style={styles.setRirText}>RIR: {set.rir}</Text>
                      )}
                    </View>
                    {set.est_1rm != null && (
                      <View style={styles.set1rmCol}>
                        <Text style={styles.set1rmLabel}>1RM</Text>
                        <Text style={styles.set1rmValue}>
                          {formatWeight(set.est_1rm)} kg
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.error,
    marginBottom: spacing.xs,
  },
  errorDetail: {
    fontSize: typography.sm,
    color: Colors.outline,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sm,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 20,
  },
  workoutCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    overflow: 'hidden',
  },
  workoutHeader: {
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.1)',
  },
  workoutNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutNameCol: {
    flex: 1,
  },
  workoutName: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  workoutMeta: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 2,
  },
  exerciseSection: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.06)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  exerciseSetCount: {
    fontSize: 10,
    color: Colors.outline,
    fontWeight: fontWeight.bold,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  setBadgeCol: {
    width: 28,
  },
  setBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  setDetailCol: {
    flex: 1,
  },
  setDetailText: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  setRirText: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 1,
  },
  set1rmCol: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderRadius: radius.sm,
  },
  set1rmLabel: {
    fontSize: 8,
    color: Colors.outline,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  set1rmValue: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
});
