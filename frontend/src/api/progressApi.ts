import { apiClient } from '@/lib/api';

export interface ProgressEntry {
  id: string;
  weight_kg: number;
  recorded_at: string;
  recorded_date?: string | null;
  body_fat_pct?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProgressCreateInput {
  weight_kg: number;
  recorded_at: string;
  recorded_date?: string;
}

/** Fetches body progress entries from the backend API. */
export async function fetchProgressEntries() {
  const response = await apiClient.get<{ data: ProgressEntry[] }>('/api/progress');
  return response.data.data;
}

/** Creates a body progress entry via the backend API. */
export async function createProgressEntry(input: ProgressCreateInput) {
  const response = await apiClient.post<{ data: ProgressEntry }>('/api/progress', input);
  return response.data.data;
}

/** Updates an existing daily body progress entry via the backend API. */
export async function updateProgressEntry(id: string, input: ProgressCreateInput) {
  const response = await apiClient.put<{ data: ProgressEntry }>(`/api/progress/${id}`, input);
  return response.data.data;
}

/** Deletes a body progress entry via the backend API. */
export async function deleteProgressEntry(id: string) {
  await apiClient.delete(`/api/progress/${id}`);
}
