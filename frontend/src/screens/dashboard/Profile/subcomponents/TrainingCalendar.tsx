import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { addMonths, format, getDay, getDaysInMonth, parseISO, startOfMonth } from 'date-fns';
import type { CalendarDay } from '../hooks/useProfileStats';
import type { Workout } from '@/api/workoutApi';
import type { DietLog } from '@/api/dietApi';

interface TrainingCalendarProps {
  days: CalendarDay[];
  loading: boolean;
  /** Full workout history for expanded month-view grid */
  historyWorkouts: Workout[];
  /** Full diet-log history for expanded month-view grid */
  historyDietLogs: DietLog[];
  historyLoading: boolean;
  historyError: string | null;
  /** Called when user taps "View Details" to open the date detail sheet. */
  onDateSelect?: (dateStr: string) => void;
}

interface WorkoutStyle { bg: string; color: string; }

function getWorkoutStyle(type: string): WorkoutStyle {
  switch (type) {
    case 'push':  return { bg: 'rgba(255,219,202,0.6)', color: Colors.secondary };
    case 'pull':  return { bg: 'rgba(255,223,154,0.6)', color: Colors.tertiary };
    case 'legs':  return { bg: 'rgba(201,230,255,0.6)', color: Colors.primary };
    case 'rest':  return { bg: 'rgba(190,200,210,0.25)', color: Colors.outline };
    default:      return { bg: 'rgba(201,230,255,0.6)', color: Colors.primary };
  }
}

/** Horizontal scrollable training calendar for the current week,
 *  expandable in-place to a full month grid with day detail panels. */
