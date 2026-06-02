import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FitnessInsight, FitnessInsightInput } from '@/ai/insights/fitnessInsight';

const FITNESS_INSIGHT_CACHE_KEY = 'gemi:fitnessInsight:v8';

type CachedFitnessInsight = {
  signature: string;
  generatedAt: string;
  insight: FitnessInsight;
};

function compactNumber(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

export function buildFitnessInsightSignature(input: FitnessInsightInput) {
  return JSON.stringify({
    userName: input.userName,
    goal: input.goal,
    body: [compactNumber(input.weightKg), compactNumber(input.heightCm)],
    targets: input.targets,
    foodLogs: input.foodLogs
      .map((item) => ({
        id: item.id,
        name: item.name,
        calories: compactNumber(item.calories),
        protein: compactNumber(item.protein),
        carbs: compactNumber(item.carbs),
        fat: compactNumber(item.fat),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    workouts: input.workouts
      .slice(-5)
      .map((workout) => ({
        id: workout.id,
        name: workout.name,
        performedAt: workout.performedAt,
        sets: workout.sets.map((set) => ({
          exercise: set.exercise,
          reps: set.reps,
          weightKg: set.weightKg,
          durationSeconds: set.durationSeconds,
        })),
      })),
  });
}

export async function loadCachedFitnessInsight(signature: string) {
  const raw = await AsyncStorage.getItem(FITNESS_INSIGHT_CACHE_KEY);
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as CachedFitnessInsight;
    if (cached.signature !== signature) return null;
    return {
      insight: cached.insight,
      generatedAt: new Date(cached.generatedAt),
    };
  } catch {
    return null;
  }
}

export async function saveCachedFitnessInsight(
  signature: string,
  insight: FitnessInsight,
  generatedAt: Date,
) {
  const payload: CachedFitnessInsight = {
    signature,
    insight,
    generatedAt: generatedAt.toISOString(),
  };
  await AsyncStorage.setItem(FITNESS_INSIGHT_CACHE_KEY, JSON.stringify(payload));
}
