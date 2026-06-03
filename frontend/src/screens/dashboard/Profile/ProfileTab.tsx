import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { Colors } from '@/theme/colors';
import { useAuthStore } from '@/store/authStore';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import type { GoalKey, MacroTargets } from '@/screens/dashboard/types';
import { Dumbbell, TrendingDown, Activity, ShieldCheck, LogOut, Lock, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useProfileStats } from './hooks/useProfileStats';
import { StatsRow } from './subcomponents/StatsRow';
import { WeightTrendCard } from './subcomponents/WeightTrendCard';
import { TrainingCalendar } from './subcomponents/TrainingCalendar';
import { TDEECalculator } from './TDEECalculator';
import { fetchWorkouts, type Workout } from '@/api/workoutApi';
import { fetchDietLogs, type DietLog } from '@/api/dietApi';
import { addMonths, format, getDay, getDaysInMonth, parseISO, startOfMonth } from 'date-fns';

const GOAL_LABELS: Record<GoalKey, string> = {
  build_muscle: 'Build Muscle',
  lose_weight: 'Lose Weight',
  maintain: 'Maintain',
};

interface ProfileTabProps {
  fullName: string;
  email: string;
  goal: GoalKey;
  heightCm: number;
  weightKg: number;
  targets: MacroTargets;
  onSignOut: () => void;
  setActiveTab: (tab: 'dashboard' | 'food' | 'insights' | 'lift' | 'profile') => void;
}

