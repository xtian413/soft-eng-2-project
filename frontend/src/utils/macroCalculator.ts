import type { GoalKey, MacroTargets } from '@/screens/dashboard/types';

export function calculateMacros(
  weightKg: number,
  heightCm: number,
  gender: 'male' | 'female',
  goal: GoalKey,
  age: number = 22 // Default age per requirements
): MacroTargets {
  // 1. Calculate BMR (Mifflin-St Jeor)
  // Male: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
  // Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161
  
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // 2. Calculate TDEE (Lightly Active multiplier)
  const TDEE_MULTIPLIER = 1.375;
  const tdee = bmr * TDEE_MULTIPLIER;

  // 3. Calculate Target Calories based on Goal
  let targetCalories = tdee;
  if (goal === 'lose_weight') {
    targetCalories -= 500;
  } else if (goal === 'build_muscle') {
    targetCalories += 300;
  }
  // 'maintain' keeps targetCalories = tdee

  // 4. Calculate Target Macros
  // Protein: 2.2g per kg of body weight
  const protein = Math.round(weightKg * 2.2);

  // Fats: 0.8g per kg of body weight
  const fats = Math.round(weightKg * 0.8);

  // Carbs: Remaining calories divided by 4
  // 1g protein = 4 kcal, 1g fat = 9 kcal, 1g carb = 4 kcal
  const caloriesFromProteinAndFat = (protein * 4) + (fats * 9);
  const remainingCalories = targetCalories - caloriesFromProteinAndFat;
  
  // Ensure carbs don't go negative if goal is extreme
  const carbs = Math.max(0, Math.round(remainingCalories / 4));

  return {
    calories: Math.round(targetCalories),
    protein,
    carbs,
    fats,
  };
}
