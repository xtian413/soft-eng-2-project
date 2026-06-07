import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, KeyboardAvoidingView } from 'react-native';
import { Colors } from '@/theme/colors';
import { useAuthStore } from '@/store/authStore';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import { type GoalKey, type MacroTargets, type ActivityLevel, GOAL_LABELS, MACRO_PRESETS, type MacroRatios } from '@/screens/dashboard/types';
import { calculateMacros, calculateTDEE } from '@/utils/macroCalculator';
import { Dumbbell, TrendingDown, Activity, LogOut } from 'lucide-react-native';
import { useProfileStats } from './hooks/useProfileStats';
import { StatsRow } from './subcomponents/StatsRow';
import { WeightTrendCard } from './subcomponents/WeightTrendCard';
import { TrainingCalendar } from './subcomponents/TrainingCalendar';
import { fetchWorkouts, type Workout } from '@/api/workoutApi';
import { fetchDietLogs, type DietLog } from '@/api/dietApi';
import { DateDetailSheet } from './subcomponents/DateDetailSheet';

interface ProfileTabProps {
  fullName: string;
  email: string;
  goal: GoalKey;
  heightCm: number;
  weightKg: number;
  targets: MacroTargets;
  onSignOut: () => void;
}

function getDefaultMacroPercentages(
  weightKg: number,
  heightCm: number,
  gender: 'male' | 'female',
  goal: GoalKey,
  age: number,
  activityLevel: ActivityLevel
) {
  const targets = calculateMacros(weightKg, heightCm, gender, goal, age, activityLevel, null, null, null);
  const pCal = targets.protein * 4;
  const fCal = targets.fats * 9;
  const cCal = targets.carbs * 4;
  const totalCal = pCal + fCal + cCal;

  if (totalCal === 0) {
    return { proteinPct: 30, carbsPct: 40, fatsPct: 30 };
  }

  let pPct = Math.round((pCal / totalCal) * 100);
  let fPct = Math.round((fCal / totalCal) * 100);
  let cPct = 100 - pPct - fPct;

  return { proteinPct: pPct, carbsPct: cPct, fatsPct: fPct };
}