export function ProfileTab({ fullName, email, goal, heightCm, weightKg, targets, onSignOut, setActiveTab }: ProfileTabProps) {
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const { updatePhysicalStats } = useAuthStore();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isSignOutModalVisible, setSignOutModalVisible] = useState(false);
  const [isTDEEModalVisible, setTDEEModalVisible] = useState(false);
  const [editHeight, setEditHeight] = useState(String(heightCm));
  const [editWeight, setEditWeight] = useState(String(weightKg));
  const [editGoal, setEditGoal] = useState<GoalKey>(goal);
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [historyMonthOffset, setHistoryMonthOffset] = useState(0);
  const [historyWorkouts, setHistoryWorkouts] = useState<Workout[]>([]);
  const [historyDietLogs, setHistoryDietLogs] = useState<DietLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { totalVolumeKg, weekStreak, weightEntries, calendarDays, loading, error, refetch } = useProfileStats();

  const handleOpenEdit = () => {
    setEditHeight(String(heightCm));
    setEditWeight(String(weightKg));
    setEditGoal(goal);
    setEditModalVisible(true);
  };

  const handleSaveStats = async () => {
    const h = parseFloat(editHeight);
    const w = parseFloat(editWeight);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for height and weight.');
      return;
    }
    setIsSaving(true);
    const res = await updatePhysicalStats(h, w, editGoal);
    setIsSaving(false);
    if (res?.message) {
      Alert.alert('Error', res.message);
    } else {
      setEditModalVisible(false);
      refetch();
    }
  };

  const handleSignOut = () => {
    setSignOutModalVisible(true);
  };

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const [workouts, dietLogs] = await Promise.all([fetchWorkouts(), fetchDietLogs()]);
        if (cancelled) return;
        setHistoryWorkouts(workouts);
        setHistoryDietLogs(dietLogs);
      } catch (err: unknown) {
        if (!cancelled) {
          setHistoryError(err instanceof Error ? err.message : 'Failed to load history');
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const monthDate = addMonths(startOfMonth(new Date()), historyMonthOffset);
    setSelectedHistoryDate(format(monthDate, 'yyyy-MM-dd'));
  }, [historyMonthOffset]);

  const historyMonthDate = useMemo(
    () => addMonths(startOfMonth(new Date()), historyMonthOffset),
    [historyMonthOffset],
  );

  const historyDays = useMemo(() => {
    const monthStart = startOfMonth(historyMonthDate);
    const totalDays = getDaysInMonth(historyMonthDate);
    const workoutDates = new Set(historyWorkouts.map((workout) => workout.performed_at.split('T')[0]));
    const dietDates = new Set(historyDietLogs.map((diet) => diet.logged_at.split('T')[0]));

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
    const workouts = historyWorkouts.filter((workout) => workout.performed_at.startsWith(selectedHistoryDate));
    const meals = historyDietLogs.filter((diet) => diet.logged_at.startsWith(selectedHistoryDate));
    return {
      workouts,
      meals,
      sleep: null as null,
      water: null as null,
    };
  }, [historyDietLogs, historyWorkouts, selectedHistoryDate]);

  const handleOpenHistory = () => {
    setHistoryOpen(true);
  };

  const handleSelectHistoryMonth = (direction: 'previous' | 'next') => {
    setHistoryMonthOffset((current) => current + (direction === 'previous' ? -1 : 1));
  };

  const handleSelectHistoryDate = (dateStr: string) => {
    setSelectedHistoryDate(dateStr);
  };

  const historyMonthLabel = format(historyMonthDate, 'MMMM yyyy');

  const historyWeekdayOffset = getDay(historyMonthDate);

  const historyHasAnyActivity = historyDays.some((day) => day.hasActivity);

  const historySelectedDateLabel = format(parseISO(selectedHistoryDate), 'EEEE, MMM d');

  const historySummaryEmpty =
    selectedHistorySummary.workouts.length === 0 && selectedHistorySummary.meals.length === 0;

  const handleViewAll = () => {
    setHistoryOpen(true);
  };

  const renderGoalIcon = (goalKey: GoalKey) => {
    switch (goalKey) {
      case 'build_muscle':
        return <Dumbbell size={14} color={Colors.primaryContainer} style={styles.badgeIcon} />;
      case 'lose_weight':
        return <TrendingDown size={14} color={Colors.primaryContainer} style={styles.badgeIcon} />;
      default:
        return <Activity size={14} color={Colors.primaryContainer} style={styles.badgeIcon} />;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar & Name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{fullName}</Text>
        <Text style={styles.userEmail}>{email}</Text>
        <View style={styles.goalBadge}>
          <View style={styles.goalBadgeContent}>
            {renderGoalIcon(goal)}
            <Text style={styles.goalBadgeText}>{GOAL_LABELS[goal]}</Text>
          </View>
        </View>
      </View>
      {/* Error Banner — only shows if data fetch fails */}
      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Total Volume + Week Streak */}
      <StatsRow
        totalVolumeKg={totalVolumeKg}
        weekStreak={weekStreak}
        loading={loading}
      />

      {/* Weight Trend Chart */}
      <WeightTrendCard
        entries={weightEntries}
        loading={loading}
      />

      {/* Training Calendar */}
      <TrainingCalendar
        days={calendarDays}
        loading={loading}
        setActiveTab={setActiveTab}
        onViewAll={handleViewAll}
      />

      {isHistoryOpen && (
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Full Activity History</Text>
            <View style={styles.historyNavRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectHistoryMonth('previous')}
                style={styles.historyNavButton}
              >
                <ChevronLeft size={16} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.historyMonthLabel}>{historyMonthLabel}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectHistoryMonth('next')}
                style={styles.historyNavButton}
              >
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {historyLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: spacing.base }} />
          ) : historyError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{historyError}</Text>
            </View>
          ) : (
            <>
              <View style={styles.historyGrid}>
                {Array.from({ length: historyWeekdayOffset }).map((_, index) => (
                  <View key={`blank-${index}`} style={styles.historyDayPlaceholder} />
                ))}
                {historyDays.map((day) => (
                  <TouchableOpacity
                    key={day.dateStr}
                    style={[
                      styles.historyDayCard,
                      day.dateStr === selectedHistoryDate && styles.historyDayCardActive,
                    ]}
                    onPress={() => handleSelectHistoryDate(day.dateStr)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.historyDayNumber,
                      day.dateStr === selectedHistoryDate && styles.historyDayNumberActive,
                    ]}
                    >
                      {day.dayNumber}
                    </Text>
                    {day.hasActivity && <View style={styles.historyDot} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.historySummaryCard}>
                <Text style={styles.historySummaryTitle}>{historySelectedDateLabel}</Text>
                {historySummaryEmpty ? (
                  <Text style={styles.historyEmptyText}>No recorded activity for this date.</Text>
                ) : (
                  <>
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>Food Intake</Text>
                      {selectedHistorySummary.meals.length > 0 ? (
                        selectedHistorySummary.meals.map((meal) => (
                          <Text key={meal.id} style={styles.historyLineItem}>• {meal.meal_name}</Text>
                        ))
                      ) : (
                        <Text style={styles.historyMissingText}>No meals recorded</Text>
                      )}
                    </View>
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>Workout Sessions</Text>
                      {selectedHistorySummary.workouts.length > 0 ? (
                        selectedHistorySummary.workouts.map((workout) => (
                          <Text key={workout.id} style={styles.historyLineItem}>• {workout.name}</Text>
                        ))
                      ) : (
                        <Text style={styles.historyMissingText}>No workouts recorded</Text>
                      )}
                    </View>
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>Sleep Data</Text>
                      <Text style={styles.historyMissingText}>Not tracked for this date</Text>
                    </View>
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>Water Intake</Text>
                      <Text style={styles.historyMissingText}>Not tracked for this date</Text>
                    </View>
                  </>
                )}
                {!historyHasAnyActivity && (
                  <View style={styles.historyMonthEmpty}>
                    <Text style={styles.historyEmptyText}>No recorded activity in this month yet.</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      )}

      {/* Physical Stats Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Physical Stats</Text>
          <TouchableOpacity
            onPress={handleOpenEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit physical stats"
            hitSlop={8}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Height</Text>
            <Text style={styles.statValue}>{heightCm} cm</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Weight</Text>
            <Text style={styles.statValue}>{weightKg} kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>{GOAL_LABELS[goal]}</Text>
          </View>
        </View>
      </View>

      {/* TDEE Calculator Button Card */}
      <TouchableOpacity style={styles.tdeeCard} activeOpacity={0.8} onPress={() => setTDEEModalVisible(true)}>
        <View style={styles.tdeeCardContent}>
          <View style={styles.tdeeIconWrapper}>
            <Activity size={18} color={Colors.primary} />
          </View>
          <View style={styles.tdeeTextGroup}>
            <Text style={styles.tdeeTitle}>TDEE Calculator</Text>
            <Text style={styles.tdeeSubtitle}>Maintenance calories & weight loss plans</Text>
          </View>
          <ChevronRight size={18} color={Colors.outline} />
        </View>
      </TouchableOpacity>

      {/* Daily Targets Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Targets</Text>
        <View style={styles.targetsGrid}>
          <TargetItem label="Calories" value={String(targets.calories)} unit="kcal" color={Colors.primary} />
          <TargetItem label="Protein" value={String(targets.protein)} unit="g" color={Colors.proteinAccent} />
          <TargetItem label="Carbs" value={String(targets.carbs)} unit="g" color={Colors.tertiaryFixedDim} />
          <TargetItem label="Fats" value={String(targets.fats)} unit="g" color={Colors.secondaryContainer} />
        </View>
      </View>

      {/* App Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About Gemi</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>AI Model</Text>
          <Text style={styles.infoValue}>On-device (local)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Privacy</Text>
          <View style={styles.infoValueRow}>
            <Lock size={12} color={Colors.outline} style={{ marginRight: 4 }} />
            <Text style={styles.infoValue}>Data stays on device</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
      </View>

      {/* Privacy & AI Notice */}
      <View style={styles.aiNotice}>
        <ShieldCheck size={20} color={Colors.primary} style={styles.aiNoticeIcon} />
        <Text style={styles.aiNoticeText}>
          Gemi uses an on-device AI model. Your workout data, diet logs, and generated insights stay on your phone.
        </Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleSignOut}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <View style={styles.signOutBtnContent}>
          <LogOut size={16} color={Colors.error} style={{ marginRight: 6 }} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </View>
      </TouchableOpacity>

      {/* Edit Stats Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Physical Stats</Text>
            
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={editHeight}
              onChangeText={setEditHeight}
              keyboardType="numeric"
              accessibilityLabel="Height in centimeters"
            />

            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="numeric"
              accessibilityLabel="Weight in kilograms"
            />

            <Text style={styles.inputLabel}>Goal</Text>
            <View style={styles.goalRow}>
              {(['lose_weight', 'build_muscle', 'maintain'] as GoalKey[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.goalChoice, editGoal === g && styles.goalChoiceActive]}
                  onPress={() => setEditGoal(g)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${GOAL_LABELS[g]} goal`}
                  accessibilityState={{ selected: editGoal === g }}
                >
                  <Text style={[styles.goalChoiceText, editGoal === g && styles.goalChoiceTextActive]}>
                    {GOAL_LABELS[g]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing stats"
                accessibilityState={{ disabled: isSaving }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveStats}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Save physical stats"
                accessibilityState={{ disabled: isSaving }}
              >
                <Text style={styles.modalSaveText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal visible={isSignOutModalVisible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmIconContainer}>
              <LogOut size={24} color={Colors.error} />
            </View>
            <Text style={styles.confirmTitle}>Sign Out</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to sign out? You'll need to log in again to access your workouts and diet dashboard.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setSignOutModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel sign out"
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => {
                  setSignOutModalVisible(false);
                  onSignOut();
                }}
                accessibilityRole="button"
                accessibilityLabel="Confirm sign out"
              >
                <Text style={styles.confirmDeleteText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TDEE Calculator Modal */}
      <Modal visible={isTDEEModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>TDEE Calculator</Text>
              <TouchableOpacity onPress={() => setTDEEModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <TDEECalculator />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function TargetItem({ label, value, unit, color }: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.targetItem}>
      <Text style={[styles.targetValue, { color }]}>{value}</Text>
      <Text style={styles.targetUnit}>{unit}</Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl * 2,
    width: '100%',
    maxWidth: layout.modalMaxWidth,
    alignSelf: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: Colors.onPrimary,
    fontSize: typography.xxl,
    fontWeight: fontWeight.bold,
  },
  userName: {
    fontSize: typography.xl,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginBottom: spacing.md,
  },
  goalBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    minHeight: 36,
    justifyContent: 'center',
  },
  goalBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    marginRight: 6,
  },
  goalBadgeText: {
    color: Colors.primaryContainer,
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
  },
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
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  targetsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetItem: {
    alignItems: 'center',
    flex: 1,
  },
  targetValue: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
  },
  targetUnit: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 1,
  },
  targetLabel: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  infoLabel: {
    fontSize: typography.sm,
    color: Colors.outline,
  },
  infoValue: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.medium,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiNotice: {
    flexDirection: 'row',
    backgroundColor: '#eff4ff',
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.12)',
  },
  aiNoticeIcon: {
    marginTop: 2,
  },
  aiNoticeText: {
    flex: 1,
    fontSize: typography.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  signOutBtn: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginBottom: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  signOutBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: Colors.error,
    fontSize: typography.base,
    fontWeight: fontWeight.semiBold,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editBtnText: {
    color: Colors.primary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  tdeeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  tdeeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tdeeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  tdeeTextGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  tdeeTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  tdeeSubtitle: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: spacing.xs,
  },
  historyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  historyNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyNavButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMonthLabel: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.medium,
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  historyDayPlaceholder: {
    width: 44,
    height: 44,
  },
  historyDayCard: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDayCardActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: Colors.primary,
  },
  historyDayNumber: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  historyDayNumberActive: {
    color: Colors.primary,
  },
  historyDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
    marginTop: spacing.xs,
  },
  historySummaryCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.base,
  },
  historySummaryTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  historySection: {
    marginTop: spacing.sm,
  },
  historySectionTitle: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  historyLineItem: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  historyMissingText: {
    fontSize: typography.sm,
    color: Colors.outline,
  },
  historyEmptyText: {
    fontSize: typography.sm,
    color: Colors.outline,
    textAlign: 'center',
  },
  historyMonthEmpty: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(190, 200, 210, 0.05)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.outline,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: Colors.onSurface,
    backgroundColor: Colors.background,
    minHeight: layout.minTouchTarget,
  },
  goalRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  goalChoice: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  goalChoiceActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  goalChoiceText: {
    fontSize: typography.xs,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  goalChoiceTextActive: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalCloseText: {
    color: Colors.primary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: Colors.outline,
    fontWeight: fontWeight.bold,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  modalSaveText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  confirmContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  confirmIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  confirmMessage: {
    fontSize: typography.sm,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.4)',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  confirmCancelText: {
    color: Colors.outline,
    fontWeight: fontWeight.bold,
    fontSize: typography.sm,
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: Colors.error,
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  confirmDeleteText: {
    color: '#ffffff',
    fontWeight: fontWeight.bold,
    fontSize: typography.sm,
  },
});
