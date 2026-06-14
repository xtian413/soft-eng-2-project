import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import { NutritionCarousel } from '@/screens/dashboard/Food/NutritionCarousel';
import { MealDiarySection } from '@/screens/dashboard/Food/MealDiarySection';
import { HydrationTrackerCard } from '@/screens/dashboard/Food/HydrationTrackerCard';
import { SleepRecoveryCard } from '@/screens/dashboard/Food/SleepRecoveryCard';
import type { FoodLogEntry, MacroTargets, MealId } from '@/screens/dashboard/types';
import type { LocalDailyLog } from '@/local/schema';

interface FoodHistoryViewProps {
  foodLogs: FoodLogEntry[];
  targets: MacroTargets;
  dailyLog: LocalDailyLog | null;
  loading: boolean;
  error: string | null;
  onItemPress: (entry: FoodLogEntry) => void;
  visibleMicros: string[];
}

/** Read-only view of food/diet history for a specific date. */
export function FoodHistoryView({
  foodLogs,
  targets,
  dailyLog,
  loading,
  error,
  onItemPress,
  visibleMicros,
}: FoodHistoryViewProps) {
  // Dummy setter — read-only, never used
  const noopSet = () => {};
  const dummySetState = (_: any) => {};
  const dummyTriggerToast = (_msg: string) => {};

  const noopOpenSearch = (_mealId: MealId) => {};
  const noopDeleteEntry = (_id: string) => {};

  // Build water glass states from dailyLog
  const waterGlassStates = useMemo(() => {
    if (!dailyLog?.water_ml) return [];
    const glasses = Math.floor(dailyLog.water_ml / 250);
    const totalGlasses = Math.min(
      12,
      Math.max(Math.ceil((dailyLog.water_goal_ml ?? 2000) / 250), glasses)
    );
    return Array.from({ length: totalGlasses }, (_, i) => i < glasses);
  }, [dailyLog]);

  const hydrationGoal = dailyLog?.water_goal_ml ?? 2000;

  // Build sleep data
  const bedtime = dailyLog?.bedtime ?? null;
  const waketime = dailyLog?.waketime ?? null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading food history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load food history</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  const hasNoData =
    foodLogs.length === 0 && !dailyLog?.water_ml && !dailyLog?.bedtime;

  if (hasNoData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No Food Data</Text>
        <Text style={styles.emptyText}>
          No food, water, or sleep entries recorded for this date.
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
      {/* Nutrition Carousel — macros, calories, micros */}
      <NutritionCarousel
        foodLogs={foodLogs}
        targets={targets}
        visibleMicros={visibleMicros}
        setVisibleMicros={dummySetState}
        triggerToast={dummyTriggerToast}
        readOnly
      />

      {/* Meal Diary Section — food by meal type */}
      {foodLogs.length > 0 && (
        <MealDiarySection
          foodLogs={foodLogs}
          onOpenSearch={noopOpenSearch}
          onItemPress={onItemPress}
          onDeleteEntry={noopDeleteEntry}
          readOnly
        />
      )}

      {/* Hydration Tracker — water intake */}
      <HydrationTrackerCard
        hydrationGoal={hydrationGoal}
        setHydrationGoal={noopSet}
        waterGlassStates={waterGlassStates}
        setWaterGlassStates={dummySetState}
        triggerToast={dummyTriggerToast}
        readOnly
      />

      {/* Sleep Recovery — sleep data */}
      <SleepRecoveryCard
        bedtime={bedtime}
        setBedtime={noopSet}
        waketime={waketime}
        setWaketime={noopSet}
        triggerToast={dummyTriggerToast}
        readOnly
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxxl,
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
});
