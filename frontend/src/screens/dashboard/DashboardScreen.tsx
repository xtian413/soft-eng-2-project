import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import { type GoalKey, type FoodLogEntry } from '@/screens/dashboard/types';
import { calculateMacros } from '@/utils/macroCalculator';
import { fetchDietLogs } from '@/api/dietApi';
import {
  localDietLogToFoodLogEntry,
  remoteDietLogToLocalRemoteInput,
} from '@/local/dietLogsMapper';
import { localWorkoutToAiWorkoutLog } from '@/local/workoutsMapper';
import {
  getDietLogsByUserAndDateRange,
  upsertRemoteDietLogForUser,
} from '@/local/repositories/dietLogsRepository';
import { getRecentWorkoutsByUser } from '@/local/repositories/workoutsRepository';
import {
  deleteOldAiInsightsByUser,
  getLatestAiInsightByUser,
  saveAiInsightLocal,
} from '@/local/repositories/aiInsightsRepository';
import { HomeTab } from '@/screens/dashboard/Home/HomeTab';
import { FoodTab } from '@/screens/dashboard/Food/FoodTab';
import { LiftTab } from '@/screens/dashboard/Lift/LiftTab';
import { InsightsTab } from '@/screens/dashboard/Insights/InsightsTab';
import { ProfileTab } from '@/screens/dashboard/Profile/ProfileTab';
import { LayoutDashboard, Utensils, Dumbbell, Sparkles, User } from 'lucide-react-native';
import type { WorkoutLog } from '@/ai/prompts';
import { initializeLfmOnStartup } from '@/ai/lfmInit';
import { generateFitnessInsightResponse, generateInsightChatResponse } from '@/ai/lfmService';
import {
  assessFitnessInsightQuality,
  buildFitnessInsightChatPrompt,
  buildFitnessInsightRepairPrompt,
  buildFitnessInsightPrompt,
  createModelRetryFitnessInsight,
  createLoadingFitnessInsight,
  parseFitnessInsight,
  type FitnessInsight,
  type FitnessInsightInput,
  type FitnessInsightChatMessage,
} from '@/ai/insights/fitnessInsight';
import { buildFitnessInsightSignature } from '@/ai/insights/fitnessInsightCache';
import type { LocalAiInsight } from '@/local/schema';
import { format } from 'date-fns';

type TabType = 'dashboard' | 'food' | 'insights' | 'lift' | 'profile';

const TABS: { key: TabType; label: string }[] = [
  { key: 'dashboard', label: 'Today' },
  { key: 'food', label: 'Food' },
  { key: 'insights', label: 'Insights' },
  { key: 'lift', label: 'Lift' },
  { key: 'profile', label: 'Profile' },
];

function mapLocalAiInsightToFitnessInsight(row: LocalAiInsight): FitnessInsight | null {
  if (
    !row.title ||
    !row.summary ||
    !row.nutrition ||
    !row.training ||
    !row.next_step ||
    !row.confidence
  ) {
    return null;
  }

  return {
    title: row.title,
    summary: row.summary,
    nutrition: row.nutrition,
    training: row.training,
    nextStep: row.next_step,
    confidence: row.confidence,
  };
}

function isSameIsoDay(left: Date, right: Date) {
  return format(left, 'yyyy-MM-dd') === format(right, 'yyyy-MM-dd');
}

