import { apiClient } from '@/lib/api';

export interface Workout {
  id: string;
  name: string;
  notes: string | null;
  performed_at: string;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_name: string;
  muscle_group?: string | null;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  rir?: number | null;
  est_1rm?: number | null;
  created_at?: string;
}

export interface WorkoutWithSets extends Workout {
  workout_sets: WorkoutSet[];
}

export interface WorkoutCreateInput {
  name: string;
  notes?: string | null;
  performed_at: string;
  sets: Array<{
    exercise_name: string;
    set_number: number;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
  }>;
}

/** Fetches workouts from the backend API. */
export async function fetchWorkouts() {
  const response = await apiClient.get<{ data: WorkoutWithSets[] }>('/api/workouts');
  return response.data.data;
}

/** Creates a workout via the backend API. */
export async function createWorkout(input: WorkoutCreateInput) {
  const response = await apiClient.post<{ data: Workout }>('/api/workouts', input);
  return response.data.data;
}

/** Fetches a single workout with its workout_sets from the backend API. */
export async function fetchWorkoutById(id: string) {
  const response = await apiClient.get<{ data: WorkoutWithSets }>(`/api/workouts/${id}`);
  return response.data.data;
}

/** Deletes a workout via the backend API. */
export async function deleteWorkout(id: string) {
  await apiClient.delete(`/api/workouts/${id}`);
}
