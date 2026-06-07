import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import {
  buildWorkoutInsightPrompt,
  type DietLog,
  type WorkoutLog,
} from './prompts';
import { scanModelOutput } from './safety/safetyClassifier';

const WORKOUT_STORAGE_KEY = 'gemi:workouts';
const DIET_STORAGE_KEY = 'gemi:dietLogs';

const DEFAULT_CONTEXT_TOKENS = 1024;
const DEFAULT_THREADS = 4;
const DEFAULT_BATCH = 32;
const DEFAULT_INSIGHT_MAX_TOKENS = 96;
const DEFAULT_FITNESS_INSIGHT_MAX_TOKENS = 150;
const DEFAULT_FITNESS_INSIGHT_TIMEOUT_MS = 90_000;
const DEFAULT_INSIGHT_CHAT_MAX_TOKENS = 128;
const DEFAULT_INSIGHT_CHAT_TIMEOUT_MS = 90_000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_TOP_K = 40;
const DEFAULT_REPEAT_PENALTY = 1.05;
const LFM_BUSY_MESSAGE = 'AI is currently busy. Please try again in a moment.';

let activeGenerationPromise: Promise<string> | null = null;

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
  cancelGeneration: () => Promise<string>;
  closeModel: () => Promise<string>;
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

function cleanLfmResponse(response: string) {
  const strippedResponse = stripChatSpecialTokens(response);

  const sanitizedFormat = sanitizeCoachResponse(strippedResponse);
  return scanModelOutput(sanitizedFormat).sanitized;
}

function cleanStructuredLfmResponse(response: string) {
  const strippedResponse = stripChatSpecialTokens(response);
  return scanModelOutput(strippedResponse).sanitized.trim();
}

function stripChatSpecialTokens(response: string) {
  let text = response.replace(/\r\n/g, '\n').trim();
  const assistantMarker = '<|im_start|>assistant';
  const assistantMarkerIndex = text.lastIndexOf(assistantMarker);

  if (assistantMarkerIndex >= 0) {
    text = text.slice(assistantMarkerIndex + assistantMarker.length).trim();
  }

  const endMarkerIndex = text.indexOf('<|im_end|>');
  if (endMarkerIndex >= 0) {
    text = text.slice(0, endMarkerIndex).trim();
  }

  return text
    .replace(/<\|im_start\|>\s*(system|user|assistant)?/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/^assistant\s*/i, '')
    .trim();
}

export function sanitizeCoachResponse(response: string) {
  return response
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*[-*]+\s*/g, '')
        .replace(/^\s*\d+[.)]\s*/g, '')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/_{2,}/g, '')
        .replace(/\s+-\s+/g, ': ')
        .trim(),
    )
    .filter((line) => {
      if (!line) return false;
      if (/^[),.;:-]+$/.test(line)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
  const response = await getLfmModule().generateResponse(
    prompt,
    DEFAULT_INSIGHT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    DEFAULT_TOP_K,
    DEFAULT_REPEAT_PENALTY
  );
  return cleanLfmResponse(response);
}

async function generateResponseWithTimeout(
  prompt: string,
  maxTokens: number,
  temperature: number,
  topP: number,
  topK: number,
  repeatPenalty: number,
  timeoutMs: number,
) {
  if (activeGenerationPromise) {
    throw new Error(LFM_BUSY_MESSAGE);
  }

  const module = getLfmModule();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const startedAt = Date.now();
  const generationLock = Promise.resolve('');
  activeGenerationPromise = generationLock;

  try {
    const generationPromise = module.generateResponse(
      prompt,
      maxTokens,
      temperature,
      topP,
      topK,
      repeatPenalty,
    );

    const timeoutPromise = new Promise<string>((_, reject) => {
      timeoutId = setTimeout(() => {
        module.cancelGeneration().catch((error) => {
          console.warn('[Gemi] Failed to cancel timed-out generation:', error);
        });
        reject(new Error(`On-device generation exceeded ${Math.round(timeoutMs / 1000)} seconds.`));
      }, timeoutMs);
    });

    return await Promise.race([generationPromise, timeoutPromise]);
  } finally {
    if (activeGenerationPromise === generationLock) {
      activeGenerationPromise = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    console.log('[Gemi] On-device generation elapsed ms:', Date.now() - startedAt);
  }
}

export async function generateFitnessInsightResponse(prompt: string) {
  console.log('[Gemi] Fitness insight prompt chars:', prompt.length);
  const response = await generateResponseWithTimeout(
    prompt,
    DEFAULT_FITNESS_INSIGHT_MAX_TOKENS,
    0.4,
    0.85,
    DEFAULT_TOP_K,
    DEFAULT_REPEAT_PENALTY,
    DEFAULT_FITNESS_INSIGHT_TIMEOUT_MS,
  );
  return cleanStructuredLfmResponse(response);
}

export async function generateInsightChatResponse(prompt: string) {
  console.log('[Gemi] Insight chat prompt chars:', prompt.length);
  const response = await generateResponseWithTimeout(
    prompt,
    DEFAULT_INSIGHT_CHAT_MAX_TOKENS,
    0.45,
    0.85,
    DEFAULT_TOP_K,
    DEFAULT_REPEAT_PENALTY,
    DEFAULT_INSIGHT_CHAT_TIMEOUT_MS,
  );
  return cleanLfmResponse(response);
}

export async function cancelLfmGeneration() {
  return getLfmModule().cancelGeneration();
}

export async function saveWorkoutLogs(workouts: WorkoutLog[]) {
  await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(workouts));
}

export async function saveDietLogs(dietLogs: DietLog[]) {
  await AsyncStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(dietLogs));
}
