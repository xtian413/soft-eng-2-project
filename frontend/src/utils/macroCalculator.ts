import type { GoalKey, ActivityLevel, MacroTargets } from '@/screens/dashboard/types';

export function calculateMacros(
  weightKg: number,
  heightCm: number,
  gender: 'male' | 'female',
  goal: GoalKey,
  age: number = 22,
  activityLevel: ActivityLevel = 'lightly_active',
  macroProteinPct?: number | null,
  macroCarbsPct?: number | null,
  macroFatsPct?: number | null
): MacroTargets {
  // 1. Calculate BMR (Mifflin-St Jeor)
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // 2. Calculate TDEE using activity level
  let activityMultiplier = 1.375; // Default lightly active
  if (activityLevel === 'sedentary') activityMultiplier = 1.2;
  else if (activityLevel === 'lightly_active') activityMultiplier = 1.375;
  else if (activityLevel === 'moderately_active') activityMultiplier = 1.55;
  else if (activityLevel === 'very_active') activityMultiplier = 1.725;
  else if (activityLevel === 'extremely_active') activityMultiplier = 1.9;

  const tdee = bmr * activityMultiplier;

  // 3. Calculate Target Calories based on Goal
  let targetCalories = tdee;
  if (goal === 'lose_weight' || goal === 'moderate_cut') {
    targetCalories -= 500;
  } else if (goal === 'aggressive_cut') {
    targetCalories -= 750;
  } else if (goal === 'build_muscle' || goal === 'lean_bulk') {
    targetCalories += 300;
  }
  // 'maintain' keeps targetCalories = tdee

  targetCalories = Math.max(1200, Math.round(targetCalories));

  // 4. Calculate Target Macros
  let protein = 0;
  let fats = 0;
  let carbs = 0;

  const hasCustomMacros =
    typeof macroProteinPct === 'number' &&
    typeof macroCarbsPct === 'number' &&
    typeof macroFatsPct === 'number';

  if (hasCustomMacros) {
    protein = Math.max(0, Math.round((targetCalories * (macroProteinPct / 100)) / 4));
    carbs = Math.max(0, Math.round((targetCalories * (macroCarbsPct / 100)) / 4));
    fats = Math.max(0, Math.round((targetCalories * (macroFatsPct / 100)) / 9));
  } else {
    // Default targets
    // Protein: 0.8g per lb of body weight
    const weightLbs = weightKg * 2.20462;
    protein = Math.round(weightLbs * 0.8);

    // Fats: 0.8g per kg of body weight
    fats = Math.round(weightKg * 0.8);

    // Carbs: Remaining calories divided by 4
    const caloriesFromProteinAndFat = (protein * 4) + (fats * 9);
    const remainingCalories = targetCalories - caloriesFromProteinAndFat;
    carbs = Math.max(0, Math.round(remainingCalories / 4));
  }

  return {
    calories: targetCalories,
    protein,
    carbs,
    fats,
  };
}
