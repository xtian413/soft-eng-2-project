import type {
  CreateLocalRoutineInput,
  LocalRoutineExercise,
  LocalRoutineWithExercises,
  SyncStatus,
} from '@/local/schema';
import type { RoutineExerciseRemoteMatch } from '@/local/repositories/routinesRepository';

export interface RoutineViewExercise {
  id: string;
  routine_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  muscle_group?: string | null;
}

export interface RoutineView {
  id: string;
  name: string;
  routines_id?: string | null;
  remote_id?: string | null;
  sync_status?: SyncStatus;
  exercises: RoutineViewExercise[];
}

export interface RoutineDraftLike {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  weightUnit: 'lbs' | 'kg';
  muscleGroup?: string | null;
}

export interface RemoteRoutineRow {
  id: string;
  routine_name: string;
  routines_id: string | null;
}

export interface RemoteRoutineSetRow {
  id?: string | null;
  workout_id: string;
  exercise_name: string;
  muscle_group?: string | null;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
}

function normalizeInteger(value: number | null | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : fallback;
}

function normalizeNumber(value: number | null | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function routineDraftsToLocalInput(
  routineName: string,
  drafts: RoutineDraftLike[],
  options?: {
    remoteId?: string | null;
    remoteTemplateWorkoutId?: string | null;
  }
): CreateLocalRoutineInput {
  return {
    routineName,
    remoteId: options?.remoteId ?? null,
    remoteTemplateWorkoutId: options?.remoteTemplateWorkoutId ?? null,
    exercises: drafts
      .filter((draft) => draft.name.trim().length > 0)
      .map((draft, index) => {
        const weight = parseFloat(draft.weight) || 0;
        return {
          exerciseName: draft.name.trim(),
          muscleGroup: draft.muscleGroup ?? null,
          sortOrder: index,
          sets: Math.max(1, parseInt(draft.sets, 10) || 1),
          reps: Math.max(1, parseInt(draft.reps, 10) || 1),
          weightKg: draft.weightUnit === 'lbs' ? weight * 0.45359237 : weight,
        };
      }),
  };
}

export function localRoutineToView(routine: LocalRoutineWithExercises): RoutineView {
  return {
    id: routine.id,
    name: routine.routine_name,
    routines_id: routine.remote_template_workout_id,
    remote_id: routine.remote_id,
    sync_status: routine.sync_status,
    exercises: routine.exercises
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((exercise) => ({
        id: exercise.id,
        routine_id: routine.id,
        exercise_name: exercise.exercise_name,
        sets: normalizeInteger(exercise.sets, 1),
        reps: normalizeInteger(exercise.reps, 1),
        weight_kg: normalizeNumber(exercise.weight_kg, 0),
        muscle_group: exercise.muscle_group,
      })),
  };
}

export function localRoutinesToViews(routines: LocalRoutineWithExercises[]): RoutineView[] {
  return routines.map(localRoutineToView);
}

export function routineViewToLocalInput(routine: RoutineView): CreateLocalRoutineInput {
  return {
    routineName: routine.name,
    remoteId: routine.remote_id ?? null,
    remoteTemplateWorkoutId: routine.routines_id ?? null,
    exercises: routine.exercises.map((exercise, index) => ({
      id: exercise.id,
      exerciseName: exercise.exercise_name,
      muscleGroup: exercise.muscle_group ?? null,
      sortOrder: index,
      sets: exercise.sets,
      reps: exercise.reps,
      weightKg: exercise.weight_kg,
    })),
  };
}

export function remoteRoutineToLocalInput(
  routine: RemoteRoutineRow,
  setRows: RemoteRoutineSetRow[]
): CreateLocalRoutineInput & {
  remoteId: string;
  remoteTemplateWorkoutId: string;
} {
  const grouped = new Map<
    string,
    {
      remoteId: string | null;
      exerciseName: string;
      muscleGroup: string | null;
      sets: number;
      reps: number | null;
      weightKg: number | null;
      firstSetNumber: number;
    }
  >();

  setRows
    .filter((row) => row.workout_id === routine.routines_id)
    .forEach((row) => {
      const key = `${row.workout_id}:${row.exercise_name.trim().toLowerCase()}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.sets += 1;
        existing.firstSetNumber = Math.min(existing.firstSetNumber, row.set_number);
        return;
      }

      grouped.set(key, {
        remoteId: row.id ?? null,
        exerciseName: row.exercise_name.trim(),
        muscleGroup: row.muscle_group ?? null,
        sets: 1,
        reps: row.reps,
        weightKg: row.weight_kg,
        firstSetNumber: row.set_number,
      });
    });

  return {
    routineName: routine.routine_name,
    remoteId: routine.id,
    remoteTemplateWorkoutId: routine.routines_id ?? '',
    exercises: [...grouped.values()]
      .sort((left, right) => left.firstSetNumber - right.firstSetNumber)
      .map((exercise, index) => ({
        remoteId: exercise.remoteId,
        exerciseName: exercise.exerciseName,
        muscleGroup: exercise.muscleGroup,
        sortOrder: index,
        sets: exercise.sets,
        reps: normalizeInteger(exercise.reps, 1),
        weightKg: normalizeNumber(exercise.weightKg, 0),
      })),
  };
}

function localExerciseMatchesRemote(
  localExercise: LocalRoutineExercise,
  remoteSet: RemoteRoutineSetRow
) {
  return (
    localExercise.exercise_name.trim().toLowerCase() === remoteSet.exercise_name.trim().toLowerCase() &&
    (localExercise.reps ?? null) === (remoteSet.reps ?? null) &&
    Math.abs((localExercise.weight_kg ?? 0) - (remoteSet.weight_kg ?? 0)) < 0.0001
  );
}

export function matchRemoteRoutineExercises(
  localExercises: LocalRoutineExercise[],
  remoteSets: RemoteRoutineSetRow[]
): RoutineExerciseRemoteMatch[] {
  const matches: RoutineExerciseRemoteMatch[] = [];
  const usedRemoteIds = new Set<string>();

  for (const localExercise of localExercises) {
    const remoteSet = remoteSets.find(
      (candidate) =>
        candidate.id &&
        !usedRemoteIds.has(candidate.id) &&
        localExerciseMatchesRemote(localExercise, candidate)
    );

    if (remoteSet?.id) {
      usedRemoteIds.add(remoteSet.id);
      matches.push({
        localExerciseId: localExercise.id,
        remoteExerciseId: remoteSet.id,
      });
    }
  }

  return matches;
}
