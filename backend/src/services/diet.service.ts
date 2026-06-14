import { supabaseAdmin } from '../config/supabase.js';

export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DietLogCreateInput {
  meal_id?: MealId;
  meal_name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number | null;
  sodium_mg?: number | null;
  potassium_mg?: number | null;
  calcium_mg?: number | null;
  iron_mg?: number | null;
  vitamin_c_mg?: number | null;
  folate_mcg?: number | null;
  serving_size?: number | null;
  serving_unit?: string | null;
  source_food_id?: string | null;
  logged_at: string;
}

export interface DietLogUpdateInput {
  meal_id?: MealId;
  meal_name?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number | null;
  sodium_mg?: number | null;
  potassium_mg?: number | null;
  calcium_mg?: number | null;
  iron_mg?: number | null;
  vitamin_c_mg?: number | null;
  folate_mcg?: number | null;
  serving_size?: number | null;
  serving_unit?: string | null;
  source_food_id?: string | null;
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
      fiber_g: input.fiber_g ?? null,
      sodium_mg: input.sodium_mg ?? null,
      potassium_mg: input.potassium_mg ?? null,
      calcium_mg: input.calcium_mg ?? null,
      iron_mg: input.iron_mg ?? null,
      vitamin_c_mg: input.vitamin_c_mg ?? null,
      folate_mcg: input.folate_mcg ?? null,
      serving_size: input.serving_size ?? null,
      serving_unit: input.serving_unit ?? null,
      source_food_id: input.source_food_id ?? null,
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
  if (input.fiber_g !== undefined) updatePayload.fiber_g = input.fiber_g;
  if (input.sodium_mg !== undefined) updatePayload.sodium_mg = input.sodium_mg;
  if (input.potassium_mg !== undefined) updatePayload.potassium_mg = input.potassium_mg;
  if (input.calcium_mg !== undefined) updatePayload.calcium_mg = input.calcium_mg;
  if (input.iron_mg !== undefined) updatePayload.iron_mg = input.iron_mg;
  if (input.vitamin_c_mg !== undefined) updatePayload.vitamin_c_mg = input.vitamin_c_mg;
  if (input.folate_mcg !== undefined) updatePayload.folate_mcg = input.folate_mcg;
  if (input.serving_size !== undefined) updatePayload.serving_size = input.serving_size;
  if (input.serving_unit !== undefined) updatePayload.serving_unit = input.serving_unit;
  if (input.source_food_id !== undefined) updatePayload.source_food_id = input.source_food_id;
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
