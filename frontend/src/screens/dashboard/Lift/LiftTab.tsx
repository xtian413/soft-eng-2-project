import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  PanResponder,
  PanResponderInstance,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import { Check, Dumbbell, Play, Pause, Plus, X, Copy, Shuffle } from 'lucide-react-native';
import { getMuscleDataForExercise } from './exerciseMuscles';
import { BodyMuscleMap } from './BodyMuscleMap';
import { WGERExerciseBrowser } from './WGERExerciseBrowser';
import type { ExerciseDbExercise } from '@/api/exerciseDbService';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface LiftTabProps {
  triggerToast: (msg: string) => void;
}

interface SetLog {
  id: string;
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
}

interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  muscle_group?: string | null;
}

interface Routine {
  id: string;
  name: string;
  routines_id?: string | null;
  exercises: RoutineExercise[];
}

interface RoutineDraftExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  weightUnit: 'lbs' | 'kg';
  muscleGroup?: string;
}

export function LiftTab({ triggerToast }: LiftTabProps) {
  const user = useAuthStore((state) => state.user);

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isLbs, setIsLbs] = useState(true);

  // Routine state
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [isRoutineLoading, setIsRoutineLoading] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [routineNameInput, setRoutineNameInput] = useState('');
  const [routineDraftExercises, setRoutineDraftExercises] = useState<RoutineDraftExercise[]>([]);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [routineProgress, setRoutineProgress] = useState<
    Record<string, { sets: string; reps: string; weight: string; doneSets: boolean[] }>
  >({});

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
  const [showWhisper, setShowWhisper] = useState(true);
  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);
  const [showExerciseBrowser, setShowExerciseBrowser] = useState(false);
  const [selectedMuscleId, setSelectedMuscleId] = useState<number | null>(null);
  const [selectedMuscleName, setSelectedMuscleName] = useState<string>('');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExerciseCategory, setCustomExerciseCategory] = useState<Exercise['category']>('barbell');
  const [highlightMode, setHighlightMode] = useState<'none' | 'click' | 'exercise'>('none');
  const [primaryMuscleIds, setPrimaryMuscleIds] = useState<number[]>([]);
  const [secondaryMuscleIds, setSecondaryMuscleIds] = useState<number[]>([]);

  // Swipe state
  const swipeAnimRefs = useRef<{ [key: string]: Animated.Value }>({});
  const panResponderRefs = useRef<{ [key: string]: PanResponderInstance }>({});
  const routineModalScrollRef = useRef<ScrollView>(null);
  const uniqueIdRef = useRef(0);

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
        setElapsedSecs((s) => s + 1);
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

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  const handleFinishSession = () => {
    setIsRunning(false);
    setElapsedSecs(0);
    scaleAnim.setValue(1);
    if (activeRoutineId) {
      setActiveRoutineId(null);
      setExercisesList([]);
      setCurrentExerciseId('');
      setRoutineProgress({});
    }
    triggerToast('✓ Session finished');
  };

  const convertWeightValue = (value: number, toLbs: boolean) => {
    return toLbs ? value / 0.45359237 : value * 0.45359237;
  };

  const toggleUnit = (nextIsLbs: boolean) => {
    if (nextIsLbs === isLbs) return;
    setIsLbs(nextIsLbs);
    setRoutineProgress((prev) => {
      const updated: Record<string, { sets: string; reps: string; weight: string; doneSets: boolean[] }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const currentWeight = parseFloat(value.weight) || 0;
        const nextWeight = convertWeightValue(currentWeight, nextIsLbs);
        updated[key] = { ...value, weight: nextWeight.toFixed(1) };
      });
      return updated;
    });
  };

  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId) || null;
  const activeRoutine = routines.find((routine) => routine.id === activeRoutineId) || null;

  const loadRoutines = async () => {
    const authUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!authUser) return;
    setIsRoutineLoading(true);
    try {
      const { data: routineRows, error: routineError } = await supabase
        .from('routines')
        .select('id,routine_name,routines_id')
        .eq('user_id', authUser.id);

      if (routineError) throw routineError;

      const workoutIds = (routineRows || [])
        .map((routine: any) => routine.routines_id)
        .filter((value: string | null) => !!value);
      const { data: setRows, error: setError } = await supabase
        .from('workout_sets')
        .select('workout_id,exercise_name,muscle_group,set_number,reps,weight_kg')
        .in('workout_id', workoutIds.length > 0 ? workoutIds : ['00000000-0000-0000-0000-000000000000']);

      if (setError) throw setError;

      const grouped: Record<string, RoutineExercise[]> = {};
      (setRows || []).forEach((row: any) => {
        if (!grouped[row.workout_id]) grouped[row.workout_id] = [];
        const key = `${row.workout_id}:${row.exercise_name}`;
        const existing = grouped[row.workout_id].find((item) => item.id === key);
        if (existing) {
          existing.sets += 1;
        } else {
          grouped[row.workout_id].push({
            id: key,
            routine_id: row.workout_id,
            exercise_name: row.exercise_name,
            sets: 1,
            reps: row.reps ?? 0,
            weight_kg: row.weight_kg ?? 0,
            muscle_group: row.muscle_group,
          });
        }
      });

      const mapped = (routineRows || []).map((routine: any) => ({
        id: routine.id,
        name: routine.routine_name,
        routines_id: routine.routines_id,
        exercises: routine.routines_id ? grouped[routine.routines_id] || [] : [],
      })) as Routine[];

      setRoutines(mapped);
      if (mapped.length > 0 && !selectedRoutineId) {
        setSelectedRoutineId(mapped[0].id);
      }
    } catch (error) {
      console.error('[LiftTab] Failed to load routines:', error);
      triggerToast('Failed to load routines');
    } finally {
      setIsRoutineLoading(false);
    }
  };

  useEffect(() => {
    loadRoutines();
  }, [user?.id]);

  const addDraftExercise = () => {
    setRoutineDraftExercises((prev) => [
      ...prev,
      {
        id: createUniqueId('draft'),
        name: '',
        sets: '3',
        reps: '10',
        weight: '0',
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
    setRoutineDraftExercises([]);
    setEditingRoutineId(null);
    setEditingWorkoutId(null);
  };

  const startEditRoutine = (routine: Routine) => {
    const workoutId = routine.routines_id;
    if (!workoutId) {
      triggerToast('Routine template is missing a workout id');
      return;
    }

    setEditingRoutineId(routine.id);
    setEditingWorkoutId(workoutId);
    setRoutineNameInput(routine.name);

    const draftExercises = routine.exercises.map((exercise) => {
      const weightValue = isLbs ? exercise.weight_kg / 0.45359237 : exercise.weight_kg;
      return {
        id: createUniqueId('draft-edit'),
        name: exercise.exercise_name,
        sets: String(exercise.sets),
        reps: String(exercise.reps),
        weight: Number.isFinite(weightValue) ? weightValue.toFixed(1) : '0.0',
        weightUnit: isLbs ? 'lbs' : 'kg',
        muscleGroup: exercise.muscle_group || undefined,
      } as RoutineDraftExercise;
    });

    setRoutineDraftExercises(draftExercises);
    setShowRoutineModal(true);
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
      let workoutId = editingWorkoutId;
      let routineId = editingRoutineId;

      if (editingRoutineId && editingWorkoutId) {
        const { error: routineUpdateError } = await supabase
          .from('routines')
          .update({ routine_name: trimmedName })
          .eq('id', editingRoutineId);

        if (routineUpdateError) throw routineUpdateError;

        const { error: workoutUpdateError } = await supabase
          .from('workouts')
          .update({ name: trimmedName })
          .eq('id', editingWorkoutId);

        if (workoutUpdateError) throw workoutUpdateError;
      } else {
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: authUser.id,
            name: trimmedName,
            notes: 'routine_template',
            performed_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (workoutError) throw workoutError;

        workoutId = workout?.id || null;
        if (!workoutId) throw new Error('Workout template creation failed');

        const { data: routine, error: routineError } = await supabase
          .from('routines')
          .insert({ user_id: authUser.id, routine_name: trimmedName, routines_id: workoutId })
          .select('id')
          .single();

        if (routineError) throw routineError;
        routineId = routine?.id || null;
      }

      if (!workoutId) throw new Error('Workout template creation failed');

      if (editingRoutineId && editingWorkoutId) {
        const { error: deleteError } = await supabase
          .from('workout_sets')
          .delete()
          .eq('workout_id', editingWorkoutId);

        if (deleteError) throw deleteError;
      }

      const exerciseRows = cleanedExercises.flatMap((exercise) => {
        const sets = Math.max(1, parseInt(exercise.sets, 10) || 1);
        const reps = Math.max(1, parseInt(exercise.reps, 10) || 1);
        const weight = parseFloat(exercise.weight) || 0;
        const weightKg = exercise.weightUnit === 'lbs' ? weight * 0.45359237 : weight;

        return Array.from({ length: sets }, (_, index) => ({
          workout_id: workoutId,
          exercise_name: exercise.name.trim(),
          muscle_group: exercise.muscleGroup || null,
          set_number: index + 1,
          reps,
          weight_kg: weightKg,
          rir: 0,
          est_1rm: null,
        }));
      });

      const { error: exerciseError } = await supabase.from('workout_sets').insert(exerciseRows);
      if (exerciseError) throw exerciseError;

      resetRoutineDraft();
      setShowRoutineModal(false);
      triggerToast(editingRoutineId ? '✓ Routine updated' : '✓ Routine saved');
      await loadRoutines();
    } catch (error) {
      console.error('[LiftTab] Failed to save routine:', error);
      triggerToast('Failed to save routine');
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const applyRoutineDefaults = (routineExercise: RoutineExercise | null) => {
    if (!routineExercise) return;
    setIsUnilateral(false);
    const weight = isLbs ? routineExercise.weight_kg / 0.45359237 : routineExercise.weight_kg;
    setInputWeight(weight.toFixed(1));
    setInputReps(String(routineExercise.reps));
    setInputRepsLeft(String(routineExercise.reps));
    setInputRepsRight(String(routineExercise.reps));
  };

  const handleStartRoutine = (routine: Routine) => {
    if (routine.exercises.length === 0) return;

    const initialProgress: Record<string, { sets: string; reps: string; weight: string; doneSets: boolean[] }> = {};
    routine.exercises.forEach((exercise) => {
      const weightValue = isLbs ? exercise.weight_kg / 0.45359237 : exercise.weight_kg;
      const setCount = Math.max(1, exercise.sets);
      initialProgress[exercise.id] = {
        sets: String(setCount),
        reps: String(exercise.reps),
        weight: Number.isFinite(weightValue) ? weightValue.toFixed(1) : '0.0',
        doneSets: Array.from({ length: setCount }, () => false),
      };
    });

    const mappedExercises: Exercise[] = routine.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.exercise_name,
      category: 'barbell',
      isCustom: false,
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

  const updateRoutineProgress = (
    exerciseId: string,
    patch: Partial<{ sets: string; reps: string; weight: string; doneSets: boolean[] }>
  ) => {
    setRoutineProgress((prev) => {
      const current = prev[exerciseId];
      if (!current) return prev;

      let nextDoneSets = current.doneSets;
      if (patch.sets !== undefined) {
        const nextCount = Math.max(1, parseInt(patch.sets, 10) || 1);
        if (nextCount > nextDoneSets.length) {
          nextDoneSets = [...nextDoneSets, ...Array.from({ length: nextCount - nextDoneSets.length }, () => false)];
        } else if (nextCount < nextDoneSets.length) {
          nextDoneSets = nextDoneSets.slice(0, nextCount);
        }
      }

      return {
        ...prev,
        [exerciseId]: {
          ...current,
          ...patch,
          doneSets: patch.doneSets ?? nextDoneSets,
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

  const handleSaveRoutineDefaults = async () => {
    if (!activeRoutine) return;
    const exercise = activeRoutine.exercises.find((item) => item.id === currentExerciseId) || null;
    if (!exercise) return;

    const routineWorkoutId = activeRoutine.routines_id;
    if (!routineWorkoutId) {
      triggerToast('Routine template is missing a workout id');
      return;
    }

    const nextReps = Math.max(1, parseInt(inputReps, 10) || 1);
    const nextWeight = parseFloat(inputWeight) || 0;
    const nextWeightKg = isLbs ? nextWeight * 0.45359237 : nextWeight;

    try {
      const { error } = await supabase
        .from('workout_sets')
        .update({ reps: nextReps, weight_kg: nextWeightKg, rir: parseInt(inputRir, 10) || 0 })
        .eq('workout_id', routineWorkoutId)
        .eq('exercise_name', exercise.exercise_name);

      if (error) throw error;

      setRoutines((prev) =>
        prev.map((routine) => {
          if (routine.id !== activeRoutine.id) return routine;
          return {
            ...routine,
            exercises: routine.exercises.map((item) =>
              item.id === exercise.id
                ? { ...item, reps: nextReps, weight_kg: nextWeightKg }
                : item
            ),
          };
        })
      );

      triggerToast('✓ Defaults updated');
    } catch (error) {
      console.error('[LiftTab] Failed to update defaults:', error);
      triggerToast('Failed to update defaults');
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
      setNum: setsList.length + 1,
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
    };

    setExercisesList((prev) => [...prev, newExercise]);
    setCurrentExerciseId(newExercise.id);
    setCustomExerciseName('');
    setShowCustomExerciseModal(false);
    setSetsList([]); // Reset sets for new exercise
    triggerToast(`✓ Added custom exercise: ${customExerciseName}`);
  };

  const handleBodyPartClick = (muscleId: number, muscleName: string) => {
    setSelectedMuscleId(muscleId);
    setSelectedMuscleName(muscleName);
    setHighlightMode('click');
    setShowExerciseBrowser(true);
  };

  const handleSelectExerciseFromDB = (exercise: ExerciseDbExercise) => {
    // Create exercise in local list
    const newExercise: Exercise = {
      id: createUniqueId('exercise'),
      name: exercise.name || `Exercise ${exercise.id}`,
      category: 'barbell',
      isCustom: false,
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

  const handleAddExerciseToRoutineDraft = (exercise: ExerciseDbExercise) => {
    const muscleGroup = exercise.target || exercise.bodyPart || '';
    setRoutineDraftExercises((prev) => [
      ...prev,
      {
        id: createUniqueId('routine-draft'),
        name: exercise.name || `Exercise ${exercise.id}`,
        sets: '3',
        reps: '10',
        weight: '0',
        weightUnit: isLbs ? 'lbs' : 'kg',
        muscleGroup,
      },
    ]);
    requestAnimationFrame(() => {
      routineModalScrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleAddExerciseFromBrowser = (exercise: ExerciseDbExercise) => {
    if (showRoutineModal) {
      handleAddExerciseToRoutineDraft(exercise);
      setShowExerciseBrowser(false);
      triggerToast(`✓ Added to routine draft: ${exercise.name || `Exercise ${exercise.id}`}`);
      return;
    }

    handleSelectExerciseFromDB(exercise);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Timer Card */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeaderRow}>
            <Text style={styles.timerLabel}>ACTIVE TRAINING SESSION</Text>
            <View style={styles.timerActiveDot} />
          </View>
          <Animated.Text style={[styles.timerDisplay, { transform: [{ scale: scaleAnim }] }]}>
            {formatTime(elapsedSecs)}
          </Animated.Text>
          <View style={styles.timerActions}>
            {isRunning ? (
              <TouchableOpacity
                style={[styles.timerBtn, styles.btnPause]}
                onPress={() => setIsRunning(false)}
                activeOpacity={0.8}
              >
                <View style={styles.timerBtnContent}>
                  <Pause size={14} color={Colors.onPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.timerBtnText}>Pause Workout</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.timerActionStack}>
                <TouchableOpacity
                  style={[styles.timerBtn, styles.btnStart]}
                  onPress={() => setIsRunning(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.timerBtnContent}>
                    <Play size={14} color={Colors.onPrimary} fill={Colors.onPrimary} style={{ marginRight: 6 }} />
                    <Text style={styles.timerBtnText}>
                      {elapsedSecs > 0 ? 'Resume Session' : 'Start Session'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {elapsedSecs > 0 && (
                  <TouchableOpacity
                    style={[styles.timerBtn, styles.btnFinish]}
                    onPress={handleFinishSession}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.timerBtnText}>Finish Session</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
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
              <Plus size={14} color={Colors.onPrimary} strokeWidth={2.5} />
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
                    const weightText = Number.isFinite(weightValue) ? weightValue.toFixed(1) : '0.0';
                    return (
                      <TouchableOpacity
                        key={exercise.id}
                        style={[
                          styles.routineExerciseRow,
                          isActiveExercise && styles.routineExerciseRowActive,
                        ]}
                        onPress={() => handleSelectRoutineExercise(exercise.id)}
                        activeOpacity={0.8}
                        disabled={activeRoutineId !== selectedRoutine.id}
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
                <Text style={styles.routineStartText}>
                  {activeRoutineId === selectedRoutine.id ? 'Routine Active' : 'Start Routine'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.routineEditButton}
                onPress={() => startEditRoutine(selectedRoutine)}
                activeOpacity={0.85}
              >
                <Text style={styles.routineEditText}>Edit Routine</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AI Whisper Card (Dismissible) */}
        {showWhisper && (
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.whisperBadge}>
                <Text style={styles.whisperBadgeText}>Whisper</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWhisper(false)} activeOpacity={0.6}>
                <X size={16} color="#a855f7" />
              </TouchableOpacity>
            </View>
            <Text style={styles.insightQuote}>
              "Volume target reached for quadriceps. Adjust squat intensity by +5% next session."
            </Text>
          </View>
        )}

        {/* Routine Workout Card */}
        <View style={styles.card}>
          {activeRoutine ? (
            <>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseTitleRow}>
                  <View style={styles.tagChip}>
                    <View style={styles.tagChipContent}>
                      <Dumbbell size={10} color={Colors.primaryContainer} style={{ marginRight: 4 }} />
                      <Text style={styles.tagChipText}>Routine</Text>
                    </View>
                  </View>
                  <Text style={styles.exerciseTitle}>{activeRoutine.name}</Text>
                </View>
                <View style={styles.exerciseActions}>
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
              </View>

              <View style={styles.routineWorkoutList}>
                {activeRoutine.exercises.map((exercise) => {
                  const progress = routineProgress[exercise.id] || {
                    sets: String(exercise.sets),
                    reps: String(exercise.reps),
                    weight: '0',
                    doneSets: Array.from({ length: Math.max(1, exercise.sets) }, () => false),
                  };

                  return (
                    <View key={exercise.id} style={styles.routineWorkoutRow}>
                      <View style={styles.routineWorkoutHeader}>
                        <Text style={styles.routineWorkoutName}>{exercise.exercise_name}</Text>
                      </View>

                      <View style={styles.routineWorkoutInputs}>
                        <View style={styles.routineInputCol}>
                          <Text style={styles.routineInputLabel}>Sets</Text>
                          <TextInput
                            style={styles.routineInput}
                            value={progress.sets}
                            onChangeText={(value) => updateRoutineProgress(exercise.id, { sets: value })}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.routineInputCol}>
                          <Text style={styles.routineInputLabel}>Reps</Text>
                          <TextInput
                            style={styles.routineInput}
                            value={progress.reps}
                            onChangeText={(value) => updateRoutineProgress(exercise.id, { reps: value })}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.routineInputCol}>
                          <Text style={styles.routineInputLabel}>Weight</Text>
                          <TextInput
                            style={styles.routineInput}
                            value={progress.weight}
                            onChangeText={(value) => updateRoutineProgress(exercise.id, { weight: value })}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      <View style={styles.routineSetRow}>
                        {progress.doneSets.map((isDone, index) => (
                          <TouchableOpacity
                            key={`${exercise.id}-set-${index}`}
                            style={[
                              styles.routineSetCheckbox,
                              isDone && styles.routineSetCheckboxDone,
                            ]}
                            onPress={() => {
                              const nextDone = [...progress.doneSets];
                              nextDone[index] = !nextDone[index];
                              updateRoutineProgress(exercise.id, { doneSets: nextDone });
                            }}
                            activeOpacity={0.8}
                          >
                            {isDone && <Check size={12} color={Colors.onPrimary} />}
                            <Text style={styles.routineSetLabel}>{index + 1}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.routineEmptyState}>
              <Text style={styles.routineHint}>Start a routine to track sets, reps, and weight.</Text>
            </View>
          )}
        </View>

        {/* Set History Table */}
        {setsList.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SET HISTORY</Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 0.6 }]}>Set #</Text>
              <Text style={[styles.thText, { flex: 1.4 }]}>Previous</Text>
              <Text style={[styles.thText, { flex: 2 }]}>Log</Text>
              <Text style={[styles.thText, { flex: 0.8, textAlign: 'right' }]}>Done</Text>
            </View>

            <View style={styles.tableBody}>
              {setsList.map((set) => {
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
                          outputRange: [set.isChecked ? '#10b98144' : 'transparent', '#10b981'],
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
      </ScrollView>

      {/* Routine Builder Modal */}
      <Modal
        visible={showRoutineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoutineModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView
            ref={routineModalScrollRef}
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoutineId ? 'Edit Routine' : 'Create Routine'}
              </Text>
              <TouchableOpacity onPress={() => setShowRoutineModal(false)} activeOpacity={0.6}>
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Routine Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Push Day"
              value={routineNameInput}
              onChangeText={setRoutineNameInput}
              placeholderTextColor={Colors.outline}
            />

            <View style={styles.routineExerciseHeaderRow}>
              <Text style={styles.modalLabel}>Exercises</Text>
              <TouchableOpacity onPress={addDraftExercise} activeOpacity={0.8}>
                <Text style={styles.addRowText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.routinePickerCard}>
              <Text style={styles.routinePickerTitle}>Pick by muscle</Text>
              <BodyMuscleMap
                onBodyPartClick={handleBodyPartClick}
                isInteractive={true}
                highlightMode={highlightMode}
                selectedMuscleId={selectedMuscleId || undefined}
                primaryMuscleIds={primaryMuscleIds}
                secondaryMuscleIds={secondaryMuscleIds}
              />
            </View>

            <ScrollView style={styles.routineExerciseScroll}>
              {routineDraftExercises.map((exercise) => (
                <View key={exercise.id} style={styles.routineDraftCard}>
                  <View style={styles.routineDraftRow}>
                    <TextInput
                      style={[styles.modalInput, styles.routineExerciseInput]}
                      placeholder="Exercise name"
                      value={exercise.name}
                      onChangeText={(value) => updateDraftExercise(exercise.id, { name: value })}
                      placeholderTextColor={Colors.outline}
                    />
                    <TouchableOpacity
                      style={styles.routineRemoveBtn}
                      onPress={() => removeDraftExercise(exercise.id)}
                      activeOpacity={0.8}
                    >
                      <X size={14} color={Colors.outline} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.routineDraftMetrics}>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Sets</Text>
                      <TextInput
                        style={styles.metricInput}
                        value={exercise.sets}
                        onChangeText={(value) => updateDraftExercise(exercise.id, { sets: value })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Reps</Text>
                      <TextInput
                        style={styles.metricInput}
                        value={exercise.reps}
                        onChangeText={(value) => updateDraftExercise(exercise.id, { reps: value })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Weight</Text>
                      <TextInput
                        style={styles.metricInput}
                        value={exercise.weight}
                        onChangeText={(value) => updateDraftExercise(exercise.id, { weight: value })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Unit</Text>
                      <View style={styles.unitToggleRowSmall}>
                        <TouchableOpacity
                          onPress={() => updateDraftExercise(exercise.id, { weightUnit: 'lbs' })}
                        >
                          <Text
                            style={[
                              styles.unitBtn,
                              exercise.weightUnit === 'lbs' && styles.unitBtnActive,
                            ]}
                          >
                            lbs
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.unitSlash}>/</Text>
                        <TouchableOpacity
                          onPress={() => updateDraftExercise(exercise.id, { weightUnit: 'kg' })}
                        >
                          <Text
                            style={[
                              styles.unitBtn,
                              exercise.weightUnit === 'kg' && styles.unitBtnActive,
                            ]}
                          >
                            kg
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
        onClose={() => setShowExerciseBrowser(false)}
        onSelectExercise={handleAddExerciseFromBrowser}
      />
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
  },
  timerCard: {
    backgroundColor: Colors.primary,
    borderRadius: radius.lg,
    padding: spacing.base,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  timerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.0,
  },
  timerActiveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#10b981',
  },
  timerDisplay: {
    color: Colors.onPrimary,
    fontSize: 42,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 2,
    marginVertical: spacing.xs,
  },
  timerActions: {
    width: '100%',
  },
  timerActionStack: {
    gap: spacing.sm,
  },
  timerBtn: {
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  btnStart: {
    backgroundColor: Colors.primaryContainer,
  },
  btnPause: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnFinish: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timerBtnText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  tagChip: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
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
    width: 36,
    height: 36,
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
    height: 42,
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
  },
  saveDefaultsBtnText: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  addExerciseBtn: {
    width: 42,
    height: 42,
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
  insightCard: {
    backgroundColor: '#faf5ff',
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  whisperBadge: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  whisperBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#a855f7',
  },
  insightQuote: {
    fontSize: typography.sm,
    fontStyle: 'italic',
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.25)',
  },
  thText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  tableBody: {
    marginTop: spacing.xs,
  },
  tableRowWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  tableRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tdSetNum: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  tdPrevious: {
    fontSize: typography.xs,
    color: Colors.outline,
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
  },
  routineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  routineAddText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
  },
  routineHint: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginBottom: spacing.sm,
  },
  routinePills: {
    marginBottom: spacing.base,
  },
  routinePill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    marginRight: spacing.xs,
  },
  routinePillActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  routinePillText: {
    fontSize: typography.xs,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  routinePillTextActive: {
    color: Colors.onPrimary,
  },
  routineDetails: {
    gap: spacing.sm,
  },
  routineExerciseList: {
    gap: spacing.xs,
  },
  routineExerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
  },
  routineExerciseRowActive: {
    borderColor: Colors.primaryContainer,
  },
  routineExerciseInfo: {
    flex: 1,
  },
  routineExerciseName: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  routineExerciseMeta: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 2,
  },
  routineExerciseTag: {
    fontSize: typography.xs,
    color: Colors.primaryContainer,
    fontWeight: fontWeight.bold,
  },
  routineEditButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
  },
  routineEditText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  routineWorkoutList: {
    gap: spacing.sm,
  },
  routineWorkoutRow: {
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: Colors.surface,
  },
  routineWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  routineWorkoutName: {
    fontSize: typography.sm,
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
    fontSize: typography.xs,
    color: Colors.outline,
    marginBottom: 4,
  },
  routineInput: {
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  routineSetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
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
  routineStartButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: Colors.primaryContainer,
  },
  routineStartButtonActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
  },
  routineStartText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
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
    // Limit modal height so it stays scrollable on small screens
    maxHeight: '85%'
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
  routineExerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  addRowText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  routineExerciseScroll: {
    maxHeight: 280,
    marginBottom: spacing.base,
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
  },
  routineDraftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routineExerciseInput: {
    flex: 1,
  },
  routineRemoveBtn: {
    padding: spacing.xs,
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
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outline,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sm,
    color: Colors.onSurface,
    backgroundColor: Colors.surface,
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
  },
  modalCancelBtnText: {
    color: Colors.onSurfaceVariant,
    fontWeight: fontWeight.bold,
    fontSize: typography.base,
  },
});
