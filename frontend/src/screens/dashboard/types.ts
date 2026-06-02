/** Shared types for the Dashboard tab screens matching web pages model */

export type GoalKey = 'build_muscle' | 'lose_weight' | 'maintain';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export const GOAL_TARGETS: Record<GoalKey, MacroTargets> = {
  build_muscle: { calories: 2300, protein: 150, carbs: 200, fats: 65 },
  lose_weight:  { calories: 2000, protein: 130, carbs: 180, fats: 50 },
  maintain:     { calories: 2400, protein: 140, carbs: 190, fats: 60 },
};

export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: string;
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
