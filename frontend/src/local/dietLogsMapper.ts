import type { DietLog, DietLogCreateInput, DietLogUpdateInput } from '@/api/dietApi';
import type { CreateLocalDietLogInput, LocalDietLog } from '@/local/schema';
import type { FoodLogEntry, MealId } from '@/screens/dashboard/types';

function normalizeMealId(value: string | null | undefined): MealId {
  const isValid = value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack';
  if (!isValid && value != null) {
    console.warn(`[dietLogsMapper.normalizeMealId] Unexpected meal_id "${value}" — defaulting to 'breakfast'`);
  }
  if (value == null) {
    console.warn(`[dietLogsMapper.normalizeMealId] Received null/undefined meal_id — defaulting to 'breakfast'`);
  }
  return isValid ? value : 'breakfast';
}

function normalizeRemoteLoggedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid diet log logged_at timestamp: ${value}`);
  }

  return value.endsWith('Z') ? value : parsed.toISOString();
}

export function localDietLogToFoodLogEntry(log: LocalDietLog): FoodLogEntry {
  return {
    id: log.id,
    remoteId: log.remote_id,
    syncStatus: log.sync_status,
    name: log.meal_name,
    mealId: normalizeMealId(log.meal_id),
    calories: log.calories ?? 0,
    protein: log.protein_g ?? 0,
    carbs: log.carbs_g ?? 0,
    fat: log.fat_g ?? 0,
    fiber: log.fiber_g ?? 0,
    sodium: log.sodium_mg ?? 0,
    potassium: log.potassium_mg ?? 0,
    calcium: log.calcium_mg ?? 0,
    iron: log.iron_mg ?? 0,
    vitaminC: log.vitamin_c_mg ?? 0,
    folate: log.folate_mcg ?? 0,
    servingSize: log.serving_size ?? 1,
    servingUnit: log.serving_unit ?? 'serving',
  };
}

export function foodLogEntryToCreateLocalDietLogInput(
  userId: string,
  entry: FoodLogEntry,
  loggedAt: string,
  sourceFoodId?: string | null
): CreateLocalDietLogInput {
  return {
    user_id: userId,
    meal_id: normalizeMealId(entry.mealId),
    meal_name: entry.name,
    calories: entry.calories,
    protein_g: entry.protein,
    carbs_g: entry.carbs,
    fat_g: entry.fat,
    fiber_g: entry.fiber,
    sodium_mg: entry.sodium,
    potassium_mg: entry.potassium,
    calcium_mg: entry.calcium,
    iron_mg: entry.iron,
    vitamin_c_mg: entry.vitaminC,
    folate_mcg: entry.folate,
    serving_size: entry.servingSize,
    serving_unit: entry.servingUnit,
    source_food_id: sourceFoodId,
    logged_at: loggedAt,
  };
}

export function foodLogEntryToRemoteCreateInput(
  entry: FoodLogEntry,
  loggedAt: string,
  sourceFoodId?: string | null
): DietLogCreateInput {
  return {
    meal_id: normalizeMealId(entry.mealId),
    meal_name: entry.name,
    source_food_id: sourceFoodId ?? undefined,
    calories: entry.calories,
    protein_g: entry.protein,
    carbs_g: entry.carbs,
    fat_g: entry.fat,
    fiber_g: entry.fiber,
    sodium_mg: entry.sodium,
    potassium_mg: entry.potassium,
    calcium_mg: entry.calcium,
    iron_mg: entry.iron,
    vitamin_c_mg: entry.vitaminC,
    folate_mcg: entry.folate,
    serving_size: entry.servingSize,
    serving_unit: entry.servingUnit,
    logged_at: normalizeRemoteLoggedAt(loggedAt),
  };
}

export function foodLogEntryToRemoteUpdateInput(
  entry: FoodLogEntry,
  loggedAt: string,
  sourceFoodId?: string | null
): DietLogUpdateInput {
  return {
    meal_id: normalizeMealId(entry.mealId),
    meal_name: entry.name,
    source_food_id: sourceFoodId ?? undefined,
    calories: entry.calories,
    protein_g: entry.protein,
    carbs_g: entry.carbs,
    fat_g: entry.fat,
    fiber_g: entry.fiber,
    sodium_mg: entry.sodium,
    potassium_mg: entry.potassium,
    calcium_mg: entry.calcium,
    iron_mg: entry.iron,
    vitamin_c_mg: entry.vitaminC,
    folate_mcg: entry.folate,
    serving_size: entry.servingSize,
    serving_unit: entry.servingUnit,
    logged_at: normalizeRemoteLoggedAt(loggedAt),
  };
}

export function remoteDietLogToLocalRemoteInput(log: DietLog) {
  return {
    id: log.id,
    meal_id: normalizeMealId(log.meal_id),
    meal_name: log.meal_name,
    calories: log.calories,
    protein_g: log.protein_g,
    carbs_g: log.carbs_g,
    fat_g: log.fat_g,
    fiber_g: log.fiber_g ?? null,
    sodium_mg: log.sodium_mg ?? null,
    potassium_mg: log.potassium_mg ?? null,
    calcium_mg: log.calcium_mg ?? null,
    iron_mg: log.iron_mg ?? null,
    vitamin_c_mg: log.vitamin_c_mg ?? null,
    folate_mcg: log.folate_mcg ?? null,
    serving_size: log.serving_size ?? null,
    serving_unit: log.serving_unit ?? null,
    source_food_id: log.source_food_id ?? null,
    logged_at: log.logged_at,
    created_at: log.created_at,
  };
}
