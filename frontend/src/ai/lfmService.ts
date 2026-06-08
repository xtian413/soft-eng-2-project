import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildWorkoutInsightPrompt,
  type DietLog,
  type WorkoutLog,
} from './prompts';
import { scanModelOutput } from './safety/safetyClassifier';

const WORKOUT_STORAGE_KEY = 'gemi:workouts';
const DIET_STORAGE_KEY = 'gemi:dietLogs';

// All inference is handled by the laptop-hosted Ollama server.
// The Android emulator reaches the host machine via the special 10.0.2.2 gateway.
const DEFAULT_INSIGHT_MAX_TOKENS = 96;
const DEFAULT_FITNESS_INSIGHT_MAX_TOKENS = 150;
const DEFAULT_FITNESS_INSIGHT_TIMEOUT_MS = 90_000;
const DEFAULT_INSIGHT_CHAT_MAX_TOKENS = 128;
const DEFAULT_INSIGHT_CHAT_TIMEOUT_MS = 90_000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_TOP_K = 40;
const DEFAULT_REPEAT_PENALTY = 1.05;

const HOST_LLM_API = 'http://10.0.2.2:11434/api/generate';

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



export async function generateWorkoutInsight(userName: string) {
  const [workouts, dietLogs] = await Promise.all([
    loadJsonArray<WorkoutLog>(WORKOUT_STORAGE_KEY),
    loadJsonArray<DietLog>(DIET_STORAGE_KEY),
  ]);

  const prompt = buildWorkoutInsightPrompt(userName, workouts, dietLogs);
  const response = await generateResponseWithTimeout(
    prompt,
    DEFAULT_INSIGHT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    DEFAULT_TOP_K,
    DEFAULT_REPEAT_PENALTY,
    90_000
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
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[Gemi] Routing inference to host bridge: ${HOST_LLM_API}`);
    const response = await fetch(HOST_LLM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'qwen2.5:3b-instruct',
        prompt,
        stream: false,
        options: {
          temperature,
          top_p: topP,
          top_k: topK,
          repeat_penalty: repeatPenalty,
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Host LLM API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Gemi] Host bridge response in ${Date.now() - startedAt} ms`);
    return (data.response || data.content || '') as string;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Gemi] Host bridge request failed: ${msg}`);
    throw new Error(`Host LLM bridge failed: ${msg}`);
  } finally {
    clearTimeout(timeoutId);
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

/** No-op: host bridge requests are cancelled via AbortController timeout. */
export async function cancelLfmGeneration(): Promise<void> {
  // nothing to cancel — the fetch AbortController handles timeouts
}

export async function saveWorkoutLogs(workouts: WorkoutLog[]) {
  await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(workouts));
}

export async function saveDietLogs(dietLogs: DietLog[]) {
  await AsyncStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(dietLogs));
}
