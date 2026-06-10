import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  type PanResponderInstance,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  AppState,
  type AppStateStatus,
  Alert,
  Vibration,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import { Check, Dumbbell, Play, Pause, Plus, X, Copy, Shuffle, Info, Trash2, Search } from 'lucide-react-native';
import { getMuscleDataForExercise } from './exerciseMuscles';
import { BodyMuscleMap } from './BodyMuscleMap';
import { WGERExerciseBrowser } from './WGERExerciseBrowser';
import { exerciseDbService, getGifSource, type ExerciseDbExercise } from '@/api/exerciseDbService';
import { Image } from 'expo-image';
import { createWorkout, fetchWorkoutById } from '@/api/workoutApi';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { CompletedWorkoutInput, LocalRoutineWithExercises, LocalWorkoutWithSets } from '@/local/schema';
import {
  completedWorkoutToRemoteCreateInput,
  matchRemoteWorkoutSets,
} from '@/local/workoutsMapper';
import {
  localRoutinesToViews,
  matchRemoteRoutineExercises,
  remoteRoutineToLocalInput,
  routineDraftsToLocalInput,
  routineViewToLocalInput,
  type RemoteRoutineRow,
  type RemoteRoutineSetRow,
  type RoutineView,
  type RoutineViewExercise,
} from '@/local/routinesMapper';
import {
  createWorkoutWithSetsLocal,
  getWorkoutsByUserSince,
  getUnsyncedNewWorkoutsByUser,
  markWorkoutRemoteCreateIncomplete,
  markWorkoutSyncFailed,
  markWorkoutSynced,
} from '@/local/repositories/workoutsRepository';
import {
  createRoutineWithExercisesLocal,
  getRoutinesByUser,
  getUnsyncedRoutinesByUser,
  markRoutineSyncFailed,
  markRoutineSynced,
  updateRoutineWithExercisesLocal,
  updateRoutineRemoteIds,
  upsertRemoteRoutineForUser,
  softDeleteRoutine,
} from '@/local/repositories/routinesRepository';

interface LiftTabProps {
  triggerToast: (msg: string) => void;
}

interface SetLog {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string | null;
  setNum: number;
  weight: number;
  reps: number;
  repsLeft?: number;
  repsRight?: number;
  rir: number;
  isChecked: boolean;
}

interface Exercise {
  id: string;
  name: string;
  category: 'barbell' | 'dumbbell' | 'cable' | 'bodyweight' | 'machine';
  isCustom: boolean;
  muscleGroup?: string | null;
}

type RoutineExercise = RoutineViewExercise;
type Routine = RoutineView;

interface RoutineDraftExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  weightUnit: 'lbs' | 'kg';
  muscleGroup?: string;
}

// Strip decimals unless the value actually has meaningful fractional part
const formatWeight = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(Math.round(rounded)) : String(rounded);
};

const getWorkoutDurationLabel = (notes: string | null | undefined): string | null => {
  if (!notes) return null;
  const match = notes.match(/duration:(\d+)/);
  if (!match) return null;
  const secs = parseInt(match[1], 10);
  if (isNaN(secs) || secs <= 0) return null;
  const mins = Math.round(secs / 60);
  if (mins < 1) return '< 1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
};

