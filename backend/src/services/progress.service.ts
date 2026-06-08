import { supabaseAdmin } from '../config/supabase.js';

export interface ProgressCreateInput {
  weight_kg: number;
  recorded_at: string;
  recorded_date?: string;
}

export interface ProgressUpdateInput {
  weight_kg?: number;
  recorded_at?: string;
  recorded_date?: string;
}

function normalizeRecordedDate(recordedAt: string, recordedDate?: string) {
  if (recordedDate && /^\d{4}-\d{2}-\d{2}$/.test(recordedDate)) {
    return recordedDate;
  }

  const parsed = new Date(recordedAt);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw { statusCode: 400, message: 'Invalid progress recorded_at date' };
}

/** Fetches body progress entries for a user. */
export async function getProgressEntries(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('body_progress')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false });

  if (error) {
    throw { statusCode: 500, message: error.message };
  }

  return data;
}

/** Creates a body progress entry for a user. */
export async function createProgressEntry(
  userId: string,
  input: ProgressCreateInput
) {
  const recordedDate = normalizeRecordedDate(input.recorded_at, input.recorded_date);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('body_progress')
    .upsert({
      user_id: userId,
      weight_kg: input.weight_kg,
      recorded_at: input.recorded_at,
      recorded_date: recordedDate,
      updated_at: now,
    }, { onConflict: 'user_id,recorded_date' })
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 500, message: error?.message ?? 'Failed to create entry' };
  }

  return data;
}

/** Updates a body progress entry for a user. */
export async function updateProgressEntry(
  userId: string,
  entryId: string,
  input: ProgressCreateInput
) {
  const recordedDate = normalizeRecordedDate(input.recorded_at, input.recorded_date);
  const { data, error } = await supabaseAdmin
    .from('body_progress')
    .update({
      weight_kg: input.weight_kg,
      recorded_at: input.recorded_at,
      recorded_date: recordedDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 500, message: error?.message ?? 'Failed to update entry' };
  }

  return data;
}

/** Deletes a body progress entry for a user. */
export async function deleteProgressEntry(userId: string, entryId: string) {
  const { error } = await supabaseAdmin
    .from('body_progress')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);

  if (error) {
    throw { statusCode: 500, message: error.message };
  }
}
