import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import type { CalendarDay } from '../hooks/useProfileStats';

type TabType = 'dashboard' | 'food' | 'chat' | 'lift' | 'profile';

interface TrainingCalendarProps {
  days: CalendarDay[];
  loading: boolean;
  setActiveTab: (tab: TabType) => void;
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

/** Horizontal scrollable training calendar for the current week */
export function TrainingCalendar({ days, loading, setActiveTab }: TrainingCalendarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Training Calendar</Text>
        <TouchableOpacity onPress={() => setActiveTab('lift')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
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
                onPress={() => { if (day.isClickable) setActiveTab('lift'); }}
                activeOpacity={day.isClickable ? 0.7 : 1}
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
});
