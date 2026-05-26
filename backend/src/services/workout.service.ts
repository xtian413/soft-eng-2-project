import { supabaseAdmin } from '../config/supabase.js';

export interface WorkoutSetInput {
  exercise_name: string;
  set_number: number;
  reps?: number | null;
  weight_kg?: number | null;
  duration_seconds?: number | null;
}

export interface WorkoutCreateInput {
  name: string;
  notes?: string;
  performed_at: string;
  sets: WorkoutSetInput[];
}

export interface WorkoutUpdateInput {
  name?: string;
  notes?: string;
  performed_at?: string;
}

/** Fetches workouts for a user. */
export async function getWorkoutsForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('performed_at', { ascending: false });

  if (error) {
    throw { statusCode: 500, message: error.message };
  }

  return data;
}

/** Fetches a workout with its sets for a user. */
export async function getWorkoutWithSets(workoutId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('workouts')
    .select('*, workout_sets(*)')
    .eq('id', workoutId)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw { statusCode: 404, message: error.message };
  }

  return data;
}

/** Creates a workout and optional sets for a user. */
export async function createWorkoutWithSets(
  userId: string,
  input: WorkoutCreateInput
) {
  const { data: workout, error } = await supabaseAdmin
    .from('workouts')
    .insert({
      user_id: userId,
      name: input.name,
      notes: input.notes ?? null,
      performed_at: input.performed_at,
    })
    .select('*')
    .single();

  if (error || !workout) {
    throw { statusCode: 500, message: error?.message ?? 'Failed to create workout' };
  }

  const setsPayload = input.sets.map((set) => ({
    workout_id: workout.id as string,
    exercise_name: set.exercise_name,
    set_number: set.set_number,
    reps: set.reps ?? null,
    weight_kg: set.weight_kg ?? null,
    duration_seconds: set.duration_seconds ?? null,
  }));

  const { error: setsError } = await supabaseAdmin
    .from('workout_sets')
    .insert(setsPayload);

  if (setsError) {
    await supabaseAdmin.from('workouts').delete().eq('id', workout.id as string);
    throw { statusCode: 500, message: setsError.message };
  }

  return workout;
}

/** Updates a workout for a user. */
export async function updateWorkout(
  workoutId: string,
  userId: string,
  input: WorkoutUpdateInput
) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('user_id', userId)
    .single();

  if (existingError || !existing) {
    throw { statusCode: 404, message: existingError?.message ?? 'Workout not found' };
  }

  const updatePayload: WorkoutUpdateInput = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.performed_at !== undefined) {
    updatePayload.performed_at = input.performed_at;
  }

  const { data, error } = await supabaseAdmin
    .from('workouts')
    .update(updatePayload)
    .eq('id', workoutId)
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 404, message: error?.message ?? 'Workout not found' };
  }

  return data;
}

/** Deletes a workout for a user. */
export async function deleteWorkout(workoutId: string, userId: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('user_id', userId)
    .single();

  if (existingError || !existing) {
    throw { statusCode: 404, message: existingError?.message ?? 'Workout not found' };
  }

  const { error } = await supabaseAdmin.from('workouts').delete().eq('id', workoutId);

  if (error) {
    throw { statusCode: 500, message: error.message };
  }
}
