import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react-native';
import { addMonths, addWeeks, format, getDay, getDaysInMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns';
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

/** Week calendar grid, expandable in-place to a full month
 *  grid with day detail panels inside a themed card container. */
export function TrainingCalendar({
  days, loading,
  historyWorkouts, historyDietLogs, historyLoading, historyError, onDateSelect,
}: TrainingCalendarProps) {
  // --- expanded state (managed internally) ---
  const [isExpanded, setIsExpanded] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
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

  // --- derived values for compact week grid ---
  const compactWeekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 0 }),
    [weekOffset],
  );

  const compactDays = useMemo(() => {
    const weekStart = compactWeekStart;
    const workoutDates = new Set(historyWorkouts.map((w) => w.performed_at.split('T')[0]));
    const dietDates = new Set(historyDietLogs.map((d) => d.logged_at.split('T')[0]));

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const hasActivity = workoutDates.has(dateStr) || dietDates.has(dateStr);
      const workout = historyWorkouts.find((w) => w.performed_at.startsWith(dateStr));
      const workoutType = workout
        ? (workout.name.toLowerCase().includes('push') || workout.name.toLowerCase().includes('chest') || workout.name.toLowerCase().includes('shoulder') || workout.name.toLowerCase().includes('tricep')) ? 'push'
        : (workout.name.toLowerCase().includes('pull') || workout.name.toLowerCase().includes('back') || workout.name.toLowerCase().includes('row') || workout.name.toLowerCase().includes('bicep')) ? 'pull'
        : (workout.name.toLowerCase().includes('leg') || workout.name.toLowerCase().includes('squat') || workout.name.toLowerCase().includes('deadlift') || workout.name.toLowerCase().includes('glute')) ? 'legs'
        : (workout.name.toLowerCase().includes('rest') || workout.name.toLowerCase().includes('recovery')) ? 'rest'
        : 'other'
        : 'empty';

      return {
        dayLabel: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        dateNum: day.getDate(),
        dateStr,
        workoutName: workout ? workout.name.split(' ')[0] : '–',
        workoutType,
        isToday: isToday(day),
        isClickable: hasActivity,
        hasActivity,
      };
    });
  }, [compactWeekStart, historyWorkouts, historyDietLogs]);

  // Use compactDays when history data is available, otherwise fall back to prop
  const displayDays = historyWorkouts.length > 0 || historyDietLogs.length > 0 ? compactDays : days;

  const historyMonthLabel = format(historyMonthDate, 'MMMM yyyy');
  const historyWeekdayOffset = getDay(historyMonthDate);
  const historyHasAnyActivity = historyDays.some((d) => d.hasActivity);
  const historySelectedDateLabel = format(parseISO(selectedDate), 'EEEE, MMM d');
  const historySummaryEmpty =
    selectedHistorySummary.workouts.length === 0 && selectedHistorySummary.meals.length === 0;

  const handleSelectHistoryDate = (dateStr: string) => setSelectedDate(dateStr);
  const handleSelectHistoryMonth = (direction: 'previous' | 'next') =>
    setMonthOffset((c) => c + (direction === 'previous' ? -1 : 1));

  const { width: screenWidth } = useWindowDimensions();
  const containerMaxWidth = Math.min(screenWidth - spacing.base * 2, layout.modalMaxWidth);
  // expanded grid cell width — accounts for card padding + 6 gaps between 7 columns
  const historyCellWidth = Math.floor((containerMaxWidth - spacing.base * 2 - spacing.xs * 6) / 7);
  // compact day cell width — accounts for card padding + 6 gaps between 7 columns
  const compactCellWidth = Math.floor((containerMaxWidth - spacing.base * 2 - spacing.xs * 6) / 7);

  return (
    <View style={styles.container}>
      {/* --- expanded mode: full month grid --- */}
      {isExpanded ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Full Activity History</Text>
            <TouchableOpacity
              onPress={() => {
                setIsExpanded(false);
                if (monthOffset !== 0) setMonthOffset(0);
              }}
              accessibilityRole="button"
              accessibilityLabel="Show weekly view"
              hitSlop={8}
            >
              <Text style={styles.viewAll}>Weekly View</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyCard}>
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
              {/* weekday header row */}
              <View style={styles.expandedWeekdayRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
                  <View key={`wd-${i}`} style={[styles.expandedWeekdayCell, { width: historyCellWidth }]}>
                    <Text style={styles.expandedWeekdayLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* day grid */}
              <View style={styles.expandedGrid}>
                {Array.from({ length: historyWeekdayOffset }).map((_, i) => (
                  <View key={`blank-${i}`} style={[styles.expandedDayPlaceholder, { width: historyCellWidth, height: historyCellWidth }]} />
                ))}
                {historyDays.map((day) => (
                  <TouchableOpacity
                    key={day.dateStr}
                    style={[
                      styles.expandedDayCard,
                      { width: historyCellWidth, height: historyCellWidth },
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
                          <View key={meal.id} style={styles.expandedDetailRow}>
                            <View style={styles.expandedDetailDot} />
                            <Text style={styles.expandedLineItem}>{meal.meal_name}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.expandedMissingText}>No meals recorded</Text>
                      )}
                    </View>
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>Workout Sessions</Text>
                      {selectedHistorySummary.workouts.length > 0 ? (
                        selectedHistorySummary.workouts.map((workout) => (
                          <View key={workout.id} style={styles.expandedDetailRow}>
                            <View style={styles.expandedDetailDot} />
                            <Text style={styles.expandedLineItem}>{workout.name}</Text>
                          </View>
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
        </View>
      </>
      ) : (
        /* ----- compact mode: card with week grid ----- */
        loading ? (
          <ActivityIndicator
            color={Colors.primary}
            style={{ marginVertical: spacing.base }}
          />
        ) : (
          <View style={styles.compactCard}>
            {/* Header: nav arrows + centered title + "View All" */}
            <View style={styles.header}>
              <View style={styles.headerSide}>
                <TouchableOpacity
                  onPress={() => setWeekOffset((c) => c - 1)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Previous week"
                >
                  <ChevronLeft size={16} color={Colors.primary} />
                </TouchableOpacity>
                <Calendar size={18} color={Colors.primary} />
                <TouchableOpacity
                  onPress={() => setWeekOffset((c) => c + 1)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Next week"
                >
                  <ChevronRight size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.headerTitle}>Fitness Journey</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsExpanded(true);
                  if (monthOffset !== 0) setMonthOffset(0);
                }}
                style={styles.headerSideRight}
                accessibilityRole="button"
                accessibilityLabel="View all training"
                hitSlop={8}
              >
                <Text style={styles.viewAll}>View All</Text>
                <ChevronRight size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Weekday labels: Su Mo Tu We Th Fr Sa */}
            <View style={styles.compactWeekdayRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => (
                <View key={`cwd-${label}`} style={[styles.compactWeekdayCell, { width: compactCellWidth }]}>
                  <Text style={styles.compactWeekdayLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Day cells grid: 7 across */}
            <View style={styles.compactGrid}>
              {displayDays.map((day) => (
                <TouchableOpacity
                  key={day.dateStr}
                  style={[
                    styles.compactDayCell,
                    { width: compactCellWidth, height: compactCellWidth },
                    day.isToday && styles.compactDayCellToday,
                  ]}
                  onPress={() => {
                    if (day.isClickable && onDateSelect) {
                      onDateSelect(day.dateStr);
                    }
                  }}
                  activeOpacity={day.isClickable ? 0.7 : 1}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.dayLabel} ${day.dateNum}${day.hasActivity ? ', has activity' : ''}`}
                  accessibilityState={{ disabled: !day.isClickable, selected: day.isToday }}
                >
                  <Text style={[
                    styles.compactDayNumber,
                    day.isToday && styles.compactDayNumberToday,
                  ]}>
                    {day.dateNum}
                  </Text>
                  {day.hasActivity && <View style={styles.compactActivityDot} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  dayCard: {
    minHeight: 72,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190,200,210,0.25)',
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
    fontSize: 10,
    color: Colors.outline,
    marginBottom: 4,
    fontWeight: fontWeight.medium,
  },
  dayLabelToday: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  dateNum: {
    fontSize: typography.xl,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  dateNumToday: {
    color: Colors.primary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  dash: {
    fontSize: 11,
    color: Colors.outlineVariant,
    fontWeight: fontWeight.medium,
  },

  // --- new compact mode styles ---
  compactCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  headerSideRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  compactWeekdayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  compactWeekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  compactWeekdayLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.3,
  },
  compactGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  compactDayCell: {
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDayCellToday: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  compactDayNumber: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  compactDayNumberToday: {
    color: Colors.primary,
  },
  compactActivityDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },

  // --- expanded mode styles ---
  historyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  expandedNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  expandedNavButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  expandedMonthLabel: {
    fontSize: typography.base,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  // --- weekday header row ---
  expandedWeekdayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  expandedWeekdayCell: {
    width: 46,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedWeekdayLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.3,
  },

  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  expandedDayPlaceholder: {
    width: 46,
    height: 46,
  },
  expandedDayCard: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedDayCardActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderColor: Colors.primary,
    borderWidth: 1.5,
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
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
  // --- detail row with dot ---
  expandedDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  expandedDetailDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: Colors.outlineVariant,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  expandedSummaryCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  expandedSummaryTitle: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.md,
  },
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.1)',
  },
  expandedSectionTitle: {
    fontSize: 10,
    color: Colors.outline,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: fontWeight.bold,
  },
  expandedLineItem: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    flex: 1,
  },
  expandedMissingText: {
    fontSize: typography.sm,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  expandedEmptyText: {
    fontSize: typography.sm,
    color: Colors.outline,
    textAlign: 'center',
  },
  expandedMonthEmpty: {
    marginTop: spacing.md,
    padding: spacing.md,
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
    marginTop: spacing.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    minHeight: 42,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  viewDetailsBtnText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
});
