import { apiClient } from '@/lib/api';

export interface DailyLog {
  id: string;
  date: string;
  bedtime: string | null;
  waketime: string | null;
  sleep_hours: number | null;
  water_ml: number | null;
  water_goal_ml: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DailyLogUpsertInput {
  date: string;
  bedtime?: string | null;
  waketime?: string | null;
  sleep_hours?: number | null;
  water_ml?: number | null;
  water_goal_ml?: number | null;
  updated_at?: string;
  deleted_at?: string | null;
}

export type DailyLogUpdateInput = Partial<Omit<DailyLogUpsertInput, 'date'>>;

export async function fetchDailyLogs(updatedSince?: string): Promise<DailyLog[]> {
  const response = await apiClient.get<{ data: DailyLog[] }>('/api/daily', {
    params: updatedSince ? { updatedSince } : undefined,
  });
  return response.data.data;
}

export async function upsertDailyLog(input: DailyLogUpsertInput): Promise<DailyLog> {
  const response = await apiClient.post<{ data: DailyLog }>('/api/daily', input);
  return response.data.data;
}

export async function updateDailyLog(id: string, input: DailyLogUpdateInput): Promise<DailyLog> {
  const response = await apiClient.put<{ data: DailyLog }>(`/api/daily/${id}`, input);
  return response.data.data;
}

export async function deleteDailyLog(id: string): Promise<DailyLog> {
  const response = await apiClient.delete<{ data: DailyLog }>(`/api/daily/${id}`);
  return response.data.data;
}
