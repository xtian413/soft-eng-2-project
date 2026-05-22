import { apiClient } from '@/lib/api';

export interface Workout {
  id: string;
  name: string;
  notes: string | null;
  performed_at: string;
  created_at: string;
}

export interface WorkoutCreateInput {
  name: string;
  notes?: string | null;
  performed_at: string;
}

/** Fetches workouts from the backend API. */
export async function fetchWorkouts() {
  const response = await apiClient.get<{ data: Workout[] }>('/api/workouts');
  return response.data.data;
}

/** Creates a workout via the backend API. */
export async function createWorkout(input: WorkoutCreateInput) {
  const response = await apiClient.post<{ data: Workout }>('/api/workouts', input);
  return response.data.data;
}

/** Deletes a workout via the backend API. */
export async function deleteWorkout(id: string) {
  await apiClient.delete(`/api/workouts/${id}`);
}
