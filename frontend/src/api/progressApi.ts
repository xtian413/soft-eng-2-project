import { apiClient } from '@/lib/api';

export interface ProgressEntry {
  id: string;
  weight_kg: number;
  recorded_at: string;
}

export interface ProgressCreateInput {
  weight_kg: number;
  recorded_at: string;
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

/** Deletes a body progress entry via the backend API. */
export async function deleteProgressEntry(id: string) {
  await apiClient.delete(`/api/progress/${id}`);
}