export function TrainingCalendar({
  days, loading,
  historyWorkouts, historyDietLogs, historyLoading, historyError, onDateSelect,
}: TrainingCalendarProps) {
  // --- expanded state (managed internally) ---
  const [isExpanded, setIsExpanded] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const monthDate = addMonths(startOfMonth(new Date()), monthOffset);
    setSelectedDate(format(monthDate, 'yyyy-MM-dd'));
  }, [monthOffset]);

  // --- derived values for expanded month grid ---
  const historyMonthDate = useMemo(
    () => addMonths(startOfMonth(new Date()), monthOffset),
    [monthOffset],
  );

  const historyDays = useMemo(() => {
    const monthStart = startOfMonth(historyMonthDate);
    const totalDays = getDaysInMonth(historyMonthDate);
    const workoutDates = new Set(historyWorkouts.map((w) => w.performed_at.split('T')[0]));
    const dietDates = new Set(historyDietLogs.map((d) => d.logged_at.split('T')[0]));

    return Array.from({ length: totalDays }, (_, index) => {
      const day = new Date(monthStart);
      day.setDate(monthStart.getDate() + index);
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        dateStr,
        dayNumber: index + 1,
        weekday: getDay(day),
        hasActivity: workoutDates.has(dateStr) || dietDates.has(dateStr),
      };
    });
  }, [historyMonthDate, historyWorkouts, historyDietLogs]);

  const selectedHistorySummary = useMemo(() => {
    const workouts = historyWorkouts.filter((w) => w.performed_at.startsWith(selectedDate));
    const meals = historyDietLogs.filter((d) => d.logged_at.startsWith(selectedDate));
    return { workouts, meals, sleep: null as null, water: null as null };
  }, [historyDietLogs, historyWorkouts, selectedDate]);

  const historyMonthLabel = format(historyMonthDate, 'MMMM yyyy');
  const historyWeekdayOffset = getDay(historyMonthDate);
  const historyHasAnyActivity = historyDays.some((d) => d.hasActivity);
  const historySelectedDateLabel = format(parseISO(selectedDate), 'EEEE, MMM d');
  const historySummaryEmpty =
    selectedHistorySummary.workouts.length === 0 && selectedHistorySummary.meals.length === 0;

  const handleSelectHistoryDate = (dateStr: string) => setSelectedDate(dateStr);
  const handleSelectHistoryMonth = (direction: 'previous' | 'next') =>
    setMonthOffset((c) => c + (direction === 'previous' ? -1 : 1));

  return (
    <View style={styles.container}>
      {/* --- header row --- */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isExpanded ? 'Full Activity History' : 'Training Calendar'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setIsExpanded((e) => !e);
            if (!isExpanded && monthOffset !== 0) setMonthOffset(0);
          }}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Show weekly view' : 'View all training'}
          hitSlop={8}
        >
          <Text style={styles.viewAll}>{isExpanded ? 'Weekly View' : 'View All'}</Text>
        </TouchableOpacity>
      </View>

      {isExpanded ? (
        /* ----- expanded mode: full month grid ----- */
        <>
          {/* month navigation */}
          <View style={styles.expandedNavRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectHistoryMonth('previous')}
              style={styles.expandedNavButton}
            >
              <ChevronLeft size={16} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.expandedMonthLabel}>{historyMonthLabel}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectHistoryMonth('next')}
              style={styles.expandedNavButton}
            >
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {historyLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: spacing.base }} />
          ) : historyError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{historyError}</Text>
            </View>
          ) : (
            <>
              {/* day grid */}
              <View style={styles.expandedGrid}>
                {Array.from({ length: historyWeekdayOffset }).map((_, i) => (
                  <View key={`blank-${i}`} style={styles.expandedDayPlaceholder} />
                ))}
                {historyDays.map((day) => (
                  <TouchableOpacity
                    key={day.dateStr}
                    style={[
                      styles.expandedDayCard,
                      day.dateStr === selectedDate && styles.expandedDayCardActive,
                    ]}
                    onPress={() => handleSelectHistoryDate(day.dateStr)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.expandedDayNumber,
                      day.dateStr === selectedDate && styles.expandedDayNumberActive,
                    ]}>
                      {day.dayNumber}
                    </Text>
                    {day.hasActivity && <View style={styles.expandedDot} />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* detail panel for selected date */}
              <View style={styles.expandedSummaryCard}>
                <Text style={styles.expandedSummaryTitle}>{historySelectedDateLabel}</Text>
                {historySummaryEmpty ? (
                  <Text style={styles.expandedEmptyText}>No recorded activity for this date.</Text>
                ) : (
                  <>
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>Food Intake</Text>
                      {selectedHistorySummary.meals.length > 0 ? (
                        selectedHistorySummary.meals.map((meal) => (
                          <Text key={meal.id} style={styles.expandedLineItem}>• {meal.meal_name}</Text>
                        ))
                      ) : (
                        <Text style={styles.expandedMissingText}>No meals recorded</Text>
                      )}
                    </View>
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>Workout Sessions</Text>
                      {selectedHistorySummary.workouts.length > 0 ? (
                        selectedHistorySummary.workouts.map((workout) => (
                          <Text key={workout.id} style={styles.expandedLineItem}>• {workout.name}</Text>
                        ))
                      ) : (
                        <Text style={styles.expandedMissingText}>No workouts recorded</Text>
                      )}
                    </View>
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>Sleep Data</Text>
                      <Text style={styles.expandedMissingText}>Not tracked for this date</Text>
                    </View>
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>Water Intake</Text>
                      <Text style={styles.expandedMissingText}>Not tracked for this date</Text>
                    </View>
                  </>
                )}
                {!historyHasAnyActivity && (
                  <View style={styles.expandedMonthEmpty}>
                    <Text style={styles.expandedEmptyText}>No recorded activity in this month yet.</Text>
                  </View>
                )}

                {!!onDateSelect && !historySummaryEmpty && (
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => onDateSelect(selectedDate)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="View full details for this date"
                  >
                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </>
      ) : (
        /* ----- compact mode: horizontal week scroll (unchanged) ----- */
        loading ? (
          <ActivityIndicator
            color={Colors.primary}
            style={{ marginVertical: spacing.base }}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {days.map((day) => {
              const ws = getWorkoutStyle(day.workoutType);
              return (
                <TouchableOpacity
                  key={day.dateStr}
                  style={[styles.dayCard, day.isToday && styles.dayCardToday]}
                  onPress={() => {
                    if (day.isClickable && onDateSelect) {
                      onDateSelect(day.dateStr);
                    }
                  }}
                  activeOpacity={day.isClickable ? 0.7 : 1}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.dayLabel} ${day.dateNum}, ${day.workoutName === '–' ? 'no workout' : day.workoutName}`}
                  accessibilityState={{ disabled: !day.isClickable, selected: day.isToday }}
                >
                  {day.isToday && <View style={styles.todayDot} />}

                  <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                    {day.dayLabel}
                  </Text>
                  <Text style={[styles.dateNum, day.isToday && styles.dateNumToday]}>
                    {day.dateNum}
                  </Text>

                  {day.workoutName !== '–' ? (
                    <View style={[styles.badge, { backgroundColor: ws.bg }]}>
                      <Text style={[styles.badgeText, { color: ws.color }]}>
                        {day.workoutName}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.dash}>–</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  viewAll: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  scroll: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dayCard: {
    width: 72,
    minHeight: layout.minTouchTarget * 2,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190,200,210,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    position: 'relative',
  },
  dayCardToday: {
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  todayDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
  },
  dayLabel: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginBottom: 4,
  },
  dayLabelToday: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  dateNum: {
    fontSize: typography.xl,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  dateNumToday: {
    color: Colors.primary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  dash: {
    fontSize: typography.xs,
    color: Colors.outlineVariant,
  },

  // --- expanded mode styles ---
  expandedNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  expandedNavButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedMonthLabel: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.medium,
  },
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  expandedDayPlaceholder: {
    width: 44,
    height: 44,
  },
  expandedDayCard: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedDayCardActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: Colors.primary,
  },
  expandedDayNumber: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  expandedDayNumberActive: {
    color: Colors.primary,
  },
  expandedDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
    marginTop: spacing.xs,
  },
  expandedSummaryCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.base,
  },
  expandedSummaryTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  expandedSection: {
    marginTop: spacing.sm,
  },
  expandedSectionTitle: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  expandedLineItem: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  expandedMissingText: {
    fontSize: typography.sm,
    color: Colors.outline,
  },
  expandedEmptyText: {
    fontSize: typography.sm,
    color: Colors.outline,
    textAlign: 'center',
  },
  expandedMonthEmpty: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: Colors.error,
    fontSize: typography.sm,
  },
  viewDetailsBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  viewDetailsBtnText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
});