export function LiftTab({ triggerToast }: LiftTabProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const fullName = profile?.fullName || user?.user_metadata?.fullName || user?.user_metadata?.full_name || 'User';

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  const [isLbs, setIsLbs] = useState(true);

  // Routine state
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [isRoutineLoading, setIsRoutineLoading] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [routineNameInput, setRoutineNameInput] = useState('');
  const [routineRestTimeInput, setRoutineRestTimeInput] = useState('90');
  const [routineDraftExercises, setRoutineDraftExercises] = useState<RoutineDraftExercise[]>([]);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  
  // Custom interface for individual set logging details
  const [routineProgress, setRoutineProgress] = useState<
    Record<
      string,
      {
        sets: string;
        reps: string;
        weight: string;
        doneSets: boolean[];
        setsDetails?: Array<{
          id: string;
          reps: string;
          weight: string;
          done: boolean;
        }>;
      }
    >
  >({});

  // Rest Timer State
  const [restTimeRemaining, setRestTimeRemaining] = useState<number | null>(null);
  const [restTimeTotal, setRestTimeTotal] = useState<number>(90);
  const [restExerciseName, setRestExerciseName] = useState<string>('');
  const [restNextSetNum, setRestNextSetNum] = useState<number>(1);
  const [restNextExerciseName, setRestNextExerciseName] = useState<string>('');

  // Exercise management state
  const [exercisesList, setExercisesList] = useState<Exercise[]>([]);
  const [currentExerciseId, setCurrentExerciseId] = useState('');
  const currentExercise =
    exercisesList.find((e) => e.id === currentExerciseId) ||
    ({ id: '', name: '', category: 'barbell', isCustom: false } as Exercise);

  // Set configuration input state
  const [inputWeight, setInputWeight] = useState('185');
  const [inputReps, setInputReps] = useState('8');
  const [inputRepsLeft, setInputRepsLeft] = useState('8');
  const [inputRepsRight, setInputRepsRight] = useState('8');
  const [inputRir, setInputRir] = useState('2');
  const [isUnilateral, setIsUnilateral] = useState(false);

  // UI state
  const [setsList, setSetsList] = useState<SetLog[]>([]);
  const [completedWorkouts, setCompletedWorkouts] = useState<LocalWorkoutWithSets[]>([]);
  const [selectedHistoryWorkout, setSelectedHistoryWorkout] = useState<LocalWorkoutWithSets | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseDbExercise[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [customWorkoutName, setCustomWorkoutName] = useState('');
  const [isFinishingWorkout, setIsFinishingWorkout] = useState(false);
  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);
  const [showExerciseBrowser, setShowExerciseBrowser] = useState(false);
  const [exerciseBrowserTarget, setExerciseBrowserTarget] = useState<'routine' | 'workout'>('workout');
  const [pendingExercise, setPendingExercise] = useState<ExerciseDbExercise | null>(null);
  const [exerciseDetailItem, setExerciseDetailItem] = useState<ExerciseDbExercise | null>(null);
  const [showExerciseConfigSheet, setShowExerciseConfigSheet] = useState(false);
  const [configSets, setConfigSets] = useState('3');
  const [configReps, setConfigReps] = useState('10');
  const [configWeight, setConfigWeight] = useState('');
  const [configWeightUnit, setConfigWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [selectedMuscleId, setSelectedMuscleId] = useState<number | null>(null);
  const [selectedMuscleName, setSelectedMuscleName] = useState<string>('');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExerciseCategory, setCustomExerciseCategory] = useState<Exercise['category']>('barbell');
  const [highlightMode, setHighlightMode] = useState<'none' | 'click' | 'exercise'>('none');
  const [primaryMuscleIds, setPrimaryMuscleIds] = useState<number[]>([]);
  const [secondaryMuscleIds, setSecondaryMuscleIds] = useState<number[]>([]);
  const currentExerciseSets = setsList.filter((set) => set.exerciseId === currentExerciseId);

  // Swipe state
  const swipeAnimRefs = useRef<{ [key: string]: Animated.Value }>({});
  const panResponderRefs = useRef<{ [key: string]: PanResponderInstance }>({});
  const routineModalScrollRef = useRef<ScrollView>(null);
  const uniqueIdRef = useRef(0);
  const isLoadingRoutinesRef = useRef(false);
  const isRetryingRoutineSyncsRef = useRef(false);
  const isRetryingWorkoutCreatesRef = useRef(false);
  const inFlightWorkoutCreateIdsRef = useRef(new Set<string>());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const createUniqueId = (prefix: string) => {
    uniqueIdRef.current += 1;
    return `${prefix}-${Date.now()}-${uniqueIdRef.current}`;
  };

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useState(new Animated.Value(1))[0];

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (isRunningRef.current) {
          setElapsedSecs((s) => s + 1);
        }
      }, 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      scaleAnim.setValue(1);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, scaleAnim]);

  const playBeepSound = () => {
    if (Platform.OS === 'web') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        }
      } catch (e) {
        console.warn('Failed to play web beep sound:', e);
      }
    }
  };

  const handleStartRestTimer = (exercise: RoutineExercise, completedSetNum: number) => {
    if (!activeRoutine) return;
    
    const isLastExercise = activeRoutine.exercises[activeRoutine.exercises.length - 1].id === exercise.id;
    const setsForEx = routineProgress[exercise.id]?.doneSets?.length || exercise.sets || 1;
    const isLastSet = completedSetNum >= setsForEx;
    
    if (isLastExercise && isLastSet) {
      return;
    }

    const restTime = activeRoutine.rest_time_seconds ?? 90;
    if (restTime <= 0) return;

    setRestTimeRemaining(restTime);
    setRestTimeTotal(restTime);
    setRestExerciseName(exercise.exercise_name);
    
    let nextSet = completedSetNum + 1;
    let nextExerciseName = exercise.exercise_name;
    if (isLastSet) {
      const currentExIdx = activeRoutine.exercises.findIndex((e) => e.id === exercise.id);
      const nextEx = activeRoutine.exercises[currentExIdx + 1];
      if (nextEx) {
        nextSet = 1;
        nextExerciseName = nextEx.exercise_name;
      }
    }
    setRestNextSetNum(nextSet);
    setRestNextExerciseName(nextExerciseName);
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await exerciseDbService.searchExercises(searchQuery);
        setSearchResults(results.slice(0, 15));
      } catch (err) {
        console.error('[LiftTab] Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (restTimeRemaining !== null && restTimeRemaining > 0) {
      interval = setInterval(() => {
        setRestTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval!);
            Vibration.vibrate([0, 500, 200, 500]);
            playBeepSound();
            triggerToast(`Rest complete! Start Set ${restNextSetNum} of ${restNextExerciseName}`);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimeRemaining, restNextSetNum, restNextExerciseName]);

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    const candidate = error as { message?: string };
    return candidate?.message ?? String(error);
  };

  type SyncWorkoutResult = {
    didSync: boolean;
    message?: string;
    skippedInFlight?: boolean;
  };

  const logRoutineError = (label: string, error: unknown) => {
    const candidate = error as {
      name?: string;
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
      stack?: string;
    };

    console.warn(label, {
      name: error instanceof Error ? error.name : candidate?.name,
      message: error instanceof Error ? error.message : candidate?.message ?? String(error),
      code: candidate?.code,
      details: candidate?.details,
      hint: candidate?.hint,
      stack: error instanceof Error ? error.stack : candidate?.stack,
    });
  };

  const convertInputWeightToKg = (weight: number) => (isLbs ? weight * 0.45359237 : weight);

  const estimateOneRepMax = (weightKg: number, reps: number) => {
    if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps <= 0) return null;
    return Number((weightKg * (1 + reps / 30)).toFixed(2));
  };

  const loadCompletedWorkoutHistory = async () => {
    if (!user?.id) {
      setCompletedWorkouts([]);
      return;
    }

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const workouts = await getWorkoutsByUserSince(user.id, sevenDaysAgo);
      setCompletedWorkouts(workouts);
    } catch (error) {
      console.error('[LiftTab] Failed to load local workout history:', error);
    }
  };

  useEffect(() => {
    loadCompletedWorkoutHistory();
  }, [user?.id]);

  const buildRoutineCompletedWorkoutPayload = (): CompletedWorkoutInput | null => {
    if (!activeRoutine) return null;

    const sets: CompletedWorkoutInput['sets'] = activeRoutine.exercises.flatMap((exercise) => {
      const progress = routineProgress[exercise.id];
      if (!progress) return [];

      const details = progress.setsDetails || [];
      if (details.length > 0) {
        return details
          .map((setDetail, index) => {
            if (!setDetail.done) return null;
            const reps = Math.max(1, parseInt(setDetail.reps, 10) || 1);
            const weight = parseFloat(setDetail.weight) || 0;
            const weightKg = isLbs ? weight * 0.45359237 : weight;
            return {
              exerciseName: exercise.exercise_name,
              muscleGroup: exercise.muscle_group ?? null,
              setNumber: index + 1,
              reps,
              weightKg: weightKg > 0 ? weightKg : null,
              rir: 0,
              estimated1rm: estimateOneRepMax(weightKg, reps),
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
      }

      const reps = Math.max(1, parseInt(progress.reps, 10) || 1);
      const weight = parseFloat(progress.weight) || 0;
      const weightKg = isLbs ? weight * 0.45359237 : weight;

      return progress.doneSets.flatMap((isDone, index) =>
        isDone
          ? [
              {
                exerciseName: exercise.exercise_name,
                muscleGroup: exercise.muscle_group ?? null,
                setNumber: index + 1,
                reps,
                weightKg: weightKg > 0 ? weightKg : null,
                rir: 0,
                estimated1rm: estimateOneRepMax(weightKg, reps),
              },
            ]
          : []
      );
    });

    return {
      name: activeRoutine.name,
      performedAt: new Date().toISOString(),
      notes: `routine_session|duration:${elapsedSecs}`,
      sets,
    };
  };

  const buildFreeformCompletedWorkoutPayload = (): CompletedWorkoutInput | null => {
    const checkedSets = setsList.filter((set) => set.isChecked);
    if (checkedSets.length === 0) return null;

    const workoutName =
      exercisesList.length === 1
        ? exercisesList[0].name
        : exercisesList.length > 1
        ? 'Custom Workout'
        : currentExercise.name || 'Workout';

    return {
      name: workoutName,
      performedAt: new Date().toISOString(),
      notes: `duration:${elapsedSecs}`,
      sets: checkedSets.map((set) => {
        const weightKg = convertInputWeightToKg(set.weight);
        return {
          exerciseName: set.exerciseName,
          muscleGroup: set.muscleGroup ?? null,
          setNumber: set.setNum,
          reps: set.reps,
          weightKg,
          rir: set.rir,
          estimated1rm: estimateOneRepMax(weightKg, set.reps),
        };
      }),
    };
  };

  const buildCompletedWorkoutPayload = (): CompletedWorkoutInput | null => {
    return activeRoutine ? buildRoutineCompletedWorkoutPayload() : buildFreeformCompletedWorkoutPayload();
  };

  const completedWorkoutPayloadFromLocal = (workout: LocalWorkoutWithSets): CompletedWorkoutInput => ({
    name: workout.name,
    performedAt: workout.performed_at,
    notes: workout.notes,
    sets: workout.sets.map((set) => ({
      exerciseName: set.exercise_name,
      muscleGroup: set.muscle_group,
      setNumber: set.set_number,
      reps: set.reps,
      weightKg: set.weight_kg,
      durationSeconds: set.duration_seconds,
      rir: set.rir,
      estimated1rm: set.est_1rm,
    })),
  });

  const syncWorkoutToRemote = async (
    localWorkout: LocalWorkoutWithSets,
    payload: CompletedWorkoutInput,
    options?: {
      showFailureToast?: boolean;
      authenticatedUserId?: string;
      updateVisibleHistory?: boolean;
    }
  ): Promise<SyncWorkoutResult> => {
    const authenticatedUserId = options?.authenticatedUserId ?? user?.id;
    if (!authenticatedUserId) return { didSync: false, message: 'Missing authenticated user.' };
    if (localWorkout.user_id !== authenticatedUserId) {
      const message = 'Skipping workout sync for a different authenticated user.';
      console.warn('[LiftTab]', message);
      return { didSync: false, message };
    }
    if (inFlightWorkoutCreateIdsRef.current.has(localWorkout.id)) {
      console.log('[LiftTab] Workout create sync skipped: already in-flight', {
        localWorkoutId: localWorkout.id,
      });
      return { didSync: false, skippedInFlight: true };
    }

    const showFailureToast = options?.showFailureToast ?? true;
    const updateVisibleHistory = options?.updateVisibleHistory ?? true;
    inFlightWorkoutCreateIdsRef.current.add(localWorkout.id);
    let remoteWorkoutId: string | null = null;
    try {
      const remoteWorkout = await createWorkout(completedWorkoutToRemoteCreateInput(payload));
      remoteWorkoutId = remoteWorkout.id;

      const remoteWithSets = await fetchWorkoutById(remoteWorkout.id);
      const matchResult = matchRemoteWorkoutSets(localWorkout.sets, remoteWithSets.workout_sets ?? []);
      if (matchResult.unmatchedLocalSetIds.length > 0) {
        throw new Error(
          `Remote workout saved, but ${matchResult.unmatchedLocalSetIds.length} local set(s) could not be matched.`
        );
      }

      const synced = await markWorkoutSynced(
        authenticatedUserId,
        localWorkout.id,
        remoteWorkout.id,
        matchResult.matches
      );
      if (updateVisibleHistory) {
        setCompletedWorkouts((prev) => [synced, ...prev.filter((workout) => workout.id !== synced.id)]);
      }
      return { didSync: true };
    } catch (error) {
      console.error('[LiftTab] Failed to sync workout to backend:', getErrorMessage(error));
      if (remoteWorkoutId) {
        await markWorkoutRemoteCreateIncomplete(authenticatedUserId, localWorkout.id, remoteWorkoutId).catch(
          (markError) => {
            console.error('[LiftTab] Failed to mark workout remote create incomplete:', markError);
          }
        );
      } else {
        await markWorkoutSyncFailed(authenticatedUserId, localWorkout.id).catch((markError) => {
          console.error('[LiftTab] Failed to mark workout sync failed:', markError);
        });
      }
      if (showFailureToast) {
        triggerToast(`Workout saved locally. Remote sync pending.`);
      }
      return { didSync: false, message: getErrorMessage(error) };
    } finally {
      inFlightWorkoutCreateIdsRef.current.delete(localWorkout.id);
    }
  };

  const retryPendingWorkoutCreates = async (userId: string) => {
    if (isRetryingWorkoutCreatesRef.current) {
      console.log('[LiftTab] Workout create retry skipped: already running');
      return;
    }

    isRetryingWorkoutCreatesRef.current = true;
    try {
      console.log('[LiftTab] Workout create retry begin');
      const unsyncedWorkouts = await getUnsyncedNewWorkoutsByUser(userId);
      console.log('[LiftTab] Unsynced new workouts found:', unsyncedWorkouts.length);
      let syncedAnyWorkout = false;

      for (const workout of unsyncedWorkouts) {
        if (inFlightWorkoutCreateIdsRef.current.has(workout.id)) {
          console.log('[LiftTab] Workout create retry skipped: already in-flight', {
            localWorkoutId: workout.id,
          });
          continue;
        }

        console.log('[LiftTab] Retrying workout create:', { localWorkoutId: workout.id });
        const result = await syncWorkoutToRemote(workout, completedWorkoutPayloadFromLocal(workout), {
          showFailureToast: false,
          authenticatedUserId: userId,
          updateVisibleHistory: false,
        });
        if (result.didSync) {
          syncedAnyWorkout = true;
        }
        if (!result.didSync && !result.skippedInFlight) {
          console.log('[LiftTab] Workout create retry left pending:', {
            localWorkoutId: workout.id,
            message: result.message,
          });
        }
      }

      if (syncedAnyWorkout) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const recentWorkouts = await getWorkoutsByUserSince(userId, sevenDaysAgo);
        setCompletedWorkouts(recentWorkouts);
      }
      console.log('[LiftTab] Workout create retry complete');
    } catch (error) {
      console.error('[LiftTab] Workout create retry pass failed:', getErrorMessage(error));
    } finally {
      isRetryingWorkoutCreatesRef.current = false;
    }
  };

  const resetFinishedSessionState = () => {
    setIsRunning(false);
    setElapsedSecs(0);
    scaleAnim.setValue(1);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (activeRoutineId) {
      setActiveRoutineId(null);
      setRoutineProgress({});
    }
    setExercisesList([]);
    setCurrentExerciseId('');
    setSetsList([]);
  };

  const saveCompletedWorkout = async (payload: CompletedWorkoutInput) => {
    if (!user?.id) return;
    setIsFinishingWorkout(true);
    try {
      const localWorkout = await createWorkoutWithSetsLocal(user.id, payload);
      setCompletedWorkouts((prev) => [localWorkout, ...prev.filter((workout) => workout.id !== localWorkout.id)]);
      resetFinishedSessionState();
      triggerToast('Workout saved');
      void syncWorkoutToRemote(localWorkout, payload);
    } catch (error) {
      console.error('[LiftTab] Failed to save local workout:', error);
      triggerToast(`Workout save failed: ${getErrorMessage(error)}`);
    } finally {
      setIsFinishingWorkout(false);
    }
  };

  const handleFinishSession = async () => {
    if (isFinishingWorkout) return;

    if (!user?.id) {
      triggerToast('Please sign in to save workouts');
      return;
    }

    if (activeRoutine) {
      const payload = buildCompletedWorkoutPayload();
      if (!payload || payload.sets.length === 0) {
        triggerToast('Log at least one completed set before finishing');
        return;
      }
      saveCompletedWorkout(payload);
    } else {
      const checkedSets = setsList.filter((set) => set.isChecked);
      if (checkedSets.length === 0) {
        triggerToast('Log at least one completed set before finishing');
        return;
      }

      const defaultName = exercisesList.length === 1
        ? exercisesList[0].name
        : exercisesList.length > 1
        ? 'Custom Workout'
        : currentExercise.name || 'Freestyle Workout';
      setCustomWorkoutName(defaultName);
      setShowNamingModal(true);
    }
  };

  const handleSaveCustomFreestyleWorkout = () => {
    setShowNamingModal(false);
    const nameToUse = customWorkoutName.trim() || 'Freestyle Workout';
    const payload = buildFreeformCompletedWorkoutPayload();
    if (payload) {
      payload.name = nameToUse;
      saveCompletedWorkout(payload);
    }
  };

  const convertWeightValue = (value: number, toLbs: boolean) => {
    return toLbs ? value / 0.45359237 : value * 0.45359237;
  };

  const toggleUnit = (nextIsLbs: boolean) => {
    if (nextIsLbs === isLbs) return;
    setIsLbs(nextIsLbs);
    setRoutineProgress((prev) => {
      const updated: typeof prev = {};
      Object.entries(prev).forEach(([key, value]) => {
        const currentWeight = parseFloat(value.weight) || 0;
        const nextWeight = convertWeightValue(currentWeight, nextIsLbs);
        const updatedDetails = (value.setsDetails || []).map((detail) => {
          const detailWeight = parseFloat(detail.weight) || 0;
          const nextDetailWeight = convertWeightValue(detailWeight, nextIsLbs);
          return { ...detail, weight: formatWeight(nextDetailWeight) };
        });
        updated[key] = {
          ...value,
          weight: formatWeight(nextWeight),
          setsDetails: updatedDetails,
        };
      });
      return updated;
    });
  };

  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId) || null;
  const activeRoutine = routines.find((routine) => routine.id === activeRoutineId) || null;

  const applyRoutinesToState = (nextRoutines: Routine[]) => {
    setRoutines(nextRoutines);
    setSelectedRoutineId((currentId) =>
      currentId && nextRoutines.some((routine) => routine.id === currentId)
        ? currentId
        : nextRoutines[0]?.id ?? null
    );
  };

  const fetchRemoteRoutineInputs = async (userId: string) => {
    const { data: routineRows, error: routineError } = await supabase
      .from('routines')
      .select('id,routine_name,routines_id,rest_time_seconds')
      .eq('user_id', userId);

    if (routineError) throw routineError;

    const routinesWithTemplates = ((routineRows || []) as RemoteRoutineRow[]).filter(
      (routine) => !!routine.routines_id
    );
    const workoutIds = routinesWithTemplates.map((routine) => routine.routines_id as string);

    const { data: setRows, error: setError } = await supabase
      .from('workout_sets')
      .select('id,workout_id,exercise_name,muscle_group,set_number,reps,weight_kg')
      .in('workout_id', workoutIds.length > 0 ? workoutIds : ['00000000-0000-0000-0000-000000000000']);

    if (setError) throw setError;

    return routinesWithTemplates
      .map((routine) =>
        remoteRoutineToLocalInput(routine, (setRows || []) as RemoteRoutineSetRow[])
      )
      .filter((input) => input.exercises.length > 0);
  };

  const refreshRemoteRoutines = async (userId: string) => {
    try {
      const remoteInputs = await fetchRemoteRoutineInputs(userId);

      for (const remoteInput of remoteInputs) {
        try {
          await upsertRemoteRoutineForUser(userId, remoteInput);
        } catch (innerError) {
          console.warn(`[LiftTab] Skipping remote routine "${remoteInput.routineName}":`, innerError);
        }
      }

      const mergedLocalRows = await getRoutinesByUser(userId);
      applyRoutinesToState(localRoutinesToViews(mergedLocalRows));
    } catch (error) {
      logRoutineError('[LiftTab] Remote routine refresh failed:', error);
      throw error;
    }
  };

  const loadRoutines = async () => {
    if (isLoadingRoutinesRef.current) {
      console.log('[LiftTab] Routine load skipped: already running');
      return;
    }

    isLoadingRoutinesRef.current = true;
    console.log('[LiftTab] Routine load begin');
    setIsRoutineLoading(true);
    try {
      const authUser = user ?? (await supabase.auth.getUser()).data.user;
      if (!authUser) {
        applyRoutinesToState([]);
        return;
      }

      console.log('[LiftTab] Routine load authenticated user:', authUser.id);
      const localRows = await getRoutinesByUser(authUser.id);
      console.log('[LiftTab] Local routines loaded:', localRows.length);
      applyRoutinesToState(localRoutinesToViews(localRows));
      setIsRoutineLoading(false);

      console.log('[LiftTab] Workout background retry started for authenticated user:', authUser.id);
      void retryPendingWorkoutCreates(authUser.id);
      console.log('[LiftTab] Routine background retry started');
      void retryPendingRoutineSyncs(authUser.id);
    } catch (error) {
      logRoutineError('[LiftTab] Failed to load local routines:', error);
      triggerToast('Failed to load routines');
    } finally {
      setIsRoutineLoading(false);
      isLoadingRoutinesRef.current = false;
    }
  };

  useEffect(() => {
    loadRoutines();
  }, [user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        user?.id &&
        nextAppState === 'active' &&
        (previousAppState === 'background' || previousAppState === 'inactive')
      ) {
        loadRoutines();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id]);

  const addDraftExercise = () => {
    setRoutineDraftExercises((prev) => [
      ...prev,
      {
        id: createUniqueId('draft'),
        name: '',
        sets: '3',
        reps: '10',
        weight: '',
        weightUnit: isLbs ? 'lbs' : 'kg',
      },
    ]);
  };

  const updateDraftExercise = (id: string, patch: Partial<RoutineDraftExercise>) => {
    setRoutineDraftExercises((prev) =>
      prev.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise))
    );
  };

  const removeDraftExercise = (id: string) => {
    setRoutineDraftExercises((prev) => prev.filter((exercise) => exercise.id !== id));
  };

  const resetRoutineDraft = () => {
    setRoutineNameInput('');
    setRoutineRestTimeInput('90');
    setRoutineDraftExercises([]);
    setEditingRoutineId(null);
    setEditingWorkoutId(null);
  };

  const handleDeleteRoutine = async (routine: Routine) => {
    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete ${routine.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const authUser = user ?? (await supabase.auth.getUser()).data.user;
              if (!authUser) {
                triggerToast('Authentication error.');
                return;
              }
              // 1. Soft delete locally
              await softDeleteRoutine(authUser.id, routine.id);

              // 2. Reset active training session if this routine is running
              if (activeRoutineId === routine.id) {
                resetFinishedSessionState();
              }

              // 3. Remove from UI state list
              setRoutines((prev) => prev.filter((r) => r.id !== routine.id));

              // 4. Clear selection state
              if (selectedRoutineId === routine.id) {
                setSelectedRoutineId(null);
              }

              triggerToast('Routine deleted successfully.');

              // 5. Remote delete sync to Supabase
              if (routine.remote_id) {
                const { error: routineErr } = await supabase
                  .from('routines')
                  .delete()
                  .eq('id', routine.remote_id);
                if (routineErr) {
                  console.error('[LiftTab] Remote routine delete failed:', routineErr);
                }
              }
              if (routine.routines_id) {
                const { error: workoutErr } = await supabase
                  .from('workouts')
                  .delete()
                  .eq('id', routine.routines_id);
                if (workoutErr) {
                  console.error('[LiftTab] Remote workout delete failed:', workoutErr);
                }
              }
            } catch (error) {
              console.error('[LiftTab] Error deleting routine:', error);
              triggerToast('Failed to delete routine.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const startEditRoutine = (routine: Routine) => {
    const workoutId = routine.routines_id;
    setEditingRoutineId(routine.id);
    setEditingWorkoutId(workoutId ?? null);
    setRoutineNameInput(routine.name);
    setRoutineRestTimeInput(String(routine.rest_time_seconds ?? 90));

    const draftExercises = routine.exercises.map((exercise) => {
      const weightValue = isLbs ? exercise.weight_kg / 0.45359237 : exercise.weight_kg;
      return {
        id: createUniqueId('draft-edit'),
        name: exercise.exercise_name,
        sets: String(exercise.sets),
        reps: String(exercise.reps),
        weight: formatWeight(weightValue),
        weightUnit: isLbs ? 'lbs' : 'kg',
        muscleGroup: exercise.muscle_group || undefined,
      } as RoutineDraftExercise;
    });

    setRoutineDraftExercises(draftExercises);
    setShowRoutineModal(true);
  };

  const syncRoutineToRemote = async (
    localRoutine: LocalRoutineWithExercises,
    options?: { showFailureToast?: boolean }
  ) => {
    const authUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!authUser) return;
    if (authUser.id !== localRoutine.user_id) {
      console.warn('[LiftTab] Skipping routine sync for a different authenticated user.');
      return;
    }

    const showFailureToast = options?.showFailureToast ?? true;

    try {
      let workoutId = localRoutine.remote_template_workout_id;
      let routineId = localRoutine.remote_id;
      console.log('[LiftTab] Routine sync begin:', {
        localRoutineId: localRoutine.id,
        remoteId: routineId,
        remoteTemplateWorkoutId: workoutId,
      });

      if (routineId && !workoutId) {
        const { data: existingRoutine, error: existingRoutineError } = await supabase
          .from('routines')
          .select('routines_id')
          .eq('id', routineId)
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (existingRoutineError) throw existingRoutineError;

        workoutId = existingRoutine?.routines_id || null;
        if (workoutId) {
          await updateRoutineRemoteIds(authUser.id, localRoutine.id, {
            remoteTemplateWorkoutId: workoutId,
          });
          console.log('[LiftTab] Remote template workout ready:', {
            localRoutineId: localRoutine.id,
            workoutId,
            source: 'existing routine',
          });
        }
      }

      if (!workoutId) {
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: authUser.id,
            name: localRoutine.routine_name,
            notes: 'routine_template',
            performed_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (workoutError) throw workoutError;

        workoutId = workout?.id || null;
        if (!workoutId) throw new Error('Workout template creation failed');

        await updateRoutineRemoteIds(authUser.id, localRoutine.id, {
          remoteTemplateWorkoutId: workoutId,
        });
        console.log('[LiftTab] Remote template workout ready:', {
          localRoutineId: localRoutine.id,
          workoutId,
          source: 'created',
        });
      } else {
        console.log('[LiftTab] Remote template workout ready:', {
          localRoutineId: localRoutine.id,
          workoutId,
          source: 'reused',
        });
        const { error: workoutUpdateError } = await supabase
          .from('workouts')
          .update({ name: localRoutine.routine_name })
          .eq('id', workoutId)
          .eq('user_id', authUser.id);

        if (workoutUpdateError) throw workoutUpdateError;
      }

      if (routineId) {
        console.log('[LiftTab] Remote routine ready:', {
          localRoutineId: localRoutine.id,
          routineId,
          source: 'reused',
        });
        const { error: routineUpdateError } = await supabase
          .from('routines')
          .update({
            routine_name: localRoutine.routine_name,
            rest_time_seconds: localRoutine.rest_time_seconds,
          })
          .eq('id', routineId)
          .eq('user_id', authUser.id);

        if (routineUpdateError) throw routineUpdateError;
      } else {
        const { data: routine, error: routineError } = await supabase
          .from('routines')
          .insert({
            user_id: authUser.id,
            routine_name: localRoutine.routine_name,
            routines_id: workoutId,
            rest_time_seconds: localRoutine.rest_time_seconds,
          })
          .select('id,routines_id')
          .single();

        if (routineError) throw routineError;

        routineId = routine?.id || null;
        workoutId = routine?.routines_id || workoutId;

        if (routineId) {
          await updateRoutineRemoteIds(authUser.id, localRoutine.id, {
            remoteId: routineId,
            remoteTemplateWorkoutId: workoutId,
          });
          console.log('[LiftTab] Remote routine ready:', {
            localRoutineId: localRoutine.id,
            routineId,
            source: 'created',
          });
        }
      }

      if (!routineId || !workoutId) {
        throw new Error('Remote routine template creation failed');
      }

      const { error: deleteError } = await supabase
        .from('workout_sets')
        .delete()
        .eq('workout_id', workoutId);

      if (deleteError) throw deleteError;

      const exerciseRows = localRoutine.exercises
        .slice()
        .sort((left, right) => left.sort_order - right.sort_order)
        .flatMap((exercise) => {
          const sets = Math.max(1, Math.trunc(exercise.sets ?? 1));
          const reps = Math.max(1, Math.trunc(exercise.reps ?? 1));

          return Array.from({ length: sets }, (_, index) => ({
            workout_id: workoutId,
            exercise_name: exercise.exercise_name,
            muscle_group: exercise.muscle_group || null,
            set_number: index + 1,
            reps,
            weight_kg: exercise.weight_kg ?? 0,
            rir: 0,
            est_1rm: null,
          }));
        });

      const { data: insertedSets, error: exerciseError } = await supabase
        .from('workout_sets')
        .insert(exerciseRows)
        .select('id,workout_id,exercise_name,muscle_group,set_number,reps,weight_kg');

      if (exerciseError) throw exerciseError;
      console.log('[LiftTab] Remote workout_sets saved:', {
        localRoutineId: localRoutine.id,
        count: insertedSets?.length ?? 0,
      });

      const synced = await markRoutineSynced(
        authUser.id,
        localRoutine.id,
        routineId,
        workoutId,
        matchRemoteRoutineExercises(localRoutine.exercises, (insertedSets || []) as RemoteRoutineSetRow[])
      );

      setRoutines((prev) =>
        localRoutinesToViews([synced]).concat(prev.filter((routine) => routine.id !== synced.id))
      );
      console.log('[LiftTab] Routine sync complete:', {
        localRoutineId: localRoutine.id,
        remoteId: routineId,
        remoteTemplateWorkoutId: workoutId,
      });
    } catch (error) {
      if (showFailureToast) {
        logRoutineError('[LiftTab] Failed to sync routine to Supabase:', error);
      } else {
        logRoutineError('[LiftTab] Background routine sync retry failed:', error);
      }
      await markRoutineSyncFailed(authUser.id, localRoutine.id).catch((markError) => {
        if (showFailureToast) {
          logRoutineError('[LiftTab] Failed to mark routine sync failed:', markError);
        } else {
          logRoutineError('[LiftTab] Failed to mark routine sync failed:', markError);
        }
      });
      if (showFailureToast) {
        triggerToast('Routine saved offline. It will sync when you reconnect.');
      }
    }
  };

  const retryPendingRoutineSyncs = async (userId: string) => {
    if (isRetryingRoutineSyncsRef.current) return;

    isRetryingRoutineSyncsRef.current = true;
    try {
      console.log('[LiftTab] Routine retry begin');
      const unsyncedRoutines = await getUnsyncedRoutinesByUser(userId);
      console.log('[LiftTab] Unsynced routines found:', unsyncedRoutines.length);

      for (const routine of unsyncedRoutines) {
        console.log('[LiftTab] Retrying routine:', {
          localRoutineId: routine.id,
          remoteId: routine.remote_id,
          remoteTemplateWorkoutId: routine.remote_template_workout_id,
        });
        await syncRoutineToRemote(routine, { showFailureToast: false });
      }

      await refreshRemoteRoutines(userId);
      console.log('[LiftTab] Routine retry complete');
    } catch (error) {
      logRoutineError('[LiftTab] Routine retry pass failed:', error);
    } finally {
      isRetryingRoutineSyncsRef.current = false;
    }
  };

  const handleCreateRoutine = async () => {
    const authUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!authUser) {
      triggerToast('Please sign in to save routines');
      return;
    }

    const trimmedName = routineNameInput.trim();
    if (!trimmedName) {
      triggerToast('Routine name is required');
      return;
    }

    const cleanedExercises = routineDraftExercises.filter((exercise) => exercise.name.trim().length > 0);

    if (cleanedExercises.length === 0) {
      triggerToast('Add at least one exercise');
      return;
    }

    setIsSavingRoutine(true);
    try {
      const existingRoutine = editingRoutineId
        ? routines.find((routine) => routine.id === editingRoutineId) || null
        : null;
      const localInput = routineDraftsToLocalInput(trimmedName, cleanedExercises, {
        remoteId: existingRoutine?.remote_id ?? null,
        remoteTemplateWorkoutId: existingRoutine?.routines_id ?? editingWorkoutId ?? null,
        restTimeSeconds: parseInt(routineRestTimeInput, 10) || 90,
      });
      const localRoutine = editingRoutineId
        ? await updateRoutineWithExercisesLocal(authUser.id, editingRoutineId, localInput)
        : await createRoutineWithExercisesLocal(authUser.id, localInput);
      const nextRoutines = localRoutinesToViews(await getRoutinesByUser(authUser.id));
      applyRoutinesToState(nextRoutines);

      resetRoutineDraft();
      setShowRoutineModal(false);
      triggerToast(editingRoutineId ? 'Routine updated' : 'Routine saved');
      void syncRoutineToRemote(localRoutine);
    } catch (error) {
      console.error('[LiftTab] Failed to save local routine:', error);
      triggerToast(`Routine save failed: ${getErrorMessage(error)}`);
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const applyRoutineDefaults = (routineExercise: RoutineExercise | null) => {
    if (!routineExercise) return;
    setIsUnilateral(false);
    const weight = isLbs ? routineExercise.weight_kg / 0.45359237 : routineExercise.weight_kg;
    setInputWeight(formatWeight(weight));
    setInputReps(String(routineExercise.reps));
    setInputRepsLeft(String(routineExercise.reps));
    setInputRepsRight(String(routineExercise.reps));
  };

  const handleStartRoutine = (routine: Routine) => {
    if (routine.exercises.length === 0) return;

    const initialProgress: typeof routineProgress = {};
    routine.exercises.forEach((exercise) => {
      const weightValue = isLbs ? exercise.weight_kg / 0.45359237 : exercise.weight_kg;
      const setCount = Math.max(1, exercise.sets);
      const repsVal = String(exercise.reps);
      const weightVal = formatWeight(weightValue);
      initialProgress[exercise.id] = {
        sets: String(setCount),
        reps: repsVal,
        weight: weightVal,
        doneSets: Array.from({ length: setCount }, () => false),
        setsDetails: Array.from({ length: setCount }, (_, idx) => ({
          id: `${exercise.id}-set-${idx}-${Date.now()}-${Math.random()}`,
          reps: repsVal,
          weight: weightVal,
          done: false,
        })),
      };
    });

    const mappedExercises: Exercise[] = routine.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.exercise_name,
      category: 'barbell',
      isCustom: false,
      muscleGroup: exercise.muscle_group ?? null,
    }));

    setExercisesList(mappedExercises);
    setCurrentExerciseId(mappedExercises[0].id);
    setActiveRoutineId(routine.id);
    setSelectedRoutineId(routine.id);
    setRoutineProgress(initialProgress);
    setSetsList([]);
    applyRoutineDefaults(routine.exercises[0]);
    setIsRunning(true);
  };

  const handleSelectRoutineExercise = (exerciseId: string) => {
    if (!activeRoutine) return;
    setCurrentExerciseId(exerciseId);
    const exercise = activeRoutine.exercises.find((item) => item.id === exerciseId) || null;
    applyRoutineDefaults(exercise);
  };

  const handleOpenExerciseDetailByName = async (exerciseName: string) => {
    try {
      const allExercises = await exerciseDbService.getExercises();
      const normalizedName = exerciseName.toLowerCase().trim();
      const matched = allExercises.find(ex => ex.name.toLowerCase().trim() === normalizedName);
      if (matched) {
        setExerciseDetailItem(matched);
      } else {
        const results = await exerciseDbService.searchExercises(exerciseName);
        if (results && results.length > 0) {
          setExerciseDetailItem(results[0]);
        } else {
          triggerToast('Exercise instructions not found');
        }
      }
    } catch (e) {
      console.error('[LiftTab] Failed to lookup exercise details:', e);
      triggerToast('Error loading instructions');
    }
  };

  const updateRoutineProgress = (
    exerciseId: string,
    patch: Partial<{
      sets: string;
      reps: string;
      weight: string;
      doneSets: boolean[];
      setsDetails: Array<{ id: string; reps: string; weight: string; done: boolean }>;
    }>
  ) => {
    setRoutineProgress((prev) => {
      const current = prev[exerciseId];
      if (!current) return prev;

      let nextDoneSets = current.doneSets;
      let nextDetails = current.setsDetails || [];

      if (patch.setsDetails !== undefined) {
        nextDetails = patch.setsDetails;
        nextDoneSets = nextDetails.map((s) => s.done);
      } else if (patch.doneSets !== undefined) {
        nextDoneSets = patch.doneSets;
        nextDetails = nextDetails.map((s, idx) => ({
          ...s,
          done: nextDoneSets[idx] !== undefined ? nextDoneSets[idx] : s.done,
        }));
      }

      if (patch.sets !== undefined) {
        const nextCount = Math.max(1, parseInt(patch.sets, 10) || 1);
        if (nextCount > nextDetails.length) {
          const lastSet = nextDetails[nextDetails.length - 1];
          const defaultReps = lastSet ? lastSet.reps : current.reps;
          const defaultWeight = lastSet ? lastSet.weight : current.weight;
          const newSets = Array.from({ length: nextCount - nextDetails.length }, (_, idx) => ({
            id: `${exerciseId}-set-${nextDetails.length + idx}-${Date.now()}-${Math.random()}`,
            reps: defaultReps,
            weight: defaultWeight,
            done: false,
          }));
          nextDetails = [...nextDetails, ...newSets];
        } else if (nextCount < nextDetails.length) {
          nextDetails = nextDetails.slice(0, nextCount);
        }
        nextDoneSets = nextDetails.map((s) => s.done);
      }

      return {
        ...prev,
        [exerciseId]: {
          ...current,
          ...patch,
          doneSets: nextDoneSets,
          setsDetails: nextDetails,
          sets: String(nextDetails.length),
        },
      };
    });
  };

  useEffect(() => {
    if (!activeRoutine) return;
    if (activeRoutine.exercises.length === 0) return;
    const allDone = activeRoutine.exercises.every((exercise) =>
      routineProgress[exercise.id]?.doneSets?.every(Boolean)
    );
    if (allDone) {
      handleFinishSession();
    }
  }, [activeRoutine, routineProgress]);

  const handleSaveRoutineDefaults = async (exerciseId: string = currentExerciseId) => {
    if (!activeRoutine) return;

    const exercise = activeRoutine.exercises.find((item) => item.id === exerciseId) || null;
    if (!exercise) return;

    const authUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!authUser) {
      triggerToast('Please sign in to update routines');
      return;
    }

    const currentProgress = routineProgress[exerciseId] || {
      sets: String(exercise.sets),
      reps: String(exercise.reps),
      weight: formatWeight(isLbs ? exercise.weight_kg / 0.45359237 : exercise.weight_kg),
      doneSets: Array.from({ length: Math.max(1, exercise.sets) }, () => false),
    };

    const nextSets = Math.max(1, parseInt(currentProgress.sets, 10) || 1);
    const nextReps = Math.max(1, parseInt(currentProgress.reps, 10) || 1);
    const nextWeight = parseFloat(currentProgress.weight) || 0;
    const nextWeightKg = isLbs ? nextWeight * 0.45359237 : nextWeight;

    try {
      const updatedRoutine: Routine = {
        ...activeRoutine,
        exercises: activeRoutine.exercises.map((item) =>
          item.id === exercise.id
            ? { ...item, sets: nextSets, reps: nextReps, weight_kg: nextWeightKg }
            : item
        ),
      };
      const localRoutine = await updateRoutineWithExercisesLocal(
        authUser.id,
        activeRoutine.id,
        routineViewToLocalInput(updatedRoutine)
      );
      const updatedRoutineView = localRoutinesToViews([localRoutine])[0];

      setRoutines((prev) =>
        prev.map((routine) => {
          if (routine.id !== activeRoutine.id) return routine;
          return updatedRoutineView;
        })
      );

      setRoutineProgress((prev) => {
        const current = prev[exerciseId];
        if (!current) return prev;
        const nextDoneSets = Array.from({ length: nextSets }, (_, index) => current.doneSets[index] ?? false);
        return {
          ...prev,
          [exerciseId]: {
            ...current,
            sets: String(nextSets),
            reps: String(nextReps),
            weight: formatWeight(nextWeight),
            doneSets: nextDoneSets,
          },
        };
      });

      triggerToast('✓ Defaults updated');
      void syncRoutineToRemote(localRoutine);
    } catch (error) {
      console.error('[LiftTab] Failed to update local routine defaults:', error);
      triggerToast(`Defaults update failed: ${getErrorMessage(error)}`);
    }
  };

  // Create swipe handler for a specific set
  const createSwipeHandler = (setId: string) => {
    if (!swipeAnimRefs.current[setId]) {
      swipeAnimRefs.current[setId] = new Animated.Value(0);
    }

    if (!panResponderRefs.current[setId]) {
      panResponderRefs.current[setId] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt, { dx }) => Math.abs(dx) > 10,
        onPanResponderMove: (evt, { dx }) => {
          if (dx > 0) {
            swipeAnimRefs.current[setId]?.setValue(Math.min(dx, 100));
          }
        },
        onPanResponderRelease: (evt, { dx }) => {
          if (dx > 60) {
            // Swiped far enough — toggle check
            handleToggleCheck(setId);
            triggerToast('Set marked as complete!');
            Animated.timing(swipeAnimRefs.current[setId]!, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          } else {
            // Snap back
            Animated.timing(swipeAnimRefs.current[setId]!, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }
        },
      });
    }

    return panResponderRefs.current[setId];
  };

  const handleLogSet = () => {
    if (!currentExerciseId || !currentExercise.name.trim()) {
      triggerToast('Add or select an exercise before logging sets');
      return;
    }

    const w = parseFloat(inputWeight) || 0;
    const r = isUnilateral ? parseInt(inputRepsLeft) || 0 : parseInt(inputReps) || 0;
    const rL = isUnilateral ? parseInt(inputRepsLeft) || 0 : undefined;
    const rR = isUnilateral ? parseInt(inputRepsRight) || 0 : undefined;
    const rir = parseInt(inputRir) || 0;

    if (w <= 0 || r <= 0) {
      triggerToast('Please enter valid Weight and Reps!');
      return;
    }

    const newSet: SetLog = {
      id: createUniqueId('set'),
      exerciseId: currentExerciseId,
      exerciseName: currentExercise.name,
      muscleGroup: currentExercise.muscleGroup ?? null,
      setNum: currentExerciseSets.length + 1,
      weight: w,
      reps: r,
      repsLeft: rL,
      repsRight: rR,
      rir,
      isChecked: true,
    };

    setSetsList((prev) => [...prev, newSet]);
    triggerToast(
      isUnilateral
        ? `Logged Set #${newSet.setNum}: ${w}${isLbs ? 'lbs' : 'kg'} × L${rL} R${rR}`
        : `Logged Set #${newSet.setNum}: ${w}${isLbs ? 'lbs' : 'kg'} × ${r} reps`
    );
  };

  // Auto-fill from previous set
  const handleFillFromSet = (set: SetLog) => {
    setInputWeight(String(set.weight));
    if (set.repsLeft !== undefined && set.repsRight !== undefined) {
      setIsUnilateral(true);
      setInputRepsLeft(String(set.repsLeft));
      setInputRepsRight(String(set.repsRight));
    } else {
      setIsUnilateral(false);
      setInputReps(String(set.reps));
    }
    setInputRir(String(set.rir));
    triggerToast('✓ Inputs auto-filled from previous set');
  };

  const handleToggleFreestyleSet = (set: SetLog) => {
    const nextSets = setsList.map((s) => {
      if (s.id === set.id) {
        return { ...s, isChecked: !s.isChecked };
      }
      return s;
    });
    const wasChecked = set.isChecked;
    
    if (!wasChecked) {
      if (restTimeRemaining !== null && restTimeRemaining > 0) {
        Alert.alert(
          'Restart Rest Timer?',
          `A rest timer is already running. Would you like to restart the timer for Set ${set.setNum} of ${set.exerciseName}?`,
          [
            {
              text: 'Cancel (Misclick)',
              style: 'cancel',
            },
            {
              text: 'Yes, Start Timer',
              onPress: () => {
                setSetsList(nextSets);
                const tempExercise = {
                  id: set.exerciseId,
                  exercise_name: set.exerciseName,
                  rest_time_seconds: 90,
                };
                handleStartRestTimer(tempExercise as any, set.setNum);
              },
            },
          ]
        );
      } else {
        setSetsList(nextSets);
        const tempExercise = {
          id: set.exerciseId,
          exercise_name: set.exerciseName,
          rest_time_seconds: 90,
        };
        handleStartRestTimer(tempExercise as any, set.setNum);
      }
    } else {
      setSetsList(nextSets);
    }
  };

  const handleFreestyleWeightChange = (setId: string, val: string) => {
    setSetsList((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, weight: parseFloat(val) || 0 } : s))
    );
  };

  const handleFreestyleRepsChange = (setId: string, val: string) => {
    setSetsList((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, reps: parseInt(val, 10) || 0 } : s))
    );
  };

  const handleDeleteFreestyleSet = (exerciseId: string, setId: string) => {
    const exerciseSets = setsList.filter((s) => s.exerciseId === exerciseId);
    if (exerciseSets.length <= 1) {
      triggerToast('An exercise must have at least one set');
      return;
    }
    
    const filteredSets = setsList.filter((s) => s.id !== setId);
    let count = 1;
    const nextSets = filteredSets.map((s) => {
      if (s.exerciseId === exerciseId) {
         return { ...s, setNum: count++ };
      }
      return s;
    });
    setSetsList(nextSets);
  };

  const handleAddFreestyleSet = (exercise: Exercise) => {
    const exerciseSets = setsList.filter((s) => s.exerciseId === exercise.id).sort((a, b) => a.setNum - b.setNum);
    const lastSet = exerciseSets[exerciseSets.length - 1];
    const defaultWeight = lastSet ? lastSet.weight : 0;
    const defaultReps = lastSet ? lastSet.reps : 10;
    
    const newSet: SetLog = {
      id: `${exercise.id}-set-${exerciseSets.length}-${Date.now()}-${Math.random()}`,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup ?? null,
      setNum: exerciseSets.length + 1,
      weight: defaultWeight,
      reps: defaultReps,
      rir: 0,
      isChecked: false,
    };
    setSetsList((prev) => [...prev, newSet]);
  };

  const handleDeleteFreestyleExercise = (exerciseId: string) => {
    setExercisesList((prev) => prev.filter((e) => e.id !== exerciseId));
    setSetsList((prev) => prev.filter((s) => s.exerciseId !== exerciseId));
    if (currentExerciseId === exerciseId) {
      setCurrentExerciseId('');
    }
    triggerToast('Exercise removed from session');
  };

  const handleToggleCheck = (id: string) => {
    setSetsList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isChecked: !s.isChecked } : s))
    );
  };

  const handleAddCustomExercise = () => {
    if (!customExerciseName.trim()) {
      triggerToast('Please enter an exercise name!');
      return;
    }

    const newExercise: Exercise = {
      id: createUniqueId('custom-exercise'),
      name: customExerciseName,
      category: customExerciseCategory,
      isCustom: true,
      muscleGroup: customExerciseCategory,
    };

    setExercisesList((prev) => [...prev, newExercise]);
    setCurrentExerciseId(newExercise.id);
    setCustomExerciseName('');
    setShowCustomExerciseModal(false);
    triggerToast(`✓ Added custom exercise: ${customExerciseName}`);
  };

  const handleBodyPartClick = (muscleId: number, muscleName: string) => {
    setSelectedMuscleId(muscleId);
    setSelectedMuscleName(muscleName);
    setHighlightMode('click');
    setExerciseBrowserTarget(showRoutineModal ? 'routine' : 'workout');
    setShowExerciseBrowser(true);
  };

  const handleSelectExerciseFromDB = (exercise: ExerciseDbExercise) => {
    // Create exercise in local list
    const newExercise: Exercise = {
      id: createUniqueId('exercise'),
      name: exercise.name || `Exercise ${exercise.id}`,
      category: 'barbell',
      isCustom: false,
      muscleGroup: exercise.target || exercise.bodyPart || null,
    };

    // Debug: Log the exercise data
    console.log('[LiftTab] Exercise selected:', {
      name: newExercise.name,
      muscles: exercise.primaryMuscleIds,
      muscles_secondary: exercise.secondaryMuscleIds,
    });

    // Set highlighting to exercise mode showing what this exercise targets
    setPrimaryMuscleIds(exercise.primaryMuscleIds);
    setSecondaryMuscleIds(exercise.secondaryMuscleIds);
    setExercisesList((prev) => [...prev, newExercise]);
    setCurrentExerciseId(newExercise.id);
    setShowExerciseBrowser(false);
    triggerToast(`✓ Added: ${newExercise.name}`);
  };

  const normalizeExerciseName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const getRoutineDraftDefaults = (exerciseName: string) => {
    const normalized = normalizeExerciseName(exerciseName);

    const previousMatch = routines
      .flatMap((routine) => routine.exercises)
      .find((routineExercise) => normalizeExerciseName(routineExercise.exercise_name) === normalized);

    if (previousMatch) {
      const weightValue = isLbs ? previousMatch.weight_kg / 0.45359237 : previousMatch.weight_kg;
      return {
        sets: String(Math.max(1, previousMatch.sets)),
        reps: String(Math.max(1, previousMatch.reps)),
        weight: formatWeight(weightValue),
      };
    }

    return { sets: '3', reps: '10', weight: '' };
  };

  const handleAddExerciseToRoutineDraft = (exercise: ExerciseDbExercise) => {
    const exerciseName = (exercise.name || `Exercise ${exercise.id}`).trim();
    const muscleGroup = exercise.target || exercise.bodyPart || '';

    const exists = routineDraftExercises.some(
      (item) => normalizeExerciseName(item.name) === normalizeExerciseName(exerciseName)
    );
    if (exists) {
      triggerToast(`Already added: ${exerciseName}`);
      return;
    }

    const defaults = getRoutineDraftDefaults(exerciseName);

    setRoutineDraftExercises((prev) => [
      ...prev,
      {
        id: createUniqueId('routine-draft'),
        name: exerciseName,
        sets: defaults.sets,
        reps: defaults.reps,
        weight: defaults.weight,
        weightUnit: isLbs ? 'lbs' : 'kg',
        restTimeSeconds: '90',
        muscleGroup,
      },
    ]);
    requestAnimationFrame(() => {
      routineModalScrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleAddExerciseFromBrowser = (exercise: ExerciseDbExercise) => {
    // Pre-fill config sheet with smart defaults before adding
    const exerciseName = (exercise.name || `Exercise ${exercise.id}`).trim();
    const defaults = getRoutineDraftDefaults(exerciseName);

    setPendingExercise(exercise);
    setConfigSets(defaults.sets);
    setConfigReps(defaults.reps);
    setConfigWeight(defaults.weight);
    setConfigWeightUnit(isLbs ? 'lbs' : 'kg');
    setShowExerciseBrowser(false);
    setShowExerciseConfigSheet(true);
  };

  const handleConfirmExerciseConfig = () => {
    if (!pendingExercise) return;

    if (exerciseBrowserTarget === 'routine') {
      const exerciseName = (pendingExercise.name || `Exercise ${pendingExercise.id}`).trim();
      const muscleGroup = pendingExercise.target || pendingExercise.bodyPart || '';
      const exists = routineDraftExercises.some(
        (item) => normalizeExerciseName(item.name) === normalizeExerciseName(exerciseName)
      );
      if (exists) {
        triggerToast(`Already added: ${exerciseName}`);
        setShowExerciseConfigSheet(false);
        setPendingExercise(null);
        setShowRoutineModal(true);
        return;
      }
      setRoutineDraftExercises((prev) => [
        ...prev,
        {
          id: createUniqueId('routine-draft'),
          name: exerciseName,
          sets: configSets,
          reps: configReps,
          weight: configWeight,
          weightUnit: configWeightUnit,
          restTimeSeconds: '90',
          muscleGroup,
        },
      ]);
      requestAnimationFrame(() => {
        routineModalScrollRef.current?.scrollToEnd({ animated: true });
      });
      triggerToast(`✓ Added: ${exerciseName} — keep adding or save`);
      setShowExerciseConfigSheet(false);
      setPendingExercise(null);
      // Return to routine modal so user can keep adding more exercises
      setShowRoutineModal(true);
    } else {
      // Workout target — add exercise and pre-fill the log inputs
      const newExercise: Exercise = {
        id: createUniqueId('exercise'),
        name: pendingExercise.name || `Exercise ${pendingExercise.id}`,
        category: 'barbell',
        isCustom: false,
        muscleGroup: pendingExercise.target || pendingExercise.bodyPart || null,
      };
      setPrimaryMuscleIds(pendingExercise.primaryMuscleIds);
      setSecondaryMuscleIds(pendingExercise.secondaryMuscleIds);
      setExercisesList((prev) => [...prev, newExercise]);
      setCurrentExerciseId(newExercise.id);
      // Pre-fill log inputs from config
      const weightInCurrentUnit =
        configWeightUnit === 'lbs' && !isLbs
          ? formatWeight(parseFloat(configWeight) * 0.45359237)
          : configWeightUnit === 'kg' && isLbs
          ? formatWeight(parseFloat(configWeight) / 0.45359237)
          : configWeight;
      setInputWeight(weightInCurrentUnit);
      setInputReps(configReps);
      setInputRepsLeft(configReps);
      setInputRepsRight(configReps);

      // Initialize sets in setsList
      const setsCount = parseInt(configSets, 10) || 3;
      const initialSets: SetLog[] = Array.from({ length: setsCount }, (_, idx) => ({
        id: `${newExercise.id}-set-${idx}-${Date.now()}-${Math.random()}`,
        exerciseId: newExercise.id,
        exerciseName: newExercise.name,
        muscleGroup: newExercise.muscleGroup,
        setNum: idx + 1,
        weight: parseFloat(weightInCurrentUnit) || 0,
        reps: parseInt(configReps, 10) || 10,
        rir: 0,
        isChecked: false,
      }));
      setSetsList((prev) => [...prev, ...initialSets]);

      triggerToast(`✓ Added: ${newExercise.name}`);
    }

    setShowExerciseConfigSheet(false);
    setPendingExercise(null);
  };

  const completedSetsCount = useMemo(() => {
    return Object.values(routineProgress).reduce((acc, progress) => {
      return acc + progress.doneSets.filter((done) => done).length;
    }, 0);
  }, [routineProgress]);

  const totalSetsCount = useMemo(() => {
    return Object.values(routineProgress).reduce((acc, progress) => {
      return acc + progress.doneSets.length;
    }, 0);
  }, [routineProgress]);

  const renderSearchSection = (context: 'main' | 'routine') => {
    const isMain = context === 'main';
    const isFreestyleActive = isMain && isRunning && !activeRoutine;

    const handleClearSearch = () => {
      setSearchQuery('');
      setSearchResults([]);
    };

    const handleAddClick = (exercise: ExerciseDbExercise) => {
      if (context === 'routine') {
        setExerciseBrowserTarget('routine');
        handleAddExerciseFromBrowser(exercise);
      } else if (isFreestyleActive) {
        setExerciseBrowserTarget('workout');
        handleAddExerciseFromBrowser(exercise);
      }
    };

    return (
      <View style={styles.searchSectionContainer}>
        <View style={styles.searchBarWrapper}>
          <Search size={16} color={Colors.outline} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputField}
            placeholder="Search exercises (e.g. Bench Press)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.outline}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.searchClearBtn} activeOpacity={0.6}>
              <X size={16} color={Colors.outline} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.trim().length >= 2 && (
          <View style={styles.searchResultsContainer}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsTitle}>Search Results</Text>
              {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 6 }} />}
            </View>
            
            {searchResults.length === 0 ? (
              <View style={styles.searchNoResults}>
                <Text style={styles.searchNoResultsText}>
                  {isSearching ? 'Searching...' : 'No matching exercises found'}
                </Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.searchResultsScroll} 
                contentContainerStyle={styles.searchResultsScrollContent}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {searchResults.map((exercise) => {
                  const showAddButton = context === 'routine' || isFreestyleActive;
                  return (
                    <TouchableOpacity
                      key={exercise.id}
                      style={styles.searchResultRow}
                      onPress={() => setExerciseDetailItem(exercise)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.searchResultLeft}>
                        <View style={styles.searchResultIconBox}>
                          <Dumbbell size={14} color={Colors.primary} />
                        </View>
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName} numberOfLines={1}>
                            {exercise.name}
                          </Text>
                          <Text style={styles.searchResultMeta} numberOfLines={1}>
                            {exercise.target ? exercise.target : 'General'} · {exercise.equipment}
                          </Text>
                        </View>
                      </View>
                      
                      {showAddButton ? (
                        <TouchableOpacity
                          style={styles.searchResultAddBtn}
                          onPress={() => handleAddClick(exercise)}
                          activeOpacity={0.7}
                        >
                          <Plus size={12} color={Colors.primary} style={{ marginRight: 2 }} />
                          <Text style={styles.searchResultAddText}>Add</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.searchResultChevron}>
                          <Info size={14} color={Colors.outline} opacity={0.6} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    );
  };

  const handleDiscardSession = () => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to discard this training session? Progress will not be saved.',
      [
        { text: 'Keep Training', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => resetFinishedSessionState() },
      ],
      { cancelable: true }
    );
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Global Search Bar */}
        {renderSearchSection('main')}
        {/* Session Timer Card */}
        <View style={[styles.timerCard, (activeRoutineId || elapsedSecs > 0) && styles.timerCardActive]}>
          {activeRoutineId || elapsedSecs > 0 ? (
            // Active Session State
            <View style={styles.activeSessionContainer}>
              <View style={styles.timerHeaderRow}>
                <View style={[styles.statusBadge, isRunning ? styles.statusBadgeActive : styles.statusBadgePaused]}>
                  <View style={[styles.statusDot, isRunning ? styles.statusDotActive : styles.statusDotPaused]} />
                  <Text style={[styles.statusText, isRunning ? styles.statusTextActive : styles.statusTextPaused]}>
                    {isRunning ? 'TRAINING ACTIVE' : 'SESSION PAUSED'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.discardTextButton}
                  onPress={handleDiscardSession}
                  activeOpacity={0.7}
                >
                  <Text style={styles.discardText}>Discard</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.activeSessionMain}>
                <View style={styles.activeSessionDetails}>
                  <Text style={styles.activeRoutineName} numberOfLines={1}>
                    {activeRoutine ? activeRoutine.name : 'Freestyle Workout'}
                  </Text>
                  <Text style={styles.activeProgressText}>
                    {totalSetsCount > 0
                      ? `${completedSetsCount} of ${totalSetsCount} sets completed`
                      : 'No sets logged yet'
                    }
                  </Text>
                </View>
                <Animated.Text style={[styles.timerDisplay, { transform: [{ scale: scaleAnim }] }]}>
                  {formatTime(elapsedSecs)}
                </Animated.Text>
              </View>

              {totalSetsCount > 0 && (
                <View style={styles.activeProgressBarContainer}>
                  <View
                    style={[
                      styles.activeProgressBarFill,
                      { width: `${(completedSetsCount / totalSetsCount) * 100}%` }
                    ]}
                  />
                </View>
              )}

              <View style={styles.activeActionsRow}>
                {isRunning ? (
                  <TouchableOpacity
                    style={[styles.timerBtn, styles.btnPause]}
                    onPress={() => setIsRunning(false)}
                    activeOpacity={0.8}
                  >
                    <Pause size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.btnPauseText}>Pause</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.timerBtn, styles.btnResume]}
                    onPress={() => setIsRunning(true)}
                    activeOpacity={0.8}
                  >
                    <Play size={14} color={Colors.onPrimary} fill={Colors.onPrimary} style={{ marginRight: 6 }} />
                    <Text style={styles.btnResumeText}>Resume</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.timerBtn, styles.btnFinishActive]}
                  onPress={handleFinishSession}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnFinishText}>Finish Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Idle / No Active Session State
            <View style={styles.idleSessionContainer}>
              <View style={styles.idleSessionHeader}>
                <Dumbbell size={20} color={Colors.primary} />
                <Text style={styles.idleSessionTitle}>START A NEW WORKOUT</Text>
              </View>
              <Text style={styles.idleSessionSubtitle}>
                Select a routine template below to begin tracking, or start a freestyle session to log sets manually.
              </Text>
              <TouchableOpacity
                style={styles.btnFreestyle}
                onPress={() => {
                  setSetsList([]);
                  setExercisesList([]);
                  setCurrentExerciseId('');
                  setRoutineProgress({});
                  setIsRunning(true);
                }}
                activeOpacity={0.8}
              >
                <Play size={14} color={Colors.onPrimary} fill={Colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.btnFreestyleText}>Start Freestyle Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Routine Section */}
        <View style={styles.routineCard}>
          <View style={styles.routineHeaderRow}>
            <Text style={styles.routineTitle}>ROUTINES</Text>
            <TouchableOpacity
              style={styles.routineAddButton}
              onPress={() => {
                resetRoutineDraft();
                setShowRoutineModal(true);
              }}
              activeOpacity={0.8}
            >
              <Plus size={12} color={Colors.primary} strokeWidth={3} />
              <Text style={styles.routineAddText}>Create</Text>
            </TouchableOpacity>
          </View>

          {!user ? (
            <Text style={styles.routineHint}>Sign in to save routines across devices.</Text>
          ) : isRoutineLoading ? (
            <Text style={styles.routineHint}>Loading routines...</Text>
          ) : routines.length === 0 ? (
            <Text style={styles.routineHint}>No routines yet. Create one to get started.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routinePills}>
              {routines.map((routine) => (
                <TouchableOpacity
                  key={routine.id}
                  style={[
                    styles.routinePill,
                    selectedRoutineId === routine.id && styles.routinePillActive,
                  ]}
                  onPress={() => setSelectedRoutineId(routine.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.routinePillText,
                      selectedRoutineId === routine.id && styles.routinePillTextActive,
                    ]}
                  >
                    {routine.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {selectedRoutine && (
            <View style={styles.routineDetails}>
              {selectedRoutine.exercises.length === 0 ? (
                <Text style={styles.routineHint}>No exercises saved yet.</Text>
              ) : (
                <View style={styles.routineExerciseList}>
                  {selectedRoutine.exercises.map((exercise) => {
                    const isActiveExercise = currentExerciseId === exercise.id && activeRoutineId === selectedRoutine.id;
                    const weightValue = isLbs
                      ? exercise.weight_kg / 0.45359237
                      : exercise.weight_kg;
                    const weightLabel = isLbs ? 'lbs' : 'kg';
                    const weightText = formatWeight(weightValue) || '—';
                    return (
                      <TouchableOpacity
                        key={exercise.id}
                        style={[
                          styles.routineExerciseRow,
                          isActiveExercise && styles.routineExerciseRowActive,
                        ]}
                        onPress={() => {
                          if (activeRoutineId === selectedRoutine.id) {
                            handleSelectRoutineExercise(exercise.id);
                          } else {
                            handleOpenExerciseDetailByName(exercise.exercise_name);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.routineExerciseInfo}>
                          <Text style={styles.routineExerciseName}>{exercise.exercise_name}</Text>
                          <Text style={styles.routineExerciseMeta}>
                            {exercise.sets} sets × {exercise.reps} reps @ {weightText} {weightLabel}
                          </Text>
                        </View>
                        {activeRoutineId === selectedRoutine.id && (
                          <Text style={styles.routineExerciseTag}>Active</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.routineStartButton,
                  activeRoutineId === selectedRoutine.id && styles.routineStartButtonActive,
                ]}
                onPress={() => handleStartRoutine(selectedRoutine)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.routineStartText,
                    activeRoutineId === selectedRoutine.id && styles.routineStartTextActive,
                  ]}
                >
                  {activeRoutineId === selectedRoutine.id ? 'Routine Active' : 'Start Routine'}
                </Text>
              </TouchableOpacity>

              <View style={styles.routineActionRow}>
                <TouchableOpacity
                  style={styles.routineEditButton}
                  onPress={() => startEditRoutine(selectedRoutine)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.routineEditText}>Edit Routine</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.routineDeleteButton}
                  onPress={() => handleDeleteRoutine(selectedRoutine)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.routineDeleteText}>Delete Routine</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Routine Workout Card */}
        <View style={styles.card}>
          {activeRoutine ? (
            <>
              <View style={styles.exerciseHeader}>
                <View style={styles.routineHighlightBadge}>
                  <View style={styles.tagChipContent}>
                    <Dumbbell size={10} color={Colors.primaryContainer} style={{ marginRight: 4 }} />
                    <Text style={styles.tagChipText}>Routine</Text>
                  </View>
                  <View style={styles.unitToggleRow}>
                    <TouchableOpacity onPress={() => toggleUnit(true)}>
                      <Text style={[styles.unitBtn, isLbs && styles.unitBtnActive]}>lbs</Text>
                    </TouchableOpacity>
                    <Text style={styles.unitSlash}>/</Text>
                    <TouchableOpacity onPress={() => toggleUnit(false)}>
                      <Text style={[styles.unitBtn, !isLbs && styles.unitBtnActive]}>kg</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.exerciseTitle}>{activeRoutine.name}</Text>
              </View>

              <View style={styles.routineWorkoutList}>
                {activeRoutine.exercises.map((exercise) => {
                  const progress = routineProgress[exercise.id] || (() => {
                    const weightValue = isLbs ? exercise.weight_kg / 0.45359237 : exercise.weight_kg;
                    const setCount = Math.max(1, exercise.sets);
                    const repsVal = String(exercise.reps || 10);
                    const weightVal = formatWeight(weightValue);
                    return {
                      sets: String(setCount),
                      reps: repsVal,
                      weight: weightVal,
                      doneSets: Array.from({ length: setCount }, () => false),
                      setsDetails: Array.from({ length: setCount }, (_, idx) => ({
                        id: `${exercise.id}-set-${idx}-${Date.now()}-${Math.random()}`,
                        reps: repsVal,
                        weight: weightVal,
                        done: false,
                      })),
                    };
                  })();

                  const details = progress.setsDetails || [];

                  const handleToggleSet = (setIdx: number) => {
                    const nextDetails = details.map((s, sIdx) =>
                      sIdx === setIdx ? { ...s, done: !s.done } : s
                    );
                    const wasDone = details[setIdx].done;

                    if (!wasDone) {
                      if (restTimeRemaining !== null && restTimeRemaining > 0) {
                        Alert.alert(
                          'Restart Rest Timer?',
                          `A rest timer is already running. Would you like to restart the timer for Set ${setIdx + 1} of ${exercise.exercise_name}?`,
                          [
                            {
                              text: 'Cancel (Misclick)',
                              style: 'cancel',
                            },
                            {
                              text: 'Yes, Start Timer',
                              onPress: () => {
                                updateRoutineProgress(exercise.id, { setsDetails: nextDetails });
                                handleStartRestTimer(exercise, setIdx + 1);
                              },
                            },
                          ]
                        );
                      } else {
                        updateRoutineProgress(exercise.id, { setsDetails: nextDetails });
                        handleStartRestTimer(exercise, setIdx + 1);
                      }
                    } else {
                      updateRoutineProgress(exercise.id, { setsDetails: nextDetails });
                    }
                  };

                  const handleWeightChange = (setIdx: number, val: string) => {
                    const nextDetails = details.map((s, sIdx) =>
                      sIdx === setIdx ? { ...s, weight: val } : s
                    );
                    updateRoutineProgress(exercise.id, { setsDetails: nextDetails });
                  };

                  const handleRepsChange = (setIdx: number, val: string) => {
                    const nextDetails = details.map((s, sIdx) =>
                      sIdx === setIdx ? { ...s, reps: val } : s
                    );
                    updateRoutineProgress(exercise.id, { setsDetails: nextDetails });
                  };

                  const handleDeleteSet = (setIdx: number) => {
                    if (details.length <= 1) {
                      triggerToast('An exercise must have at least one set');
                      return;
                    }
                    const nextDetails = details.filter((_, sIdx) => sIdx !== setIdx);
                    updateRoutineProgress(exercise.id, { setsDetails: nextDetails });
                  };

                  const handleAddSet = () => {
                    const lastSet = details[details.length - 1];
                    const defaultReps = lastSet ? lastSet.reps : String(exercise.reps || 10);
                    const defaultWeight = lastSet ? lastSet.weight : formatWeight(isLbs ? exercise.weight_kg / 0.45359237 : exercise.weight_kg);
                    const newSet = {
                      id: `${exercise.id}-set-${details.length}-${Date.now()}-${Math.random()}`,
                      reps: defaultReps,
                      weight: defaultWeight,
                      done: false,
                    };
                    const nextDetails = [...details, newSet];
                    updateRoutineProgress(exercise.id, { setsDetails: nextDetails });
                  };

                  return (
                    <View key={exercise.id} style={styles.routineWorkoutRow}>
                      <View style={styles.routineWorkoutHeader}>
                        <Text style={styles.routineWorkoutName}>{exercise.exercise_name}</Text>
                        <TouchableOpacity
                          style={styles.instructionIconButton}
                          onPress={() => handleOpenExerciseDetailByName(exercise.exercise_name)}
                          activeOpacity={0.7}
                        >
                          <Info size={16} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>

                      {/* Sets Table */}
                      <View style={styles.setsTableContainer}>
                        {/* Table Header */}
                        <View style={styles.setsTableHeader}>
                          <Text style={[styles.setsTableHeaderCell, styles.cellCheck]} />
                          <Text style={[styles.setsTableHeaderCell, styles.cellLabel]}>Set</Text>
                          <Text style={[styles.setsTableHeaderCell, styles.cellInput]}>{isLbs ? 'lbs' : 'kg'}</Text>
                          <Text style={[styles.setsTableHeaderCell, styles.cellInput]}>Reps</Text>
                          <Text style={[styles.setsTableHeaderCell, styles.cellAction]} />
                        </View>

                        {/* Table Rows */}
                        {details.map((setDetail, setIndex) => (
                          <View key={setDetail.id} style={[styles.setsTableRow, setDetail.done && styles.setsTableRowDone]}>
                            {/* Checkbox */}
                            <TouchableOpacity
                              style={[styles.setRowCheckBtn, setDetail.done && styles.setRowCheckBtnDone]}
                              onPress={() => handleToggleSet(setIndex)}
                              activeOpacity={0.7}
                            >
                              {setDetail.done && <Check size={10} color="#ffffff" strokeWidth={3} />}
                            </TouchableOpacity>

                            {/* Label */}
                            <View style={styles.setRowLabelContainer}>
                              <Text style={styles.setRowLabel}>Set {setIndex + 1}</Text>
                            </View>

                            {/* Weight Input */}
                            <TextInput
                              style={[styles.setRowInput, setDetail.done && styles.setRowInputDone]}
                              value={setDetail.weight}
                              onChangeText={(val) => handleWeightChange(setIndex, val)}
                              keyboardType="decimal-pad"
                              textAlign="center"
                              editable={!setDetail.done}
                              placeholder="0"
                              placeholderTextColor={Colors.outline}
                            />

                            {/* Reps Input */}
                            <TextInput
                              style={[styles.setRowInput, setDetail.done && styles.setRowInputDone]}
                              value={setDetail.reps}
                              onChangeText={(val) => handleRepsChange(setIndex, val)}
                              keyboardType="number-pad"
                              textAlign="center"
                              editable={!setDetail.done}
                              placeholder="0"
                              placeholderTextColor={Colors.outline}
                            />

                            {/* Action Button */}
                            {details.length > 1 ? (
                              <TouchableOpacity
                                style={styles.setRowDeleteBtn}
                                onPress={() => handleDeleteSet(setIndex)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={14} color="#ef4444" />
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.setRowDeleteBtnPlaceholder} />
                            )}
                          </View>
                        ))}
                      </View>

                      {/* Add Set Button */}
                      <TouchableOpacity
                        style={styles.addSetDashedBtn}
                        onPress={handleAddSet}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                        <Text style={styles.addSetDashedBtnText}>Add Set</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </>
          ) : isRunning ? (
            <>
              <View style={styles.exerciseHeader}>
                <View style={styles.routineHighlightBadge}>
                  <View style={styles.tagChipContent}>
                    <Shuffle size={10} color={Colors.primaryContainer} style={{ marginRight: 4 }} />
                    <Text style={styles.tagChipText}>Freestyle</Text>
                  </View>
                  <View style={styles.unitToggleRow}>
                    <TouchableOpacity onPress={() => toggleUnit(true)}>
                      <Text style={[styles.unitBtn, isLbs && styles.unitBtnActive]}>lbs</Text>
                    </TouchableOpacity>
                    <Text style={styles.unitSlash}>/</Text>
                    <TouchableOpacity onPress={() => toggleUnit(false)}>
                      <Text style={[styles.unitBtn, !isLbs && styles.unitBtnActive]}>kg</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.exerciseTitle}>Freestyle Workout</Text>
              </View>

              {exercisesList.length === 0 ? (
                <View style={styles.freestyleEmptyState}>
                  <Text style={styles.freestyleEmptyText}>
                    Use the search bar at the top to search and add exercises to this workout session.
                  </Text>
                </View>
              ) : (
                <View style={styles.routineWorkoutList}>
                  {exercisesList.map((exercise) => {
                    const exerciseSets = setsList
                      .filter((s) => s.exerciseId === exercise.id)
                      .sort((a, b) => a.setNum - b.setNum);

                    return (
                      <View key={exercise.id} style={styles.routineWorkoutRow}>
                        <View style={styles.routineWorkoutHeader}>
                          <Text style={styles.routineWorkoutName}>{exercise.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity
                              style={styles.instructionIconButton}
                              onPress={() => handleOpenExerciseDetailByName(exercise.name)}
                              activeOpacity={0.7}
                            >
                              <Info size={16} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.instructionIconButton, { marginLeft: 12 }]}
                              onPress={() => handleDeleteFreestyleExercise(exercise.id)}
                              activeOpacity={0.7}
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Sets Table */}
                        <View style={styles.setsTableContainer}>
                          {/* Table Header */}
                          <View style={styles.setsTableHeader}>
                            <Text style={[styles.setsTableHeaderCell, styles.cellCheck]} />
                            <Text style={[styles.setsTableHeaderCell, styles.cellLabel]}>Set</Text>
                            <Text style={[styles.setsTableHeaderCell, styles.cellInput]}>{isLbs ? 'lbs' : 'kg'}</Text>
                            <Text style={[styles.setsTableHeaderCell, styles.cellInput]}>Reps</Text>
                            <Text style={[styles.setsTableHeaderCell, styles.cellAction]} />
                          </View>

                          {/* Table Rows */}
                          {exerciseSets.map((setDetail, setIndex) => (
                            <View key={setDetail.id} style={[styles.setsTableRow, setDetail.isChecked && styles.setsTableRowDone]}>
                              {/* Checkbox */}
                              <TouchableOpacity
                                style={[styles.setRowCheckBtn, setDetail.isChecked && styles.setRowCheckBtnDone]}
                                onPress={() => handleToggleFreestyleSet(setDetail)}
                                activeOpacity={0.7}
                              >
                                {setDetail.isChecked && <Check size={10} color="#ffffff" strokeWidth={3} />}
                              </TouchableOpacity>

                              {/* Label */}
                              <View style={styles.setRowLabelContainer}>
                                <Text style={styles.setRowLabel}>Set {setDetail.setNum}</Text>
                              </View>

                              {/* Weight Input */}
                              <TextInput
                                style={[styles.setRowInput, setDetail.isChecked && styles.setRowInputDone]}
                                value={String(setDetail.weight || '')}
                                onChangeText={(val) => handleFreestyleWeightChange(setDetail.id, val)}
                                keyboardType="decimal-pad"
                                textAlign="center"
                                editable={!setDetail.isChecked}
                                placeholder="0"
                                placeholderTextColor={Colors.outline}
                              />

                              {/* Reps Input */}
                              <TextInput
                                style={[styles.setRowInput, setDetail.isChecked && styles.setRowInputDone]}
                                value={String(setDetail.reps || '')}
                                onChangeText={(val) => handleFreestyleRepsChange(setDetail.id, val)}
                                keyboardType="number-pad"
                                textAlign="center"
                                editable={!setDetail.isChecked}
                                placeholder="0"
                                placeholderTextColor={Colors.outline}
                              />

                              {/* Action Button */}
                              {exerciseSets.length > 1 ? (
                                <TouchableOpacity
                                  style={styles.setRowDeleteBtn}
                                  onPress={() => handleDeleteFreestyleSet(exercise.id, setDetail.id)}
                                  activeOpacity={0.7}
                                >
                                  <Trash2 size={14} color="#ef4444" />
                                </TouchableOpacity>
                              ) : (
                                <View style={styles.setRowDeleteBtnPlaceholder} />
                              )}
                            </View>
                          ))}
                        </View>

                        {/* Add Set Button */}
                        <TouchableOpacity
                          style={styles.addSetDashedBtn}
                          onPress={() => handleAddFreestyleSet(exercise)}
                          activeOpacity={0.7}
                        >
                          <Plus size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.addSetDashedBtnText}>Add Set</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <View style={styles.routineEmptyState}>
              <Text style={styles.routineHint}>Start a routine to track sets, reps, and weight.</Text>
            </View>
          )}
        </View>

        {/* Set History Table */}
        {currentExerciseSets.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SET HISTORY</Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 0.6 }]}>Set #</Text>
              <Text style={[styles.thText, { flex: 1.4 }]}>Previous</Text>
              <Text style={[styles.thText, { flex: 2 }]}>Log</Text>
              <Text style={[styles.thText, { flex: 0.8, textAlign: 'right' }]}>Done</Text>
            </View>

            <View style={styles.tableBody}>
              {currentExerciseSets.map((set) => {
                const animValue = swipeAnimRefs.current[set.id] || new Animated.Value(0);
                const panResponder = createSwipeHandler(set.id);

                return (
                  <Animated.View
                    key={set.id}
                    style={[
                      styles.tableRowWrapper,
                      {
                        transform: [{ translateX: animValue }],
                        backgroundColor: animValue.interpolate({
                          inputRange: [0, 100],
                          outputRange: [set.isChecked ? 'rgba(16, 185, 129, 0.15)' : 'transparent', '#10b981'],
                        }),
                      },
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <TouchableOpacity
                      style={styles.tableRowContent}
                      onPress={() => handleFillFromSet(set)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tdSetNum, { flex: 0.6 }]}>{set.setNum}</Text>
                      <Text style={[styles.tdPrevious, { flex: 1.4 }]}>
                        {set.setNum === 1 ? '175 lbs × 8' : set.setNum === 2 ? '175 lbs × 8' : '—'}
                      </Text>
                      <Text style={[styles.tdLog, { flex: 2 }]}>
                        {set.weight} {isLbs ? 'lbs' : 'kg'} ×{' '}
                        {set.repsLeft !== undefined && set.repsRight !== undefined
                          ? `L${set.repsLeft} R${set.repsRight}`
                          : `${set.reps}`}{' '}
                        (RIR {set.rir})
                      </Text>
                      <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                        <Copy size={14} color={Colors.outline} opacity={0.5} />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}

        {completedWorkouts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>WORKOUT HISTORY</Text>
            <View style={styles.savedWorkoutList}>
              {completedWorkouts.map((workout, index) => {
                const syncStatus = workout.sync_status || 'pending';
                return (
                  <TouchableOpacity
                    key={workout.id}
                    style={[
                      styles.savedWorkoutRow,
                      index > 0 && styles.savedWorkoutRowBorder
                    ]}
                    onPress={() => setSelectedHistoryWorkout(workout)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.savedWorkoutLeft}>
                      <View style={styles.savedWorkoutIconWrapper}>
                        <Dumbbell size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.savedWorkoutInfo}>
                        <View style={styles.savedWorkoutNameRow}>
                          <Text style={styles.savedWorkoutName} numberOfLines={1}>
                            {workout.name}
                          </Text>
                          <Text style={[styles.syncStatusPill, styles[`syncStatus_${syncStatus}`]]}>
                            {syncStatus}
                          </Text>
                        </View>
                        <Text style={styles.savedWorkoutDate}>
                          {workout.performed_at.split('T')[0]}
                          {getWorkoutDurationLabel(workout.notes) ? ` · ${getWorkoutDurationLabel(workout.notes)}` : ''}
                        </Text>
                        <Text style={styles.savedWorkoutSetsText} numberOfLines={1}>
                          {[...new Set(workout.sets.map((s) => s.exercise_name))]
                            .slice(0, 3)
                            .join(', ') || 'No exercises'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.savedWorkoutStats}>
                      <Text style={styles.savedWorkoutSetsNumber}>{workout.sets.length}</Text>
                      <Text style={styles.savedWorkoutSetsLabel}>sets</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Routine Builder Modal */}
      <Modal
        visible={showRoutineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoutineModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.routineModalShell}
        >
          {/* Fixed header — always visible */}
          <View style={styles.routineModalHeader}>
            <View style={styles.routineModalHandleBar} />
            <View style={styles.routineModalTitleRow}>
              <Text style={styles.modalTitle}>
                {editingRoutineId ? 'Edit Routine' : 'Create Routine'}
              </Text>
              <TouchableOpacity onPress={() => setShowRoutineModal(false)} activeOpacity={0.6}>
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.routineNameInput}
              placeholder="Routine name  (e.g. Push Day)"
              value={routineNameInput}
              onChangeText={setRoutineNameInput}
              placeholderTextColor={Colors.outline}
            />

            <View style={styles.routineRestTimeRow}>
              <Text style={styles.routineRestTimeLabel}>Rest duration (seconds):</Text>
              <TextInput
                style={styles.routineRestTimeInput}
                placeholder="90"
                value={routineRestTimeInput}
                onChangeText={setRoutineRestTimeInput}
                keyboardType="number-pad"
                placeholderTextColor={Colors.outline}
              />
            </View>
          </View>

          {/* Scrollable body — map + exercises flow together */}
          <ScrollView
            ref={routineModalScrollRef}
            style={styles.routineModalScroll}
            contentContainerStyle={styles.routineModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Search Bar for Routine Builder */}
            {renderSearchSection('routine')}
            {/* Body map picker */}
            <View style={styles.routinePickerCard}>
              <Text style={styles.routinePickerTitle}>Tap a muscle to add exercises</Text>
              <BodyMuscleMap
                onBodyPartClick={handleBodyPartClick}
                isInteractive={true}
                highlightMode={highlightMode}
                selectedMuscleId={selectedMuscleId || undefined}
                primaryMuscleIds={primaryMuscleIds}
                secondaryMuscleIds={secondaryMuscleIds}
              />
            </View>

            {/* Exercise list — directly below the map, no nested scroll */}
            <View style={styles.routineDraftSection}>
              <View style={styles.routineDraftSectionHeader}>
                <Text style={styles.routineDraftSectionTitle}>
                  {routineDraftExercises.length === 0
                    ? 'NO EXERCISES YET'
                    : `${routineDraftExercises.length} EXERCISE${routineDraftExercises.length > 1 ? 'S' : ''}`}
                </Text>
                <TouchableOpacity onPress={addDraftExercise} activeOpacity={0.8}>
                  <Text style={styles.addRowText}>+ Manual</Text>
                </TouchableOpacity>
              </View>

              {routineDraftExercises.length === 0 ? (
                <View style={styles.routineDraftEmpty}>
                  <Text style={styles.routineDraftEmptyText}>
                    Tap any muscle on the map above to browse exercises and build your routine.
                  </Text>
                </View>
              ) : (
                routineDraftExercises.map((exercise, exIdx) => (
                  <View key={exercise.id} style={styles.routineDraftCard}>
                    {/* Card header row */}
                    <View style={styles.routineDraftCardHeader}>
                      <View style={styles.routineDraftIndexBadge}>
                        <Text style={styles.routineDraftIndexText}>{exIdx + 1}</Text>
                      </View>
                      <TextInput
                        style={styles.routineDraftNameInput}
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChangeText={(value) => updateDraftExercise(exercise.id, { name: value })}
                        placeholderTextColor={Colors.outline}
                      />
                      <TouchableOpacity
                        style={styles.routineRemoveBtn}
                        onPress={() => removeDraftExercise(exercise.id)}
                        activeOpacity={0.8}
                        hitSlop={8}
                      >
                        <X size={14} color={Colors.outline} />
                      </TouchableOpacity>
                    </View>

                    {/* Metrics row */}
                    <View style={styles.routineDraftMetrics}>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Sets</Text>
                        <TextInput
                          style={styles.metricInput}
                          value={exercise.sets}
                          onChangeText={(value) => updateDraftExercise(exercise.id, { sets: value })}
                          keyboardType="number-pad"
                          textAlign="center"
                        />
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Reps</Text>
                        <TextInput
                          style={styles.metricInput}
                          value={exercise.reps}
                          onChangeText={(value) => updateDraftExercise(exercise.id, { reps: value })}
                          keyboardType="number-pad"
                          textAlign="center"
                        />
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Weight</Text>
                        <TextInput
                          style={styles.metricInput}
                          value={exercise.weight}
                          onChangeText={(value) => updateDraftExercise(exercise.id, { weight: value })}
                          keyboardType="decimal-pad"
                          textAlign="center"
                        />
                      </View>

                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Unit</Text>
                        <View style={styles.unitToggleRowSmall}>
                          <TouchableOpacity
                            onPress={() => updateDraftExercise(exercise.id, { weightUnit: 'lbs' })}
                          >
                            <Text style={[styles.unitBtn, exercise.weightUnit === 'lbs' && styles.unitBtnActive]}>
                              lbs
                            </Text>
                          </TouchableOpacity>
                          <Text style={styles.unitSlash}>/</Text>
                          <TouchableOpacity
                            onPress={() => updateDraftExercise(exercise.id, { weightUnit: 'kg' })}
                          >
                            <Text style={[styles.unitBtn, exercise.weightUnit === 'kg' && styles.unitBtnActive]}>
                              kg
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Save / Cancel buttons at the bottom of the scroll */}
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleCreateRoutine}
              activeOpacity={0.85}
              disabled={isSavingRoutine}
            >
              <Text style={styles.modalConfirmBtnText}>
                {isSavingRoutine ? 'Saving...' : editingRoutineId ? 'Update Routine' : 'Save Routine'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                resetRoutineDraft();
                setShowRoutineModal(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Exercise Modal */}
      <Modal
        visible={showCustomExerciseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomExerciseModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Exercise</Text>
              <TouchableOpacity onPress={() => setShowCustomExerciseModal(false)} activeOpacity={0.6}>
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Exercise Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Cable Chest Fly"
              value={customExerciseName}
              onChangeText={setCustomExerciseName}
              placeholderTextColor={Colors.outline}
            />

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {(['barbell', 'dumbbell', 'cable', 'bodyweight', 'machine'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryBtn, customExerciseCategory === cat && styles.categoryBtnActive]}
                  onPress={() => setCustomExerciseCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryBtnText,
                      customExerciseCategory === cat && styles.categoryBtnTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddCustomExercise} activeOpacity={0.85}>
              <Text style={styles.modalConfirmBtnText}>Add Exercise</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowCustomExerciseModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* WGER Exercise Browser Modal */}
      <WGERExerciseBrowser
        visible={showExerciseBrowser}
        muscleId={selectedMuscleId}
        muscleName={selectedMuscleName}
        onClose={() => {
          setShowExerciseBrowser(false);
          setExerciseBrowserTarget('workout');
        }}
        onSelectExercise={handleAddExerciseFromBrowser}
        addedExerciseNames={
          exerciseBrowserTarget === 'routine'
            ? routineDraftExercises.map((e) => e.name)
            : exercisesList.map((e) => e.name)
        }
      />

      {/* Exercise Config Sheet */}
      <Modal
        visible={showExerciseConfigSheet}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowExerciseConfigSheet(false);
          setPendingExercise(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.configSheet}>
            {/* Handle bar */}
            <View style={styles.configSheetHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.configSheetLabel}>
                  {exerciseBrowserTarget === 'routine' ? 'ADD TO ROUTINE' : 'ADD TO WORKOUT'}
                </Text>
                <Text style={styles.configSheetTitle} numberOfLines={2}>
                  {pendingExercise?.name || ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowExerciseConfigSheet(false);
                  setPendingExercise(null);
                }}
                activeOpacity={0.6}
                hitSlop={8}
              >
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.configRow}>
              <View style={styles.configCol}>
                <Text style={styles.configLabel}>Sets</Text>
                <View style={styles.configInputWrapper}>
                  <TouchableOpacity
                    style={styles.configStepper}
                    onPress={() => setConfigSets((v) => String(Math.max(1, parseInt(v) - 1)))}
                    hitSlop={8}
                  >
                    <Text style={styles.configStepperText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.configInput}
                    value={configSets}
                    onChangeText={setConfigSets}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={styles.configStepper}
                    onPress={() => setConfigSets((v) => String(parseInt(v) + 1))}
                    hitSlop={8}
                  >
                    <Text style={styles.configStepperText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.configCol}>
                <Text style={styles.configLabel}>Reps</Text>
                <View style={styles.configInputWrapper}>
                  <TouchableOpacity
                    style={styles.configStepper}
                    onPress={() => setConfigReps((v) => String(Math.max(1, parseInt(v) - 1)))}
                    hitSlop={8}
                  >
                    <Text style={styles.configStepperText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.configInput}
                    value={configReps}
                    onChangeText={setConfigReps}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={styles.configStepper}
                    onPress={() => setConfigReps((v) => String(parseInt(v) + 1))}
                    hitSlop={8}
                  >
                    <Text style={styles.configStepperText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.configCol}>
                <Text style={styles.configLabel}>Weight</Text>
                <View style={[styles.configInputWrapper, { justifyContent: 'center' }]}>
                  <TextInput
                    style={styles.configInput}
                    value={configWeight}
                    onChangeText={setConfigWeight}
                    keyboardType="decimal-pad"
                    textAlign="center"
                    placeholder="0"
                    placeholderTextColor={Colors.outline}
                  />
                </View>
                <View style={styles.configUnitToggle}>
                  <TouchableOpacity onPress={() => setConfigWeightUnit('lbs')}>
                    <Text style={[styles.unitBtn, configWeightUnit === 'lbs' && styles.unitBtnActive]}>lbs</Text>
                  </TouchableOpacity>
                  <Text style={styles.unitSlash}>/</Text>
                  <TouchableOpacity onPress={() => setConfigWeightUnit('kg')}>
                    <Text style={[styles.unitBtn, configWeightUnit === 'kg' && styles.unitBtnActive]}>kg</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleConfirmExerciseConfig}
              activeOpacity={0.85}
            >
              <Text style={styles.modalConfirmBtnText}>
                {exerciseBrowserTarget === 'routine' ? 'Add to Routine' : 'Add to Workout'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowExerciseConfigSheet(false);
                setPendingExercise(null);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exercise Detail Modal */}
      <Modal
        visible={!!exerciseDetailItem}
        transparent
        animationType="slide"
        onRequestClose={() => setExerciseDetailItem(null)}
      >
        <TouchableOpacity
          style={styles.detailModalOverlay}
          activeOpacity={1}
          onPress={() => setExerciseDetailItem(null)}
        >
          <View style={styles.detailModalSheet}>
            <View style={styles.routineModalHandleBar} />
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>{exerciseDetailItem?.name}</Text>
              <TouchableOpacity onPress={() => setExerciseDetailItem(null)} activeOpacity={0.6}>
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.detailModalScroll}
              contentContainerStyle={styles.detailModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {exerciseDetailItem && (
                <>
                  <View style={styles.detailBadgesRow}>
                    <View style={styles.detailBadge}>
                      <Text style={styles.detailBadgeText}>{exerciseDetailItem.target}</Text>
                    </View>
                    <View style={[styles.detailBadge, styles.detailBadgeEquipment]}>
                      <Text style={styles.detailBadgeText}>{exerciseDetailItem.equipment}</Text>
                    </View>
                  </View>
                  <View style={styles.detailGifContainer}>
                    <Image
                      source={getGifSource(exerciseDetailItem)}
                      style={styles.detailGif}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={styles.detailSectionTitle}>Instructions</Text>
                  {exerciseDetailItem.instructions && exerciseDetailItem.instructions.length > 0 ? (
                    exerciseDetailItem.instructions.map((step, idx) => (
                      <View key={idx} style={styles.detailStepRow}>
                        <Text style={styles.detailStepNumber}>{idx + 1}</Text>
                        <Text style={styles.detailStepText}>{step}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.detailNoSteps}>No instructions available.</Text>
                  )}

                  {/* Context-aware CTA button at the bottom of the details */}
                  {(() => {
                    const isFreestyleActive = isRunning && !activeRoutine;
                    const showAddButton = showRoutineModal || isFreestyleActive;
                    if (!showAddButton) return null;

                    const handleAddFromDetail = () => {
                      const item = exerciseDetailItem;
                      setExerciseDetailItem(null);
                      if (showRoutineModal) {
                        setExerciseBrowserTarget('routine');
                        handleAddExerciseFromBrowser(item);
                      } else if (isFreestyleActive) {
                        setExerciseBrowserTarget('workout');
                        handleAddExerciseFromBrowser(item);
                      }
                    };

                    return (
                      <TouchableOpacity
                        style={styles.detailModalAddBtn}
                        onPress={handleAddFromDetail}
                        activeOpacity={0.8}
                      >
                        <Plus size={14} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.detailModalAddBtnText}>
                          {showRoutineModal ? 'Add to Routine' : 'Add to Workout'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Workout History Detail Modal */}
      <Modal
        visible={!!selectedHistoryWorkout}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedHistoryWorkout(null)}
      >
        <TouchableOpacity
          style={styles.detailModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedHistoryWorkout(null)}
        >
          <View style={[styles.detailModalSheet, { maxHeight: '85%' }]}>
            <View style={styles.routineModalHandleBar} />
            <View style={styles.detailModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailModalTitle}>{selectedHistoryWorkout?.name}</Text>
                <Text style={styles.savedWorkoutDate}>
                  {selectedHistoryWorkout?.performed_at.split('T')[0]}
                  {selectedHistoryWorkout && getWorkoutDurationLabel(selectedHistoryWorkout.notes)
                    ? ` · ${getWorkoutDurationLabel(selectedHistoryWorkout.notes)}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedHistoryWorkout(null)} activeOpacity={0.6}>
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailModalScroll}
              contentContainerStyle={styles.detailModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedHistoryWorkout && (() => {
                // Group sets by exercise name
                const groups: { [exerciseName: string]: { muscleGroup: string | null; sets: typeof selectedHistoryWorkout.sets } } = {};
                selectedHistoryWorkout.sets.forEach((set) => {
                  if (!groups[set.exercise_name]) {
                    groups[set.exercise_name] = {
                      muscleGroup: set.muscle_group,
                      sets: []
                    };
                  }
                  groups[set.exercise_name].sets.push(set);
                });

                return (
                  <View style={styles.workoutHistoryDetailContent}>
                    {Object.entries(groups).map(([exerciseName, groupInfo]) => {
                      const sortedSets = groupInfo.sets.sort((a, b) => a.set_number - b.set_number);
                      return (
                        <View key={exerciseName} style={styles.historyDetailExerciseCard}>
                          <View style={styles.historyDetailExerciseHeader}>
                            <Text style={styles.historyDetailExerciseName}>{exerciseName}</Text>
                            {groupInfo.muscleGroup && (
                              <View style={styles.historyDetailMuscleBadge}>
                                <Text style={styles.historyDetailMuscleBadgeText}>{groupInfo.muscleGroup}</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.historyDetailSetsList}>
                            {/* Header for sets list */}
                            <View style={styles.historyDetailSetsHeader}>
                              <Text style={[styles.historyDetailHeaderCell, { width: 60, textAlign: 'left' }]}>Set</Text>
                              <Text style={[styles.historyDetailHeaderCell, { flex: 1, textAlign: 'center' }]}>Weight</Text>
                              <Text style={[styles.historyDetailHeaderCell, { flex: 1, textAlign: 'center' }]}>Reps</Text>
                            </View>

                            {/* Set rows */}
                            {sortedSets.map((set, setIndex) => {
                              const weightVal = set.weight_kg !== null
                                ? formatWeight(isLbs ? set.weight_kg / 0.45359237 : set.weight_kg)
                                : '—';
                              return (
                                <View key={set.id || setIndex} style={styles.historyDetailSetRow}>
                                  <Text style={[styles.historyDetailCellText, { width: 60, textAlign: 'left', fontWeight: fontWeight.semiBold }]}>
                                    Set {set.set_number}
                                  </Text>
                                  <Text style={[styles.historyDetailCellText, { flex: 1, textAlign: 'center' }]}>
                                    {weightVal} {weightVal !== '—' ? (isLbs ? 'lbs' : 'kg') : ''}
                                  </Text>
                                  <Text style={[styles.historyDetailCellText, { flex: 1, textAlign: 'center' }]}>
                                    {set.reps !== null ? set.reps : '—'} reps
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Workout Naming Modal (Phase 17) */}
      <Modal
        visible={showNamingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNamingModal(false)}
      >
        <TouchableOpacity
          style={styles.namingModalOverlay}
          activeOpacity={1}
          onPress={() => setShowNamingModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.namingModalSheet}
          >
            <Text style={styles.namingModalTitle}>Save Workout</Text>
            <Text style={styles.namingModalSubtitle}>
              Give this workout session a name to record it to history.
            </Text>

            <View style={styles.namingInputContainer}>
              <TextInput
                style={styles.namingInputField}
                placeholder="Workout Name (e.g. Legs Day)"
                placeholderTextColor={Colors.outline}
                value={customWorkoutName}
                onChangeText={setCustomWorkoutName}
                autoFocus
              />
              {customWorkoutName.length > 0 && (
                <TouchableOpacity
                  style={styles.namingClearBtn}
                  onPress={() => setCustomWorkoutName('')}
                >
                  <X size={16} color={Colors.outline} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.namingBtnRow}>
              <TouchableOpacity
                style={styles.namingCancelBtn}
                onPress={() => setShowNamingModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.namingCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.namingSaveBtn}
                onPress={handleSaveCustomFreestyleWorkout}
                activeOpacity={0.7}
              >
                <Text style={styles.namingSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Rest Timer Floating Panel */}
      {restTimeRemaining !== null && (
        <View style={styles.restFloatingContainer}>
          <View style={styles.restFloatingHeader}>
            <Text style={styles.restFloatingTitle}>REST TIMER</Text>
            <Text style={styles.restFloatingExercise} numberOfLines={1}>
              {restExerciseName}
            </Text>
          </View>
          
          <View style={styles.restCountdownRow}>
            <Text style={styles.restCountdownText}>
              Resting: {Math.floor(restTimeRemaining / 60)}:{String(restTimeRemaining % 60).padStart(2, '0')} remaining
            </Text>
            <Text style={styles.restNextSetText}>
              Next: Set {restNextSetNum} of {restNextExerciseName}
            </Text>
          </View>

          {/* Progress bar container */}
          <View style={styles.restProgressContainer}>
            <View
              style={[
                styles.restProgressBarFill,
                { width: `${((restTimeTotal - restTimeRemaining) / restTimeTotal) * 100}%` }
              ]}
            />
          </View>

          <View style={styles.restButtonRow}>
            <TouchableOpacity
              style={styles.restActionBtn}
              onPress={() => setRestTimeRemaining((prev) => (prev !== null ? prev + 30 : null))}
            >
              <Text style={styles.restActionBtnText}>+30s</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.restActionBtn, styles.restSkipBtn]}
              onPress={() => {
                setRestTimeRemaining(null);
                triggerToast('Rest timer skipped');
              }}
            >
              <Text style={styles.restSkipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl * 2,
    width: '100%',
    maxWidth: layout.modalMaxWidth,
    alignSelf: 'center',
  },

  timerCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  timerCardActive: {
    borderColor: 'rgba(0, 101, 145, 0.25)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  activeSessionContainer: {
    width: '100%',
  },
  timerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBadgePaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusDotPaused: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextPaused: {
    color: '#f59e0b',
  },
  discardTextButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  discardText: {
    fontSize: typography.xs,
    color: Colors.error,
    fontWeight: fontWeight.bold,
  },
  activeSessionMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeSessionDetails: {
    flex: 1,
    marginRight: spacing.base,
  },
  activeRoutineName: {
    fontSize: typography.base + 1,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  activeProgressText: {
    fontSize: typography.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: fontWeight.medium,
  },
  timerDisplay: {
    color: Colors.primary,
    fontSize: typography.xxl,
    fontWeight: fontWeight.extraBold,
    fontVariant: ['tabular-nums'],
  },
  activeProgressBarContainer: {
    height: 4,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  activeProgressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: radius.full,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timerBtn: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  btnPause: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(0, 101, 145, 0.25)',
  },
  btnPauseText: {
    color: Colors.primary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  btnResume: {
    backgroundColor: Colors.primary,
  },
  btnResumeText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  btnFinishActive: {
    backgroundColor: '#10b981',
    flex: 1.3,
  },
  btnFinishText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  idleSessionContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  idleSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  idleSessionTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
  },
  idleSessionSubtitle: {
    fontSize: typography.xs,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.base,
  },
  btnFreestyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    minHeight: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  btnFreestyleText: {
    color: Colors.onPrimary,
    fontSize: typography.xs + 1,
    fontWeight: fontWeight.bold,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
    marginBottom: spacing.base,
  },
  savedWorkoutList: {
    marginTop: spacing.xs,
  },
  savedWorkoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  savedWorkoutRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.15)',
  },
  savedWorkoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  savedWorkoutIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
  },
  savedWorkoutInfo: {
    flex: 1,
  },
  savedWorkoutNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedWorkoutName: {
    flexShrink: 1,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  savedWorkoutDate: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 2,
    fontWeight: fontWeight.medium,
  },
  savedWorkoutSetsText: {
    fontSize: typography.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  savedWorkoutStats: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  savedWorkoutSetsNumber: {
    fontSize: typography.sm + 1,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  savedWorkoutSetsLabel: {
    fontSize: 8,
    fontWeight: fontWeight.medium,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: -2,
  },
  syncStatusPill: {
    overflow: 'hidden',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: fontWeight.bold,
    textTransform: 'lowercase',
  },
  syncStatus_synced: {
    color: Colors.outline,
    backgroundColor: 'rgba(110, 120, 129, 0.08)',
  },
  syncStatus_pending: {
    color: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  syncStatus_failed: {
    color: Colors.error,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  exerciseHeader: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: spacing.md,
  },
  exerciseTitleRow: {
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routineHighlightBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  tagChip: {
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  tagChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseTitle: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  unilateralToggle: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  unilateralToggleActive: {
    backgroundColor: Colors.primaryContainer,
  },
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitBtn: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: Colors.outline,
  },
  unitBtnActive: {
    color: Colors.primaryContainer,
    fontWeight: fontWeight.bold,
  },
  unitSlash: {
    fontSize: 11,
    color: Colors.outline,
  },
  columnsInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  inputCol: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    marginBottom: 4,
  },
  columnInput: {
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: typography.base,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  logSetBtn: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  logSetBtnText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
    fontSize: typography.base,
  },
  logSetBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDefaultsBtn: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  saveDefaultsBtnText: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  addExerciseBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
  },
  addExerciseBtnContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
  },
  thText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    marginTop: spacing.xs,
  },
  tableRowWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.1)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  tableRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tdSetNum: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  tdPrevious: {
    fontSize: typography.xs,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  tdLog: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  muscleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
    minHeight: layout.minTouchTarget,
  },
  muscleToggleText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  muscleToggleTextActive: {
    color: Colors.primaryContainer,
  },
  muscleMapContainer: {
    backgroundColor: Colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  routineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  routineTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
  },
  routineAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 101, 145, 0.15)',
  },
  routineAddText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  routineHint: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginBottom: spacing.sm,
  },
  routinePills: {
    marginBottom: spacing.md,
  },
  routinePill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 101, 145, 0.12)',
    backgroundColor: Colors.surfaceContainerLow,
    marginRight: spacing.xs,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routinePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  routinePillText: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  routinePillTextActive: {
    color: Colors.onPrimary,
  },
  routineDetails: {
    gap: spacing.base,
    marginTop: spacing.xs,
  },
  routineExerciseList: {
    gap: spacing.sm,
  },
  routineExerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  routineExerciseRowActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 101, 145, 0.04)',
  },
  routineExerciseInfo: {
    flex: 1,
  },
  routineExerciseName: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  routineExerciseMeta: {
    fontSize: typography.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: fontWeight.medium,
  },
  routineExerciseTag: {
    fontSize: typography.xs - 1,
    color: Colors.primary,
    backgroundColor: 'rgba(0, 101, 145, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  routineStartButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  routineStartButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    elevation: 0,
    shadowOpacity: 0,
  },
  routineStartText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
  },
  routineStartTextActive: {
    color: '#10b981',
  },
  routineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  routineEditButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(0, 101, 145, 0.25)',
    minHeight: 36,
    justifyContent: 'center',
  },
  routineEditText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  routineDeleteButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    minHeight: 36,
    justifyContent: 'center',
  },
  routineDeleteText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: '#ef4444',
  },
  routineWorkoutList: {
    gap: spacing.sm,
  },
  routineWorkoutRow: {
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    borderRadius: radius.lg,
    padding: spacing.base,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  routineWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  routineWorkoutName: {
    fontSize: typography.sm + 1,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  routineWorkoutInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  routineInputCol: {
    flex: 1,
  },
  routineInputLabel: {
    fontSize: typography.xs - 1,
    color: Colors.outline,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  routineInput: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sm + 1,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  routineSetRow: {
    marginTop: spacing.md,
  },
  routineSetHint: {
    fontSize: 9,
    color: Colors.outline,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: fontWeight.bold,
    opacity: 0.7,
  },
  routineSetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  routineSetCard: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(190, 200, 210, 0.4)',
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  routineSetCardDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  routineSetCardNum: {
    fontSize: typography.base + 1,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  routineSetCardNumDone: {
    color: '#ffffff',
  },
  routineSetCardMeta: {
    fontSize: 9,
    color: Colors.outline,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  routineSetCardMetaDone: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  routineSetCardCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  // Keep old names as aliases so nothing else breaks
  routineSetCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
  },
  routineSetCheckboxDone: {
    backgroundColor: Colors.primaryContainer,
  },
  routineSetLabel: {
    fontSize: typography.xs,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  routineEmptyState: {
    paddingVertical: spacing.md,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  modalContentContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  modalLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    marginBottom: spacing.xs,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: typography.base,
    color: Colors.onSurface,
    marginBottom: spacing.base,
  },
  // Routine builder modal — full-screen sheet layout
  routineModalShell: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  routineModalHeader: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.1)',
  },
  routineModalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(190, 200, 210, 0.35)',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  routineModalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routineNameInput: {
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: typography.base,
    color: Colors.onSurface,
  },
  routineRestTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  routineRestTimeLabel: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.medium,
  },
  routineRestTimeInput: {
    height: 36,
    width: 80,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sm,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  routineModalScroll: {
    backgroundColor: Colors.surfaceContainerLowest,
    maxHeight: '78%',
  },
  routineModalScrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  // Draft section below the map
  routineDraftSection: {
    marginTop: spacing.sm,
  },
  routineDraftSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routineDraftSectionTitle: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0,
  },
  routineDraftEmpty: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(14, 165, 233, 0.04)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  routineDraftEmptyText: {
    fontSize: typography.xs,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 18,
  },
  routineDraftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  routineDraftIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineDraftIndexText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
  },
  routineDraftNameInput: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  addRowText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  routinePickerCard: {
    backgroundColor: Colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
    marginBottom: spacing.base,
  },
  routinePickerTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  routineDraftCard: {
    backgroundColor: Colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryContainer,
  },
  routineRemoveBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineDraftMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginBottom: 4,
  },
  metricInput: {
    minHeight: layout.minTouchTarget,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    paddingHorizontal: spacing.sm,
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    textAlign: 'center',
  },
  unitToggleRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  categoryBtn: {
    flex: 1,
    minWidth: '28%',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.background,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  categoryBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  categoryBtnTextActive: {
    color: Colors.onPrimary,
  },
  modalConfirmBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
    fontSize: typography.base,
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    color: Colors.onSurfaceVariant,
    fontWeight: fontWeight.bold,
    fontSize: typography.base,
  },
  // Exercise Config Sheet
  configSheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  configSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(190, 200, 210, 0.4)',
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
  configSheetLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  configSheetTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textTransform: 'capitalize',
  },
  configRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.base,
    marginBottom: spacing.base,
    alignItems: 'flex-start',
  },
  configCol: {
    flex: 1,
    alignItems: 'center',
  },
  configLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  configInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    width: '100%',
  },
  configStepper: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
  },
  configStepperText: {
    fontSize: typography.lg,
    color: Colors.primaryContainer,
    fontWeight: fontWeight.bold,
    lineHeight: 20,
  },
  configInput: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.4)',
    borderRadius: radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: spacing.xs,
  },
  configUnitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  detailModalSheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.base,
    maxHeight: '82%',
    minHeight: '60%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  detailModalTitle: {
    fontSize: typography.base + 2,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    flex: 1,
    marginRight: spacing.base,
    textTransform: 'capitalize',
  },
  detailModalScroll: {
    flex: 1,
  },
  detailModalScrollContent: {
    paddingBottom: spacing.xxl,
  },
  detailBadgesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  detailBadge: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  detailBadgeEquipment: {
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
    borderColor: 'rgba(0, 101, 145, 0.15)',
  },
  detailBadgeText: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  detailGifContainer: {
    width: '100%',
    height: 260,
    backgroundColor: '#f8fafc',
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.1)',
  },
  detailGif: {
    width: '100%',
    height: '100%',
  },
  detailSectionTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailStepRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  detailStepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 101, 145, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    lineHeight: 22,
  },
  detailStepText: {
    flex: 1,
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  detailNoSteps: {
    fontSize: typography.sm,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  instructionIconButton: {
    padding: spacing.xs,
    marginRight: -spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Rest Timer HUD Styling
  restFloatingContainer: {
    position: 'absolute',
    bottom: 90, // Positioned above the bottom navigation tab bar (clears Gym tab bar)
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: '#0c1a30',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  restFloatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  restFloatingTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: '#38bdf8',
    letterSpacing: 1,
  },
  restFloatingExercise: {
    fontSize: typography.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    maxWidth: '60%',
  },
  restCountdownRow: {
    flexDirection: 'column',
    marginBottom: spacing.sm,
    gap: 2,
  },
  restCountdownText: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  restNextSetText: {
    fontSize: typography.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: fontWeight.medium,
  },
  restProgressContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  restProgressBarFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: radius.full,
  },
  restButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  restActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restActionBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: '#38bdf8',
  },
  restSkipBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  restSkipBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: '#f87171',
  },
  // Sets Table Styles (Phase 16)
  setsTableContainer: {
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  setsTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
    marginBottom: spacing.xs,
  },
  setsTableHeaderCell: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  cellCheck: {
    width: 32,
  },
  cellLabel: {
    flex: 1.2,
    textAlign: 'left',
    paddingLeft: spacing.xs,
  },
  cellInput: {
    flex: 2,
  },
  cellAction: {
    width: 36,
  },
  setsTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginVertical: 2,
    backgroundColor: 'transparent',
  },
  setsTableRowDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  setRowCheckBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(190, 200, 210, 0.5)',
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  setRowCheckBtnDone: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  setRowLabelContainer: {
    flex: 1.2,
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  setRowLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  setRowInput: {
    flex: 2,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    marginHorizontal: 4,
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  setRowInputDone: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
    color: Colors.outline,
  },
  setRowDeleteBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setRowDeleteBtnPlaceholder: {
    width: 36,
  },
  addSetDashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(14, 165, 233, 0.4)',
    borderRadius: radius.md,
    backgroundColor: 'rgba(14, 165, 233, 0.03)',
    marginTop: spacing.xs,
  },
  addSetDashedBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  // Workout History Detail Styles (Phase 16 Extension)
  workoutHistoryDetailContent: {
    marginTop: spacing.sm,
  },
  historyDetailExerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  historyDetailExerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
    paddingBottom: spacing.xs,
  },
  historyDetailExerciseName: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    flex: 1,
  },
  historyDetailMuscleBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  historyDetailMuscleBadgeText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  historyDetailSetsList: {
    width: '100%',
  },
  historyDetailSetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.1)',
    marginBottom: 4,
  },
  historyDetailHeaderCell: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyDetailSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.05)',
  },
  historyDetailCellText: {
    fontSize: typography.sm,
    color: Colors.onSurface,
  },
  // Global Search Styles (Phase 17)
  searchSectionContainer: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    zIndex: 100,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInputField: {
    flex: 1,
    fontSize: typography.sm,
    color: Colors.onSurface,
    height: '100%',
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchResultsContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    marginTop: spacing.xs,
    padding: spacing.sm,
    maxHeight: 280,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  searchResultsTitle: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchNoResults: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  searchNoResultsText: {
    fontSize: typography.sm,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  searchResultsScroll: {
    maxHeight: 220,
  },
  searchResultsScrollContent: {
    paddingBottom: spacing.xs,
  },
  searchResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  searchResultIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  searchResultMeta: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 2,
  },
  searchResultAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  searchResultAddText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  searchResultChevron: {
    padding: spacing.xs,
  },
  detailModalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: radius.md,
    height: 44,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
  },
  detailModalAddBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  // Freestyle empty states (Phase 17)
  freestyleEmptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    borderStyle: 'dashed',
    marginVertical: spacing.sm,
  },
  freestyleEmptyText: {
    fontSize: typography.sm,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Naming Modal Styles (Phase 17)
  namingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  namingModalSheet: {
    backgroundColor: Colors.surface,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 340,
    padding: spacing.base,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  namingModalTitle: {
    fontSize: typography.md,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  namingModalSubtitle: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginBottom: spacing.base,
  },
  namingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    paddingHorizontal: spacing.sm,
    height: 44,
    marginBottom: spacing.base,
  },
  namingInputField: {
    flex: 1,
    fontSize: typography.sm,
    color: Colors.onSurface,
    height: '100%',
    paddingVertical: 0,
  },
  namingClearBtn: {
    padding: 4,
  },
  namingBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  namingCancelBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
  },
  namingCancelBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.outline,
  },
  namingSaveBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: Colors.primary,
  },
  namingSaveBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
});
