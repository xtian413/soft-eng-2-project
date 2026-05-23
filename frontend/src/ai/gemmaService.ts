import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import {
  buildWorkoutInsightPrompt,
  type DietLog,
  type WorkoutLog,
} from './prompts';

const WORKOUT_STORAGE_KEY = 'gemi:workouts';
const DIET_STORAGE_KEY = 'gemi:dietLogs';

type GemmaNativeModule = {
  initModel: (modelPath: string) => Promise<void>;
  generateResponse: (prompt: string) => Promise<string>;
};

function getGemmaModule(): GemmaNativeModule {
  const module = NativeModules.GemmaModule as GemmaNativeModule | undefined;
  if (!module) {
    throw new Error('GemmaModule is not registered. Did you run prebuild and add GemmaPackage?');
  }
  return module;
}

async function loadJsonArray<T>(storageKey: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${storageKey}: ${message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid payload for ${storageKey}: expected array`);
  }
  return parsed as T[];
}

export async function initGemmaModel(modelPath: string) {
  const module = getGemmaModule();
  await module.initModel(modelPath);
}

export async function generateWorkoutInsight(userName: string) {
  const [workouts, dietLogs] = await Promise.all([
    loadJsonArray<WorkoutLog>(WORKOUT_STORAGE_KEY),
    loadJsonArray<DietLog>(DIET_STORAGE_KEY),
  ]);

  const prompt = buildWorkoutInsightPrompt(userName, workouts, dietLogs);
  return getGemmaModule().generateResponse(prompt);
}

export async function saveWorkoutLogs(workouts: WorkoutLog[]) {
  await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(workouts));
}

export async function saveDietLogs(dietLogs: DietLog[]) {
  await AsyncStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(dietLogs));
}
