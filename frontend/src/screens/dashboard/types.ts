/** Shared types for the Dashboard tab screens matching web pages model */

export type GoalKey = 'moderate_cut' | 'aggressive_cut' | 'lean_bulk' | 'maintain' | 'build_muscle' | 'lose_weight';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';

export interface MacroRatios {
  proteinPct: number;
  carbsPct: number;
  fatsPct: number;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export const GOAL_TARGETS: Record<GoalKey, MacroTargets> = {
  moderate_cut:   { calories: 2000, protein: 130, carbs: 180, fats: 50 },
  aggressive_cut: { calories: 1500, protein: 130, carbs: 120, fats: 40 },
  lean_bulk:      { calories: 2700, protein: 150, carbs: 250, fats: 70 },
  maintain:       { calories: 2400, protein: 140, carbs: 190, fats: 60 },
  build_muscle:   { calories: 2300, protein: 150, carbs: 200, fats: 65 },
  lose_weight:    { calories: 2000, protein: 130, carbs: 180, fats: 50 },
};

export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: string;
  remoteId?: string | null;
  syncStatus?: 'pending' | 'synced' | 'failed';
  name: string;
  mealId: MealId;
  calories: number;
  protein: number;
  carbs: number;
  fat: number; // matched with web fat
  fiber: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  folate: number;
  servingSize: number;
  servingUnit: string;
}

export interface WorkoutSet {
  id: string;
  exercise: string;
  reps: number;
  weightKg: number;
}
