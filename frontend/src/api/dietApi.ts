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

/** Fetches diet logs from the backend API. Throws on failure.
 *  Pass a date string ('YYYY-MM-DD') to filter to a specific day (e.g. today).
 */
export async function fetchDietLogs(date?: string): Promise<DietLog[]> {
  // The auth token is attached automatically by the Axios request interceptor in api.ts.
  const response = await apiClient.get<{ data: DietLog[] }>('/api/diet', {
    params: date ? { date } : undefined,
  });
  return response.data.data;
}

/** Creates a diet log via the backend API. Throws on failure.
 *
 *  Why this is the safe pattern:
 *  - The Axios interceptor in api.ts attaches the Supabase Bearer token to the request header.
 *  - The backend's requireAuth middleware validates that token.
 *  - If the token is missing, expired, or the RLS policy rejects the insert on the DB side,
 *    the backend returns a non-2xx status, Axios throws, and this function throws too.
 *  - The caller must wrap this in try/catch to handle the error and avoid false success states.
 */
export async function createDietLog(input: DietLogCreateInput): Promise<DietLog> {
  const response = await apiClient.post<{ data: DietLog }>('/api/diet', input);
  return response.data.data;
}

/** Deletes a diet log via the backend API. Throws on failure. */
export async function deleteDietLog(id: string): Promise<void> {
  await apiClient.delete(`/api/diet/${id}`);
}
