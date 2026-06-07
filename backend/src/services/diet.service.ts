import { supabaseAdmin } from '../config/supabase.js';

export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DietLogCreateInput {
  meal_id?: MealId;
  meal_name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  logged_at: string;
}

export interface DietLogUpdateInput {
  meal_id?: MealId;
  meal_name?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  logged_at?: string;
}

/** Fetches diet logs for a user. */
export async function getDietLogs(userId: string, date?: string) {
  let query = supabaseAdmin
    .from('diet_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });

  if (date) {
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    query = query.gte('logged_at', start).lte('logged_at', end);
  }

  const { data, error } = await query;

  if (error) {
    throw { statusCode: 500, message: error.message };
  }

  return data;
}

/** Fetches a diet log for a user. */
export async function getDietLogById(userId: string, logId: string) {
  const { data, error } = await supabaseAdmin
    .from('diet_logs')
    .select('*')
    .eq('id', logId)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw { statusCode: 404, message: error.message };
  }

  return data;
}

/** Creates a diet log for a user. */
export async function createDietLog(userId: string, input: DietLogCreateInput) {
  const { data, error } = await supabaseAdmin
    .from('diet_logs')
    .insert({
      user_id: userId,
      meal_id: input.meal_id ?? 'breakfast',
      meal_name: input.meal_name,
      calories: input.calories ?? null,
      protein_g: input.protein_g ?? null,
      carbs_g: input.carbs_g ?? null,
      fat_g: input.fat_g ?? null,
      logged_at: input.logged_at,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 500, message: error?.message ?? 'Failed to create diet log' };
  }

  return data;
}

/** Updates a diet log for a user. */
export async function updateDietLog(
  userId: string,
  logId: string,
  input: DietLogUpdateInput
) {
  const updatePayload: DietLogUpdateInput = {};
  if (input.meal_id !== undefined) updatePayload.meal_id = input.meal_id;
  if (input.meal_name !== undefined) updatePayload.meal_name = input.meal_name;
  if (input.calories !== undefined) updatePayload.calories = input.calories;
  if (input.protein_g !== undefined) updatePayload.protein_g = input.protein_g;
  if (input.carbs_g !== undefined) updatePayload.carbs_g = input.carbs_g;
  if (input.fat_g !== undefined) updatePayload.fat_g = input.fat_g;
  if (input.logged_at !== undefined) updatePayload.logged_at = input.logged_at;

  const { data, error } = await supabaseAdmin
    .from('diet_logs')
    .update(updatePayload)
    .eq('id', logId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw { statusCode: 404, message: error?.message ?? 'Diet log not found' };
  }

  return data;
}

/** Deletes a diet log for a user. */
export async function deleteDietLog(userId: string, logId: string) {
  const { error } = await supabaseAdmin
    .from('diet_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', userId);

  if (error) {
    throw { statusCode: 500, message: error.message };
  }
}
