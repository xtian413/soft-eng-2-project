import { apiClient } from '@/lib/api';

export interface DietLog {
  id: string;
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string;
  created_at: string;
}

export interface DietLogCreateInput {
  meal_name: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  logged_at: string;
}

/** Fetches diet logs from the backend API. */
export async function fetchDietLogs() {
  const response = await apiClient.get<{ data: DietLog[] }>('/api/diet');
  return response.data.data;
}

/** Creates a diet log via the backend API. */
export async function createDietLog(input: DietLogCreateInput) {
  const response = await apiClient.post<{ data: DietLog }>('/api/diet', input);
  return response.data.data;
}

/** Deletes a diet log via the backend API. */
export async function deleteDietLog(id: string) {
  await apiClient.delete(`/api/diet/${id}`);
}
