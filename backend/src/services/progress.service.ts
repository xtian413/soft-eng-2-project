import { supabaseAdmin } from '../config/supabase.js';

export interface ProgressCreateInput {
  weight_kg: number;
  recorded_at: string;
}

export interface ProgressUpdateInput {
  weight_kg?: number;
  recorded_at?: string;
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
  const { data, error } = await supabaseAdmin
    .from('body_progress')
    .insert({
      user_id: userId,
      weight_kg: input.weight_kg,
      recorded_at: input.recorded_at,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 500, message: error?.message ?? 'Failed to create entry' };
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
