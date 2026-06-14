import type { GoalKey, ActivityLevel, MacroTargets } from '@/screens/dashboard/types';

/** BMR computed via Mifflin-St Jeor equation, TDEE via activity multiplier. */
export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female',
  activityLevel: ActivityLevel
): { bmr: number; tdee: number } {
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };

  const tdee = bmr * (activityMultipliers[activityLevel] ?? 1.375);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}

/** Calculates daily calorie target and macro split based on body stats, goal, and optional custom ratios. */
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
  const { tdee } = calculateTDEE(weightKg, heightCm, age, gender, activityLevel);

  // Calorie offset by goal
  let targetCalories = tdee;
  if (goal === 'moderate_cut') {
    targetCalories -= 500;
  } else if (goal === 'aggressive_cut') {
    targetCalories -= 750;
  } else if (goal === 'lean_bulk') {
    targetCalories += 300;
  }
  // 'maintain' keeps targetCalories = tdee

  const minCalories = gender === 'male' ? 1500 : 1200;
  targetCalories = Math.max(minCalories, Math.round(targetCalories));

  // Calculate macros
  const hasCustomMacros =
    typeof macroProteinPct === 'number' &&
    typeof macroCarbsPct === 'number' &&
    typeof macroFatsPct === 'number';

  let protein: number;
  let fats: number;
  let carbs: number;

  if (hasCustomMacros) {
    const pctP = macroProteinPct as number;
    const pctC = macroCarbsPct as number;
    const pctF = macroFatsPct as number;

    const rawFats = Math.round((targetCalories * (pctF / 100)) / 9);
    const minFatGrams = Math.round(weightKg * 0.5);
    fats = Math.max(minFatGrams, rawFats);

    protein = Math.max(0, Math.round((targetCalories * (pctP / 100)) / 4));
    carbs = Math.max(0, Math.round((targetCalories * (pctC / 100)) / 4));
  } else {
    // Default targets — protein scales by goal intensity
    const weightLbs = weightKg * 2.20462;
    if (goal === 'aggressive_cut') {
      protein = Math.round(weightLbs * 1.0);
    } else if (goal === 'moderate_cut') {
      protein = Math.round(weightLbs * 0.85);
    } else {
      protein = Math.round(weightLbs * 0.8);
    }

    // Fats: 0.8g per kg of body weight
    fats = Math.round(weightKg * 0.8);

    // Carbs: remaining calories divided by 4
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
