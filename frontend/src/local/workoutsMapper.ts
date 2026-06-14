import type { WorkoutCreateInput, WorkoutSet, WorkoutWithSets } from '@/api/workoutApi';
import type {
  CompletedWorkoutInput,
  LocalWorkoutSet,
  LocalWorkoutWithSets,
} from '@/local/schema';
import type { WorkoutLog } from '@/ai/prompts';
import type {
  RemoteWorkoutInput,
  WorkoutSetRemoteMatch,
} from '@/local/repositories/workoutsRepository';

export function completedWorkoutToRemoteCreateInput(
  workout: CompletedWorkoutInput
): WorkoutCreateInput {
  const positiveNumberOrUndefined = (value: number | null | undefined) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
  const positiveIntegerOrUndefined = (value: number | null | undefined) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;

  return {
    name: workout.name,
    notes: workout.notes ?? undefined,
    performed_at: workout.performedAt,
    sets: workout.sets.map((set) => ({
      exercise_name: set.exerciseName,
      set_number: set.setNumber,
      reps: positiveIntegerOrUndefined(set.reps),
      weight_kg: positiveNumberOrUndefined(set.weightKg),
      duration_seconds: positiveIntegerOrUndefined(set.durationSeconds),
    })),
  };
}

export function localWorkoutToAiWorkoutLog(workout: LocalWorkoutWithSets): WorkoutLog {
  return {
    id: workout.id,
    name: workout.name,
    performedAt: workout.performed_at,
    notes: workout.notes ?? undefined,
    sets: workout.sets.map((set) => ({
      exercise: set.exercise_name,
      reps: set.reps ?? undefined,
      weightKg: set.weight_kg ?? undefined,
      durationSeconds: set.duration_seconds ?? undefined,
    })),
  };
}

export function remoteWorkoutToLocalRemoteInput(workout: WorkoutWithSets): RemoteWorkoutInput {
  return {
    id: workout.id,
    name: workout.name,
    notes: workout.notes,
    performed_at: workout.performed_at,
    created_at: workout.created_at,
    workout_sets: workout.workout_sets,
  };
}

function nullableNumberEquals(left: number | null | undefined, right: number | null | undefined) {
  const normalizedLeft = typeof left === 'number' && Number.isFinite(left) ? left : null;
  const normalizedRight = typeof right === 'number' && Number.isFinite(right) ? right : null;
  if (normalizedLeft === null || normalizedRight === null) return normalizedLeft === normalizedRight;
  return Math.abs(normalizedLeft - normalizedRight) < 0.0001;
}

function setFieldsMatch(localSet: LocalWorkoutSet, remoteSet: WorkoutSet) {
  return (
    localSet.exercise_name.trim().toLowerCase() === remoteSet.exercise_name.trim().toLowerCase() &&
    localSet.set_number === remoteSet.set_number &&
    nullableNumberEquals(localSet.reps, remoteSet.reps) &&
    nullableNumberEquals(localSet.weight_kg, remoteSet.weight_kg) &&
    nullableNumberEquals(localSet.duration_seconds, remoteSet.duration_seconds)
  );
}

export function matchRemoteWorkoutSets(
  localSets: LocalWorkoutSet[],
  remoteSets: WorkoutSet[]
): { matches: WorkoutSetRemoteMatch[]; unmatchedLocalSetIds: string[] } {
  const usedRemoteSetIds = new Set<string>();
  const matches: WorkoutSetRemoteMatch[] = [];
  const unmatchedLocalSetIds: string[] = [];

  for (const localSet of localSets) {
    const candidates = remoteSets.filter(
      (remoteSet) =>
        remoteSet.id &&
        !usedRemoteSetIds.has(remoteSet.id) &&
        setFieldsMatch(localSet, remoteSet)
    );

    if (candidates.length === 1) {
      const remoteSet = candidates[0];
      usedRemoteSetIds.add(remoteSet.id);
      matches.push({ localSetId: localSet.id, remoteSetId: remoteSet.id });
    } else {
      unmatchedLocalSetIds.push(localSet.id);
    }
  }

  return { matches, unmatchedLocalSetIds };
}