export function ProfileTab({ fullName, email, goal, heightCm, weightKg, targets, onSignOut }: ProfileTabProps) {
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const { updatePhysicalStats, profile } = useAuthStore();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isSignOutModalVisible, setSignOutModalVisible] = useState(false);
  const [editHeight, setEditHeight] = useState(String(heightCm));
  const [editWeight, setEditWeight] = useState(String(weightKg));
  const [editGoal, setEditGoal] = useState<GoalKey>(goal);
  
  // Expanded fields
  const [editAge, setEditAge] = useState(profile?.age ? String(profile.age) : '22');
  const [editGender, setEditGender] = useState<'male' | 'female'>(profile?.gender || 'male');
  const [editActivityLevel, setEditActivityLevel] = useState<ActivityLevel>(profile?.activityLevel || 'lightly_active');
  const [editTargetWeight, setEditTargetWeight] = useState(profile?.targetWeightKg ? String(profile.targetWeightKg) : String(weightKg));
  
  // Custom Macro slider state
  const [useCustomMacros, setUseCustomMacros] = useState(false);
  const [editProteinPct, setEditProteinPct] = useState(30);
  const [editCarbsPct, setEditCarbsPct] = useState(40);
  const [editFatsPct, setEditFatsPct] = useState(30);

  const [isSaving, setIsSaving] = useState(false);
  const [historyWorkouts, setHistoryWorkouts] = useState<Workout[]>([]);
  const [historyDietLogs, setHistoryDietLogs] = useState<DietLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDateSheetVisible, setIsDateSheetVisible] = useState(false);

  const { totalVolumeKg, weekStreak, weightEntries, calendarDays, loading, error, refetch } = useProfileStats();

  // Calorie & TDEE Calculations for the Visualizer
  const genderVal = profile?.gender || 'male';
  const ageVal = profile?.age || 22;
  const activityLevelVal = profile?.activityLevel || 'lightly_active';

  // 1. BMR & TDEE via shared calculator (Mifflin-St Jeor)
  const { bmr, tdee } = calculateTDEE(weightKg, heightCm, ageVal, genderVal, activityLevelVal);
  const targetCalories = targets.calories;

  // Live preview of macro grams based on current edit form values (for the edit modal)
  const previewMacroGrams = useMemo(() => {
    const h = parseFloat(editHeight) || heightCm;
    const w = parseFloat(editWeight) || weightKg;
    const a = parseInt(editAge, 10) || ageVal;
    const previewTargets = calculateMacros(w, h, editGender, editGoal, a, editActivityLevel, null, null, null);
    const cal = previewTargets.calories;
    return {
      calories: cal,
      proteinG: Math.round((cal * (editProteinPct / 100)) / 4),
      carbsG: Math.round((cal * (editCarbsPct / 100)) / 4),
      fatsG: Math.round((cal * (editFatsPct / 100)) / 9),
    };
  }, [editHeight, editWeight, editAge, editGender, editGoal, editActivityLevel, editProteinPct, editCarbsPct, editFatsPct, heightCm, weightKg, ageVal]);

  // Calorie range for the progress bar: from [BMR - 300] to [TDEE + 600]
  const visualMin = Math.max(800, bmr - 300);
  const visualMax = tdee + 600;
  const visualRange = visualMax - visualMin;

  const targetPct = Math.min(100, Math.max(0, ((targetCalories - visualMin) / visualRange) * 100));
  const tdeePct = Math.min(100, Math.max(0, ((tdee - visualMin) / visualRange) * 100));

  // Weekly fat loss/gain visualization calculations
  const calorieDiff = tdee - targetCalories;
  const isLossGoal = goal === 'moderate_cut' || goal === 'aggressive_cut';
  const isGainGoal = goal === 'lean_bulk';

  const weeklyWeightChangeLbs = Math.abs(calorieDiff) / 500;
  const targetWeight = profile?.targetWeightKg || weightKg;
  const currentWeight = weightKg;
  const weightDiffKg = Math.abs(currentWeight - targetWeight);
  const weightDiffLbs = weightDiffKg * 2.20462;

  let timeToTargetWeeks: number | null = null;
  if (weeklyWeightChangeLbs > 0.01 && weightDiffKg > 0.1) {
    const expectsToLose = currentWeight > targetWeight;
    const expectsToGain = currentWeight < targetWeight;
    const isLosing = calorieDiff > 0;
    const isGaining = calorieDiff < 0;

    if ((expectsToLose && isLosing) || (expectsToGain && isGaining)) {
      timeToTargetWeeks = weightDiffLbs / weeklyWeightChangeLbs;
    }
  }

  let goalColor = '#10b981'; // Green for maintain
  let goalTitle = 'Maintenance';
  let goalDescription = `Your calorie goal matches your maintenance level of ${tdee} kcal.`;

  if (goal === 'moderate_cut' || goal === 'aggressive_cut') {
    goalColor = '#f97316'; // Orange for deficit
    goalTitle = `Calorie Deficit (-${tdee - targetCalories} kcal)`;
    goalDescription = `Your daily target is ${targetCalories} kcal, which creates a calorie deficit of ${tdee - targetCalories} kcal below your maintenance level (${tdee} kcal) to promote weight loss.`;
  } else if (goal === 'lean_bulk') {
    goalColor = '#3b82f6'; // Blue for surplus
    goalTitle = `Calorie Surplus (+${targetCalories - tdee} kcal)`;
    goalDescription = `Your daily target is ${targetCalories} kcal, which creates a calorie surplus of ${targetCalories - tdee} kcal above your maintenance level (${tdee} kcal) to promote muscle growth.`;
  }

  const handleOpenEdit = () => {
    setEditHeight(String(heightCm));
    setEditWeight(String(weightKg));
    setEditGoal(goal);
    setEditAge(profile?.age ? String(profile.age) : '22');
    setEditGender(profile?.gender || 'male');
    setEditActivityLevel(profile?.activityLevel || 'lightly_active');
    setEditTargetWeight(profile?.targetWeightKg ? String(profile.targetWeightKg) : String(weightKg));
    
    const localProfile = profile;
    const hasCustom =
      !!localProfile &&
      localProfile.macroProteinPct !== null &&
      localProfile.macroCarbsPct !== null &&
      localProfile.macroFatsPct !== null;

    setUseCustomMacros(hasCustom);
    if (hasCustom && localProfile) {
      setEditProteinPct(localProfile.macroProteinPct!);
      setEditCarbsPct(localProfile.macroCarbsPct!);
      setEditFatsPct(localProfile.macroFatsPct!);
    } else {
      const defaults = getDefaultMacroPercentages(
        weightKg,
        heightCm,
        localProfile?.gender || 'male',
        goal,
        localProfile?.age || 22,
        localProfile?.activityLevel || 'lightly_active'
      );
      setEditProteinPct(defaults.proteinPct);
      setEditCarbsPct(defaults.carbsPct);
      setEditFatsPct(defaults.fatsPct);
    }
    setEditModalVisible(true);
  };

  const handleSaveStats = async () => {
    const h = parseFloat(editHeight);
    const w = parseFloat(editWeight);
    const a = parseInt(editAge, 10);
    const tw = parseFloat(editTargetWeight);

    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for height and weight.');
      return;
    }

    if (isNaN(a) || a < 1 || a > 120) {
      Alert.alert('Invalid Input', 'Please enter a valid age between 1 and 120.');
      return;
    }

    if (isNaN(tw) || tw <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid target weight.');
      return;
    }

    if (useCustomMacros) {
      const sum = editProteinPct + editCarbsPct + editFatsPct;
      if (sum !== 100) {
        Alert.alert('Invalid Macros', `Macro percentages must sum to 100% (currently ${sum}%).`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await updatePhysicalStats(
        h,
        w,
        editGoal,
        editGender,
        a,
        editActivityLevel,
        tw,
        useCustomMacros ? editProteinPct : null,
        useCustomMacros ? editCarbsPct : null,
        useCustomMacros ? editFatsPct : null
      );
      setIsSaving(false);

      if (res?.message) {
        Alert.alert('Error', res.message);
      } else {
        setEditModalVisible(false);
        Alert.alert('Profile Updated', 'Your stats and macro targets have been saved.');
        refetch();
      }
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
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

  const renderGoalIcon = (goalKey: GoalKey) => {
    switch (goalKey) {
      case 'lean_bulk':
        return <Dumbbell size={14} color={Colors.primaryContainer} style={styles.badgeIcon} />;
      case 'moderate_cut':
      case 'aggressive_cut':
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

      {/* Training Calendar — expands in-place to full month grid */}
      <TrainingCalendar
        days={calendarDays}
        loading={loading}
        historyWorkouts={historyWorkouts}
        historyDietLogs={historyDietLogs}
        historyLoading={historyLoading}
        historyError={historyError}
        onDateSelect={(dateStr) => {
          setSelectedDate(dateStr);
          setIsDateSheetVisible(true);
        }}
      />


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
          <View style={styles.statsGridRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Height</Text>
              <Text style={styles.statValue}>{heightCm} cm</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>{weightKg} kg</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>{profile?.age || 22} y/o</Text>
            </View>
          </View>
          <View style={[styles.statsGridRow, { marginTop: spacing.md }]}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Target Wt</Text>
              <Text style={styles.statValue}>{profile?.targetWeightKg || weightKg} kg</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Activity</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {profile?.activityLevel === 'sedentary' ? 'Sedentary' :
                 profile?.activityLevel === 'lightly_active' ? 'Light' :
                 profile?.activityLevel === 'moderately_active' ? 'Moderate' :
                 profile?.activityLevel === 'very_active' ? 'Very Act.' :
                 profile?.activityLevel === 'extremely_active' ? 'Extreme' : 'Light'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Goal</Text>
              <Text style={styles.statValue} numberOfLines={1}>{GOAL_LABELS[goal]}</Text>
            </View>
          </View>
        </View>

        {/* --- Calorie & Goal Visualizer --- */}
        <View style={styles.visualizerDivider} />
        
        <View style={styles.visualizerHeader}>
          <View>
            <Text style={styles.visualizerTitle}>Calorie & Goal Visualizer</Text>
            <Text style={styles.visualizerSubtitle}>Based on physical stats & active goal</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: goalColor + '15' }]}>
            <Text style={[styles.badgeText, { color: goalColor }]}>{goalTitle}</Text>
          </View>
        </View>

        <View style={styles.barWrapper}>
          <View style={styles.trackContainer}>
            <View style={[styles.trackFill, { width: `${targetPct}%`, backgroundColor: goalColor }]} />
          </View>
          <View style={[styles.tdeeMarkerLine, { left: `${tdeePct}%` }]} />
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendColumn}>
            <Text style={styles.legendLabel}>BMR</Text>
            <Text style={styles.legendVal}>{bmr} kcal</Text>
          </View>
          <View style={[styles.legendColumn, { alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.tdeeIndicatorDot} />
              <Text style={styles.legendLabel}>Maintenance (TDEE)</Text>
            </View>
            <Text style={styles.legendVal}>{tdee} kcal</Text>
          </View>
          <View style={[styles.legendColumn, { alignItems: 'flex-end' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.goalIndicatorDot, { backgroundColor: goalColor }]} />
              <Text style={styles.legendLabel}>Daily Target</Text>
            </View>
            <Text style={[styles.legendVal, { color: goalColor }]}>{targetCalories} kcal</Text>
          </View>
        </View>

        <Text style={styles.descText}>{goalDescription}</Text>

        {/* --- Weekly Weight & Fat Loss Estimation --- */}
        {(isLossGoal || isGainGoal) && (
          <View style={styles.estimationContainer}>
            <View style={styles.estimationRow}>
              <View style={styles.estimationItem}>
                <Text style={styles.estimationLabel}>Est. Weekly Change</Text>
                <Text style={[styles.estimationValue, { color: goalColor }]}>
                  {calorieDiff > 0 ? '−' : '+'}{weeklyWeightChangeLbs.toFixed(2)} lbs
                  <Text style={styles.estimationUnit}> / week</Text>
                </Text>
              </View>
              {timeToTargetWeeks !== null && (
                <View style={[styles.estimationItem, { alignItems: 'flex-end' }]}>
                  <Text style={styles.estimationLabel}>Time to Target ({targetWeight} kg)</Text>
                  <Text style={styles.estimationValue}>
                    ~{Math.ceil(timeToTargetWeeks)}
                    <Text style={styles.estimationUnit}> {Math.ceil(timeToTargetWeeks) === 1 ? 'week' : 'weeks'}</Text>
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%', width: '100%', maxWidth: layout.modalMaxWidth }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 }}
              >
                <Text style={styles.modalTitle}>Edit Physical Stats</Text>
                
                <View style={styles.rowInputGroup}>
                  <View style={styles.inputBlock}>
                    <Text style={styles.inputLabel}>Height (cm)</Text>
                    <TextInput
                      style={styles.input}
                      value={editHeight}
                      onChangeText={setEditHeight}
                      keyboardType="numeric"
                      accessibilityLabel="Height in centimeters"
                    />
                  </View>
                  <View style={styles.inputBlock}>
                    <Text style={styles.inputLabel}>Weight (kg)</Text>
                    <TextInput
                      style={styles.input}
                      value={editWeight}
                      onChangeText={setEditWeight}
                      keyboardType="numeric"
                      accessibilityLabel="Weight in kilograms"
                    />
                  </View>
                </View>

                <View style={styles.rowInputGroup}>
                  <View style={styles.inputBlock}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput
                      style={styles.input}
                      value={editAge}
                      onChangeText={setEditAge}
                      keyboardType="numeric"
                      accessibilityLabel="Age in years"
                    />
                  </View>
                  <View style={styles.inputBlock}>
                    <Text style={styles.inputLabel}>Target Wt (kg)</Text>
                    <TextInput
                      style={styles.input}
                      value={editTargetWeight}
                      onChangeText={setEditTargetWeight}
                      keyboardType="numeric"
                      accessibilityLabel="Target weight in kilograms"
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.toggleRowDouble}>
                  {(['male', 'female'] as const).map((option) => (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.8}
                      style={[styles.toggleButton, editGender === option && styles.toggleButtonActive]}
                      onPress={() => setEditGender(option)}
                    >
                      <Text style={[styles.toggleButtonText, editGender === option && styles.toggleButtonTextActive]}>
                        {option === 'male' ? 'Male' : 'Female'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Goal</Text>
                <View style={styles.goalGrid}>
                  {(['moderate_cut', 'aggressive_cut', 'maintain', 'lean_bulk'] as GoalKey[]).map((g) => (
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

                <Text style={styles.inputLabel}>Activity Level</Text>
                <View style={styles.activityGrid}>
                  {[
                    { key: 'sedentary', label: 'Sedentary', subtitle: 'Little/no exercise' },
                    { key: 'lightly_active', label: 'Lightly Active', subtitle: '1-3 days/week' },
                    { key: 'moderately_active', label: 'Moderately Active', subtitle: '3-5 days/week' },
                    { key: 'very_active', label: 'Very Active', subtitle: '6-7 days/week' },
                    { key: 'extremely_active', label: 'Extremely Active', subtitle: 'Intense daily' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.8}
                      style={[styles.activityChoice, editActivityLevel === option.key && styles.activityChoiceActive]}
                      onPress={() => setEditActivityLevel(option.key as ActivityLevel)}
                    >
                      <Text style={[styles.activityChoiceTitle, editActivityLevel === option.key && styles.activityChoiceTitleActive]}>
                        {option.label}
                      </Text>
                      <Text style={styles.activityChoiceSubtitle}>{option.subtitle}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Customize Macros Section */}
                <View style={styles.customizeMacrosHeader}>
                  <Text style={styles.inputLabel}>Custom Calorie/Macro Goals</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const nextCustom = !useCustomMacros;
                      setUseCustomMacros(nextCustom);
                      if (nextCustom) {
                        const defaults = getDefaultMacroPercentages(
                          parseFloat(editWeight) || weightKg,
                          parseFloat(editHeight) || heightCm,
                          editGender,
                          editGoal,
                          parseInt(editAge, 10) || 22,
                          editActivityLevel
                        );
                        setEditProteinPct(defaults.proteinPct);
                        setEditCarbsPct(defaults.carbsPct);
                        setEditFatsPct(defaults.fatsPct);
                      }
                    }}
                    style={styles.toggleTextLink}
                  >
                    <Text style={styles.toggleTextLinkVal}>
                      {useCustomMacros ? 'Use Auto-Calculated' : 'Customize Ratios'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {useCustomMacros ? (
                  <View style={styles.macrosContainer}>
                    {/* Macro Ratio Presets */}
                    <Text style={styles.presetsLabel}>Quick Presets</Text>
                    <View style={styles.presetsRow}>
                      {MACRO_PRESETS.map((preset) => {
                        const isActive =
                          editProteinPct === preset.ratios.proteinPct &&
                          editCarbsPct === preset.ratios.carbsPct &&
                          editFatsPct === preset.ratios.fatsPct;
                        return (
                          <TouchableOpacity
                            key={preset.key}
                            style={[styles.presetChip, isActive && styles.presetChipActive]}
                            onPress={() => {
                              setEditProteinPct(preset.ratios.proteinPct);
                              setEditCarbsPct(preset.ratios.carbsPct);
                              setEditFatsPct(preset.ratios.fatsPct);
                            }}
                            activeOpacity={0.75}
                            accessibilityRole="button"
                            accessibilityLabel={`Apply ${preset.label} preset: ${preset.description}`}
                          >
                            <Text style={[styles.presetChipLabel, isActive && styles.presetChipLabelActive]}>
                              {preset.label}
                            </Text>
                            <Text style={[styles.presetChipDesc, isActive && styles.presetChipDescActive]}>
                              {preset.description}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {/* Segmented Color Bar */}
                    <View style={styles.segmentedBar}>
                      <View style={[styles.barSegment, { flex: editProteinPct, backgroundColor: '#0284c7' }]} />
                      <View style={[styles.barSegment, { flex: editCarbsPct, backgroundColor: '#10b981' }]} />
                      <View style={[styles.barSegment, { flex: editFatsPct, backgroundColor: '#f59e0b' }]} />
                    </View>

                    {/* Macro Adjustment Rows */}
                    <MacroAdjusterRow
                      label="Protein"
                      value={editProteinPct}
                      grams={previewMacroGrams.proteinG}
                      color="#0284c7"
                      onDecrease={() => setEditProteinPct(Math.max(0, editProteinPct - 5))}
                      onIncrease={() => setEditProteinPct(Math.min(100, editProteinPct + 5))}
                    />
                    <MacroAdjusterRow
                      label="Carbs"
                      value={editCarbsPct}
                      grams={previewMacroGrams.carbsG}
                      color="#10b981"
                      onDecrease={() => setEditCarbsPct(Math.max(0, editCarbsPct - 5))}
                      onIncrease={() => setEditCarbsPct(Math.min(100, editCarbsPct + 5))}
                    />
                    <MacroAdjusterRow
                      label="Fats"
                      value={editFatsPct}
                      grams={previewMacroGrams.fatsG}
                      color="#f59e0b"
                      onDecrease={() => setEditFatsPct(Math.max(0, editFatsPct - 5))}
                      onIncrease={() => setEditFatsPct(Math.min(100, editFatsPct + 5))}
                    />

                    <View style={styles.macroTotalRow}>
                      <Text style={[styles.macroTotalText, (editProteinPct + editCarbsPct + editFatsPct) !== 100 && styles.macroTotalError]}>
                        Total: {editProteinPct + editCarbsPct + editFatsPct}% { (editProteinPct + editCarbsPct + editFatsPct) === 100 ? '(Valid)' : '(Must sum to 100%)' }
                      </Text>
                      <TouchableOpacity
                        style={styles.resetMacrosBtn}
                        onPress={() => {
                          const defaults = getDefaultMacroPercentages(
                            parseFloat(editWeight) || weightKg,
                            parseFloat(editHeight) || heightCm,
                            editGender,
                            editGoal,
                            parseInt(editAge, 10) || 22,
                            editActivityLevel
                          );
                          setEditProteinPct(defaults.proteinPct);
                          setEditCarbsPct(defaults.carbsPct);
                          setEditFatsPct(defaults.fatsPct);
                        }}
                      >
                        <Text style={styles.resetMacrosBtnText}>Optimal (0.8g/lb protein)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.autoMacrosText}>
                    Macros will be automatically calculated based on Mifflin-St Jeor formulas targeting 0.8g protein per lb of body weight.
                  </Text>
                )}

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
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Detail Sheet — rich food/lift history for a selected date */}
      <DateDetailSheet
        visible={isDateSheetVisible}
        date={selectedDate ?? new Date().toISOString().split('T')[0]}
        userId={useAuthStore.getState().user?.id ?? null}
        targets={targets}
        onClose={() => {
          setIsDateSheetVisible(false);
          setSelectedDate(null);
        }}
      />

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

function MacroAdjusterRow({
  label,
  value,
  grams,
  color,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  grams: number;
  color: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.adjusterRow}>
      <View style={styles.adjusterLabelGroup}>
        <View style={[styles.colorIndicator, { backgroundColor: color }]} />
        <Text style={styles.adjusterLabel}>{label}</Text>
        <Text style={styles.adjusterGrams}>{grams}g</Text>
      </View>
      <View style={styles.adjusterControlGroup}>
        <TouchableOpacity style={styles.adjusterBtn} onPress={onDecrease}>
          <Text style={styles.adjusterBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.adjusterValue}>{value}%</Text>
        <TouchableOpacity style={styles.adjusterBtn} onPress={onIncrease}>
          <Text style={styles.adjusterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
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
  visualizerDivider: {
    height: 1,
    backgroundColor: 'rgba(190, 200, 210, 0.15)',
    marginVertical: spacing.md,
  },
  visualizerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  visualizerTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  visualizerSubtitle: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  barWrapper: {
    position: 'relative',
    height: 20,
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  trackContainer: {
    height: 8,
    width: '100%',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  tdeeMarkerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2.5,
    backgroundColor: Colors.onSurfaceVariant,
    zIndex: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  legendColumn: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 9,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  legendVal: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  tdeeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.onSurfaceVariant,
    marginRight: 4,
  },
  goalIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  descText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: spacing.base,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  estimationContainer: {
    backgroundColor: 'rgba(120, 140, 160, 0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  estimationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimationItem: {
    flex: 1,
  },
  estimationLabel: {
    fontSize: 9,
    color: Colors.outline,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  estimationValue: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  estimationUnit: {
    fontSize: typography.xs,
    fontWeight: fontWeight.regular,
    color: Colors.onSurfaceVariant,
  },
  statsGrid: {
    flexDirection: 'column',
    backgroundColor: 'rgba(190, 200, 210, 0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
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
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  goalChoice: {
    width: '48%',
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
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  activityChoice: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    marginBottom: spacing.xs,
    justifyContent: 'center',
    minHeight: 52,
  },
  activityChoiceActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  activityChoiceTitle: {
    fontSize: typography.xs,
    color: Colors.onSurface,
    fontWeight: fontWeight.semiBold,
  },
  activityChoiceTitleActive: {
    color: Colors.primary,
  },
  activityChoiceSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.outline,
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
  
  // Custom Macro Styles
  customizeMacrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  toggleTextLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleTextLinkVal: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  macrosContainer: {
    backgroundColor: Colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    marginTop: spacing.xs,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  barSegment: {
    height: '100%',
  },
  adjusterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  adjusterLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  adjusterLabel: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.medium,
  },
  adjusterGrams: {
    fontSize: typography.xs,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.xs,
  },
  adjusterControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adjusterBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  adjusterBtnText: {
    fontSize: typography.base,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  adjusterValue: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
    minWidth: 40,
    textAlign: 'center',
  },
  macroTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.1)',
  },
  macroTotalText: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  macroTotalError: {
    color: Colors.error,
  },
  resetMacrosBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  resetMacrosBtnText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  autoMacrosText: {
    fontSize: typography.xs,
    color: Colors.outline,
    lineHeight: 18,
    marginTop: spacing.xs,
    paddingHorizontal: 4,
  },
  rowInputGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputBlock: {
    flex: 1,
  },
  toggleRowDouble: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  toggleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  toggleButtonText: {
    fontSize: typography.sm,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  toggleButtonTextActive: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },

  // Macro Preset Styles
  presetsLabel: {
    fontSize: 10,
    color: Colors.outline,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  presetChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    backgroundColor: Colors.surface,
    minWidth: '30%',
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  presetChipLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  presetChipLabelActive: {
    color: Colors.primary,
  },
  presetChipDesc: {
    fontSize: 9,
    color: Colors.outline,
    marginTop: 2,
    textAlign: 'center',
  },
  presetChipDescActive: {
    color: Colors.primary,
  },
});