export default function DashboardScreen() {
  const { user, signOut, profile, fetchProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [hasLoadedWorkouts, setHasLoadedWorkouts] = useState(false);
  const [fitnessInsight, setFitnessInsight] = useState(createLoadingFitnessInsight);
  const [isFitnessInsightLoading, setFitnessInsightLoading] = useState(false);
  const [fitnessInsightGeneratedAt, setFitnessInsightGeneratedAt] = useState<Date | null>(null);
  const [insightGenerationTick, setInsightGenerationTick] = useState(0);
  const currentInsightSignatureRef = React.useRef<string | null>(null);
  const latestInsightRunIdRef = React.useRef(0);
  const activeInsightRunRef = React.useRef<number | null>(null);
  const activeInsightSignatureRef = React.useRef<string | null>(null);
  const pendingInsightSignatureRef = React.useRef<string | null>(null);
  const latestFitnessInsightSignatureRef = React.useRef<string | null>(null);
  const insightDisplayVersionRef = React.useRef(0);
  const activeChatRunRef = React.useRef(false);
  const displayDateRef = React.useRef(format(new Date(), 'yyyy-MM-dd'));

  const goal: GoalKey = profile?.goal || (user?.user_metadata?.goal as GoalKey) || 'maintain';
  const gender = profile?.gender || 'male';
  const weightKg = profile?.weightKg || 75;
  const heightCm = profile?.heightCm || 180;
  const age = profile?.age || 22;
  const activityLevel = profile?.activityLevel || 'lightly_active';
  const macroProteinPct = profile?.macroProteinPct;
  const macroCarbsPct = profile?.macroCarbsPct;
  const macroFatsPct = profile?.macroFatsPct;

  const targets = useMemo(
    () => calculateMacros(
      weightKg,
      heightCm,
      gender,
      goal,
      age,
      activityLevel,
      macroProteinPct,
      macroCarbsPct,
      macroFatsPct
    ),
    [gender, goal, heightCm, weightKg, age, activityLevel, macroProteinPct, macroCarbsPct, macroFatsPct],
  );

  const fullName = (() => {
    if (profile?.fullName) return profile.fullName;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Athlete';
  })();
  const email = user?.email || '';

  const proteinTotal = Number(foodLogs.reduce((acc, f) => acc + f.protein, 0).toFixed(1));
  const carbsTotal = Number(foodLogs.reduce((acc, f) => acc + f.carbs, 0).toFixed(1));
  const fatsTotal = Number(foodLogs.reduce((acc, f) => acc + f.fat, 0).toFixed(1));
  const caloriesEaten = Math.round(foodLogs.reduce((acc, x) => acc + x.calories, 0));

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const loadTodayLogs = useCallback(async () => {
    if (!user?.id) {
      setFoodLogs([]);
      setIsLoadingLogs(false);
      return;
    }

    setIsLoadingLogs(true);
    // Use the user's local date to determine "today" boundaries,
    // then convert to UTC ISO strings for the SQLite query.
    const localDateStr = format(new Date(), 'yyyy-MM-dd');
    const startOfToday = new Date(`${localDateStr}T00:00:00`).toISOString();
    const endOfToday = new Date(`${localDateStr}T23:59:59.999`).toISOString();

    try {
      const localLogs = await getDietLogsByUserAndDateRange(user.id, startOfToday, endOfToday);
      setFoodLogs(localLogs.map((log) => localDietLogToFoodLogEntry(log)));
    } catch (err) {
      console.error('[Gemi] Failed to load today\'s local food logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }

    try {
      const remoteLogs = await fetchDietLogs(localDateStr);
      await Promise.all(
        remoteLogs.map((log) => upsertRemoteDietLogForUser(user.id, remoteDietLogToLocalRemoteInput(log)))
      );

      const mergedLogs = await getDietLogsByUserAndDateRange(user.id, startOfToday, endOfToday);
      setFoodLogs(mergedLogs.map((log) => localDietLogToFoodLogEntry(log)));
    } catch (err) {
      console.warn('[Gemi] Remote diet-log refresh skipped:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTodayLogs();
  }, [loadTodayLogs]);

  // Midnight refresh: check every 60s if the date has changed
  useEffect(() => {
    const interval = setInterval(() => {
      const now = format(new Date(), 'yyyy-MM-dd');
      if (displayDateRef.current !== now) {
        displayDateRef.current = now;
        loadTodayLogs();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [loadTodayLogs]);

  // Midnight refresh: also check when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const now = format(new Date(), 'yyyy-MM-dd');
        if (displayDateRef.current !== now) {
          displayDateRef.current = now;
          loadTodayLogs();
        }
      }
    });
    return () => subscription.remove();
  }, [loadTodayLogs]);

  const loadWorkoutLogs = useCallback(async () => {
    if (!user?.id) {
      setWorkouts([]);
      setHasLoadedWorkouts(true);
      return;
    }

    try {
      const localWorkouts = await getRecentWorkoutsByUser(user.id, 10);
      setWorkouts(localWorkouts.map((workout) => localWorkoutToAiWorkoutLog(workout)));
    } catch (error) {
      console.warn('[Gemi] Failed to load workout logs for insights:', error);
      setWorkouts([]);
    } finally {
      setHasLoadedWorkouts(true);
    }
  }, [user?.id]);

  useEffect(() => {
    loadWorkoutLogs();
  }, [loadWorkoutLogs]);

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'insights' || activeTab === 'lift') {
      loadWorkoutLogs();
    }
  }, [activeTab, loadWorkoutLogs]);

  const triggerToast = useCallback(
    (msg: string) => {
      setToastMessage(msg);
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.delay(2000),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => setToastMessage(null));
    },
    [toastOpacity],
  );

  const fitnessInsightInput = useMemo<FitnessInsightInput>(
    () => ({
      userName: fullName,
      goal,
      weightKg,
      heightCm,
      targets,
      foodLogs,
      workouts,
    }),
    [foodLogs, fullName, goal, heightCm, targets, weightKg, workouts],
  );

  const fitnessInsightSignature = useMemo(
    () => buildFitnessInsightSignature(fitnessInsightInput),
    [fitnessInsightInput],
  );
  latestFitnessInsightSignatureRef.current = fitnessInsightSignature;

  useEffect(() => {
    let isMounted = true;
    const hydrationDisplayVersion = insightDisplayVersionRef.current;
    const hydrationRunId = latestInsightRunIdRef.current;

    const loadLatestLocalInsight = async () => {
      if (!user?.id) return;

      try {
        const latest = await getLatestAiInsightByUser(user.id);
        if (!isMounted || !latest) return;

        const localInsight = mapLocalAiInsightToFitnessInsight(latest);
        if (!localInsight) return;

        if (
          insightDisplayVersionRef.current !== hydrationDisplayVersion ||
          latestInsightRunIdRef.current !== hydrationRunId ||
          activeInsightRunRef.current !== null
        ) {
          console.warn('[Gemi] Fitness insight cache hydration skipped: newer insight already applied');
          return;
        }

        insightDisplayVersionRef.current += 1;
        currentInsightSignatureRef.current = latest.data_snapshot_hash;
        setFitnessInsight(localInsight);
        setFitnessInsightGeneratedAt(new Date(latest.generated_at));
        setFitnessInsightLoading(false);
      } catch (error) {
        console.warn('[Gemi] Failed to load local fitness insight:', error);
      }
    };

    loadLatestLocalInsight();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const generateFitnessInsight = useCallback(
    async (options?: { force?: boolean }) => {
      if (isLoadingLogs || !hasLoadedWorkouts) return;
      const force = options?.force ?? false;
      const now = new Date();
      const hasFreshDisplayedInsight =
        currentInsightSignatureRef.current === fitnessInsightSignature &&
        fitnessInsightGeneratedAt &&
        isSameIsoDay(fitnessInsightGeneratedAt, now);

      if (activeChatRunRef.current) {
        if (currentInsightSignatureRef.current !== fitnessInsightSignature) {
          pendingInsightSignatureRef.current = fitnessInsightSignature;
        } else if (force && hasFreshDisplayedInsight) {
          triggerToast('Your insight is already up to date.');
        }
        console.warn('[Gemi] Fitness insight generation skipped: already running');
        return;
      }

      if (activeInsightRunRef.current !== null) {
        if (activeInsightSignatureRef.current !== fitnessInsightSignature) {
          pendingInsightSignatureRef.current = fitnessInsightSignature;
        }
        console.warn('[Gemi] Fitness insight generation skipped: already running');
        return;
      }

      if (hasFreshDisplayedInsight) {
        if (force) {
          pendingInsightSignatureRef.current = null;
          setFitnessInsightLoading(false);
          triggerToast('Your insight is already up to date.');
        }
        return;
      }

      if (force) {
        try {
          const cacheReadRunId = latestInsightRunIdRef.current;
          const cached = user?.id ? await getLatestAiInsightByUser(user.id) : null;
          const cachedInsight = cached ? mapLocalAiInsightToFitnessInsight(cached) : null;

          if (cached && cachedInsight) {
            const cachedGeneratedAt = new Date(cached.generated_at);
            const cachedMatchesCurrentSnapshot = cached.data_snapshot_hash === fitnessInsightSignature;
            const cachedIsFromToday = isSameIsoDay(cachedGeneratedAt, now);

            if (cachedMatchesCurrentSnapshot && cachedIsFromToday) {
              if (
                activeInsightRunRef.current !== null ||
                latestInsightRunIdRef.current !== cacheReadRunId ||
                latestFitnessInsightSignatureRef.current !== fitnessInsightSignature
              ) {
                console.warn('[Gemi] Manual fitness insight cache result ignored: newer snapshot already active');
                return;
              }

              insightDisplayVersionRef.current += 1;
              currentInsightSignatureRef.current = cached.data_snapshot_hash;
              pendingInsightSignatureRef.current = null;
              setFitnessInsight(cachedInsight);
              setFitnessInsightGeneratedAt(cachedGeneratedAt);
              setFitnessInsightLoading(false);
              triggerToast('Your insight is already up to date.');
              return;
            }
          }
        } catch (error) {
          console.warn('[Gemi] Manual fitness insight cache read skipped:', error);
        }
      }

      const runId = latestInsightRunIdRef.current + 1;
      latestInsightRunIdRef.current = runId;
      activeInsightRunRef.current = runId;
      activeInsightSignatureRef.current = fitnessInsightSignature;
      console.log(`[Gemi] Fitness insight generation begin: ${runId}`);
      setFitnessInsightLoading(true);

      let hasValidLocalInsight = Boolean(fitnessInsightGeneratedAt);

      try {
        if (!force) {
          try {
            const cached = user?.id ? await getLatestAiInsightByUser(user.id) : null;
            const cachedInsight = cached ? mapLocalAiInsightToFitnessInsight(cached) : null;

            if (activeInsightRunRef.current !== runId) {
              console.warn(`[Gemi] Fitness insight stale result ignored: ${runId}`);
              return;
            }

            if (cached && cachedInsight) {
              const cachedGeneratedAt = new Date(cached.generated_at);
              const cachedMatchesCurrentSnapshot = cached.data_snapshot_hash === fitnessInsightSignature;
              const cachedIsFromToday = isSameIsoDay(cachedGeneratedAt, new Date());

              hasValidLocalInsight = true;
              insightDisplayVersionRef.current += 1;
              currentInsightSignatureRef.current = cached.data_snapshot_hash;
              setFitnessInsight(cachedInsight);
              setFitnessInsightGeneratedAt(cachedGeneratedAt);

              if (cachedMatchesCurrentSnapshot && cachedIsFromToday) {
                return;
              }
            }
          } catch (error) {
            console.warn('[Gemi] Local fitness insight cache read skipped:', error);
          }
        }

        const initialized = await initializeLfmOnStartup();
        if (!initialized) {
          throw new Error('LFM model failed to initialize.');
        }

        let prompt = buildFitnessInsightPrompt(fitnessInsightInput);
        let response = await generateFitnessInsightResponse(prompt);
        let parsed = parseFitnessInsight(response);
        let quality = assessFitnessInsightQuality(parsed);

        if (!quality.isUsable && response.trim().length > 0) {
          console.warn('[Gemi] Fitness insight rejected before repair:', {
            reasons: quality.reasons,
            response,
            parsed,
          });
          prompt = buildFitnessInsightRepairPrompt(fitnessInsightInput, response, quality);
          response = await generateFitnessInsightResponse(prompt);
          parsed = parseFitnessInsight(response);
          quality = assessFitnessInsightQuality(parsed);
        } else if (!quality.isUsable) {
          console.warn('[Gemi] Fitness insight returned empty output; skipping repair pass:', {
            reasons: quality.reasons,
            response,
            parsed,
          });
        }

        const generatedAt = new Date();

        if (activeInsightRunRef.current !== runId) {
          console.warn(`[Gemi] Fitness insight stale result ignored: ${runId}`);
          return;
        }

        const pendingSignature = pendingInsightSignatureRef.current;
        if (pendingSignature && pendingSignature !== fitnessInsightSignature) {
          console.warn(`[Gemi] Fitness insight stale result ignored: ${runId}`);
          return;
        }

        if (quality.isUsable) {
          insightDisplayVersionRef.current += 1;
          currentInsightSignatureRef.current = fitnessInsightSignature;
          setFitnessInsight(parsed);
          setFitnessInsightGeneratedAt(generatedAt);
          if (user?.id) {
            await saveAiInsightLocal({
              user_id: user.id,
              title: parsed.title,
              summary: parsed.summary,
              nutrition: parsed.nutrition,
              training: parsed.training,
              next_step: parsed.nextStep,
              confidence: parsed.confidence,
              data_snapshot_hash: fitnessInsightSignature,
              generated_at: generatedAt.toISOString(),
              payload_json: JSON.stringify(parsed),
            });
            await deleteOldAiInsightsByUser(user.id, 10);
          }
        } else {
          console.warn('[Gemi] Fitness insight rejected after repair:', {
            reasons: quality.reasons,
            response,
            parsed,
          });
          if (!hasValidLocalInsight) {
            insightDisplayVersionRef.current += 1;
            currentInsightSignatureRef.current = null;
            setFitnessInsight(createModelRetryFitnessInsight());
            setFitnessInsightGeneratedAt(null);
          }
        }
      } catch (error) {
        console.warn('[Gemi] Failed to generate shared fitness insight:', error);
        if (activeInsightRunRef.current === runId && !hasValidLocalInsight) {
          insightDisplayVersionRef.current += 1;
          setFitnessInsight({
            title: 'Insight Paused',
            summary: 'Gemi could not finish the on-device insight yet.',
            nutrition: 'Your nutrition numbers are still visible while the local model is unavailable.',
            training: 'Workout analysis will resume after the model is ready.',
            nextStep: 'Tap Regenerate again in a moment.',
            confidence: 'low: model generation failed.',
          });
          setFitnessInsightGeneratedAt(null);
        }
      } finally {
        if (activeInsightRunRef.current === runId) {
          activeInsightRunRef.current = null;
          activeInsightSignatureRef.current = null;
          setFitnessInsightLoading(false);
          console.log(`[Gemi] Fitness insight generation complete: ${runId}`);

          const pendingSignature = pendingInsightSignatureRef.current;
          pendingInsightSignatureRef.current = null;
          if (pendingSignature && pendingSignature !== currentInsightSignatureRef.current) {
            setInsightGenerationTick((value) => value + 1);
          }
        }
      }
    },
    [
      fitnessInsightGeneratedAt,
      fitnessInsightInput,
      fitnessInsightSignature,
      hasLoadedWorkouts,
      isLoadingLogs,
      triggerToast,
      user?.id,
    ],
  );

  useEffect(() => {
    generateFitnessInsight();
  }, [generateFitnessInsight, insightGenerationTick]);

  const sendInsightChatMessage = useCallback(
    async (history: FitnessInsightChatMessage[], question: string) => {
      if (activeInsightRunRef.current) {
        throw new Error('Wait for the current insight generation to finish before chatting.');
      }

      if (activeChatRunRef.current) {
        throw new Error('Wait for the current chat reply to finish.');
      }

      activeChatRunRef.current = true;
      try {
        const initialized = await initializeLfmOnStartup();
        if (!initialized) {
          throw new Error('LFM model failed to initialize.');
        }

        const prompt = buildFitnessInsightChatPrompt(fitnessInsightInput, fitnessInsight, history, question);
        const response = await generateInsightChatResponse(prompt);
        const answer = response.trim();
        if (!answer) {
          throw new Error('The on-device model returned an empty chat response.');
        }
        return answer;
      } finally {
        activeChatRunRef.current = false;
        const pendingSignature = pendingInsightSignatureRef.current;
        pendingInsightSignatureRef.current = null;
        if (pendingSignature && pendingSignature !== currentInsightSignatureRef.current) {
          setInsightGenerationTick((value) => value + 1);
        }
      }
    },
    [fitnessInsight, fitnessInsightInput],
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <HomeTab
            fullName={fullName}
            targets={targets}
            proteinTotal={proteinTotal}
            carbsTotal={carbsTotal}
            fatsTotal={fatsTotal}
            caloriesEaten={caloriesEaten}
            onQuickLog={() => setActiveTab('food')}
            fitnessInsight={fitnessInsight}
            isInsightLoading={isFitnessInsightLoading}
            onNavigateToTab={setActiveTab}
          />
        );
      case 'food':
        return (
          <FoodTab
            userId={user?.id ?? null}
            foodLogs={foodLogs}
            setFoodLogs={setFoodLogs}
            refreshFoodLogs={loadTodayLogs}
            targets={targets}
            triggerToast={triggerToast}
          />
        );
      case 'insights':
        return (
          <InsightsTab
            insight={fitnessInsight}
            isLoading={isFitnessInsightLoading}
            lastGeneratedAt={fitnessInsightGeneratedAt}
            onRegenerate={() => generateFitnessInsight({ force: true })}
            onSendChat={sendInsightChatMessage}
          />
        );
      case 'lift':
        return <LiftTab triggerToast={triggerToast} />;
      case 'profile':
        return (
          <ProfileTab
            fullName={fullName}
            email={email}
            goal={goal}
            heightCm={heightCm}
            weightKg={weightKg}
            targets={targets}
            onSignOut={signOut}
          />
        );
    }
  };

  const getActiveTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Today';
      case 'insights': return 'Insights';
      case 'food': return 'Food';
      case 'lift': return 'Lift';
      case 'profile': return 'Profile';
    }
  };

  const getTabIcon = (tabKey: TabType, isActive: boolean) => {
    const color = isActive ? Colors.primary : Colors.outline;
    const size = 20;
    switch (tabKey) {
      case 'dashboard':
        return <LayoutDashboard size={size} color={color} />;
      case 'food':
        return <Utensils size={size} color={color} />;
      case 'lift':
        return <Dumbbell size={size} color={color} />;
      case 'profile':
        return <User size={size} color={color} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{getActiveTitle()}</Text>
        </View>
      </View>

      <View style={styles.content}>{renderTab()}</View>

      {toastMessage && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <Sparkles size={14} color={Colors.primaryContainer} style={styles.toastIcon} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            if (tab.key === 'insights') {
              return (
                <View key={tab.key} style={styles.coachButtonWrapper}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                      style={styles.coachButton}
                      onPress={() => setActiveTab('insights')}
                      activeOpacity={0.8}
                      accessibilityRole="tab"
                      accessibilityLabel="Open AI insights"
                      accessibilityState={{ selected: isActive }}
                      hitSlop={8}
                    >
                      <Sparkles size={20} color={Colors.onPrimary} fill={Colors.onPrimary} />
                    </TouchableOpacity>
                  </Animated.View>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive, { marginTop: 4 }]}>
                    Insights
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityLabel={`Open ${tab.label}`}
                accessibilityState={{ selected: isActive }}
              >
                <View style={[styles.tabIconContainer, isActive && styles.tabIconActive]}>
                  {getTabIcon(tab.key, isActive)}
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicatorDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 58,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    letterSpacing: 0,
  },
  content: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 95,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 49, 69, 0.95)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    zIndex: 999,
    maxWidth: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
  toastIcon: {
    marginRight: spacing.xs,
  },
  toastText: {
    color: Colors.inverseOnSurface,
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 500,
    height: 72,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 12,
      },
    }),
  },
  tabItem: {
    flex: 1,
    height: '100%',
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    opacity: 0.45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: typography.xs - 1,
    color: Colors.outline,
    marginTop: 2,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 4,
  },
  coachButtonWrapper: {
    width: 68,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -20,
  },
  coachButton: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(14, 165, 233, 0.4)',
      },
      default: {
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
});
