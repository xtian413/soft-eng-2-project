import { supabaseAdmin } from '../config/supabase.js';

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

function normalizeWaterGoal(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 2000;
}

function applyDailyLogFields(
  payload: Record<string, string | number | null>,
  input: DailyLogUpsertInput | DailyLogUpdateInput
) {
  if (input.bedtime !== undefined) payload.bedtime = input.bedtime;
  if (input.waketime !== undefined) payload.waketime = input.waketime;
  if (input.sleep_hours !== undefined) payload.sleep_hours = input.sleep_hours;
  if (input.water_ml !== undefined) payload.water_ml = input.water_ml;
  if (input.water_goal_ml !== undefined) payload.water_goal_ml = normalizeWaterGoal(input.water_goal_ml);
  if (input.deleted_at !== undefined) payload.deleted_at = input.deleted_at;
}

export async function getDailyLogs(userId: string, updatedSince?: string) {
  let query = supabaseAdmin
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (updatedSince) {
    query = query.gte('updated_at', updatedSince);
  }

  const { data, error } = await query;

  if (error) {
    throw { statusCode: 500, message: error.message };
  }

  return data;
}

export async function upsertDailyLog(userId: string, input: DailyLogUpsertInput) {
  const incomingUpdatedAt = input.updated_at ?? new Date().toISOString();
  const payload: Record<string, string | number | null> = {
    user_id: userId,
    date: input.date,
    water_goal_ml: normalizeWaterGoal(input.water_goal_ml),
    updated_at: incomingUpdatedAt,
  };
  applyDailyLogFields(payload, input);

  const { data, error } = await supabaseAdmin
    .from('daily_logs')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 500, message: error?.message ?? 'Failed to upsert daily log' };
  }

  return data;
}

export async function updateDailyLog(
  userId: string,
  logId: string,
  input: DailyLogUpdateInput
) {
  const payload: Record<string, string | number | null> = {
    updated_at: input.updated_at ?? new Date().toISOString(),
  };
  applyDailyLogFields(payload, input);

  const { data, error } = await supabaseAdmin
    .from('daily_logs')
    .update(payload)
    .eq('id', logId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 404, message: error?.message ?? 'Daily log not found' };
  }

  return data;
}

export async function softDeleteDailyLog(userId: string, logId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('daily_logs')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', logId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 404, message: error?.message ?? 'Daily log not found' };
  }

  return data;
}
