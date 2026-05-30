import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import {
  buildWorkoutInsightPrompt,
  type DietLog,
  type WorkoutLog,
} from './prompts';

const WORKOUT_STORAGE_KEY = 'gemi:workouts';
const DIET_STORAGE_KEY = 'gemi:dietLogs';

const DEFAULT_CONTEXT_TOKENS = 1536;
const DEFAULT_THREADS = 4;
const DEFAULT_BATCH = 64;
const DEFAULT_MAX_TOKENS = 256;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_TOP_K = 40;
const DEFAULT_REPEAT_PENALTY = 1.05;

type LfmNativeModule = {
  initModel: (modelPath: string, nCtx: number, nThreads: number, nBatch: number) => Promise<void>;
  generateResponse: (
    prompt: string,
    maxTokens: number,
    temperature: number,
    topP: number,
    topK: number,
    repeatPenalty: number
  ) => Promise<string>;
  copyAsset: (assetName: string) => Promise<string>;
  closeModel: () => Promise<void>;
};

export function getLfmModule(): LfmNativeModule {
  const module = NativeModules.LfmModule as LfmNativeModule | undefined;
  if (!module) {
    throw new Error('LfmModule is not registered. Did you run prebuild and add LfmPackage?');
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

export async function initLfmModel(
  modelPath: string,
  options?: { nCtx?: number; nThreads?: number; nBatch?: number }
) {
  const module = getLfmModule();
  const nCtx = options?.nCtx ?? DEFAULT_CONTEXT_TOKENS;
  const nThreads = options?.nThreads ?? DEFAULT_THREADS;
  const nBatch = options?.nBatch ?? DEFAULT_BATCH;
  await module.initModel(modelPath, nCtx, nThreads, nBatch);
}

export async function generateWorkoutInsight(userName: string) {
  const [workouts, dietLogs] = await Promise.all([
    loadJsonArray<WorkoutLog>(WORKOUT_STORAGE_KEY),
    loadJsonArray<DietLog>(DIET_STORAGE_KEY),
  ]);

  const prompt = buildWorkoutInsightPrompt(userName, workouts, dietLogs);
  return getLfmModule().generateResponse(
    prompt,
    DEFAULT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    DEFAULT_TOP_K,
    DEFAULT_REPEAT_PENALTY
  );
}

export async function generateFreeChatResponse(prompt: string) {
  return getLfmModule().generateResponse(
    prompt,
    DEFAULT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    DEFAULT_TOP_K,
    DEFAULT_REPEAT_PENALTY
  );
}

export async function saveWorkoutLogs(workouts: WorkoutLog[]) {
  await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(workouts));
}

export async function saveDietLogs(dietLogs: DietLog[]) {
  await AsyncStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(dietLogs));
}
