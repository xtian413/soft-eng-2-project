import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  buildWorkoutInsightPrompt,
  type DietLog,
  type WorkoutLog,
} from './prompts';
import { scanModelOutput } from './safety/safetyClassifier';
import { useAuthStore } from '../store/authStore';
import { getLfmModule, ensureModelInitialized } from './lfmInit';

const WORKOUT_STORAGE_KEY = 'gemi:workouts';
const DIET_STORAGE_KEY = 'gemi:dietLogs';

const DEFAULT_INSIGHT_MAX_TOKENS = 96;
const DEFAULT_FITNESS_INSIGHT_MAX_TOKENS = 300;
const DEFAULT_FITNESS_INSIGHT_TIMEOUT_MS = 180_000;
const DEFAULT_INSIGHT_CHAT_MAX_TOKENS = 128;
const DEFAULT_INSIGHT_CHAT_TIMEOUT_MS = 180_000;
const DEFAULT_TEMPERATURE = 0.7;

const DEFAULT_TOP_P = 0.9;
const DEFAULT_TOP_K = 40;
const DEFAULT_REPEAT_PENALTY = 1.05;

let activeAbortController: AbortController | null = null;

const getHostLlmUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_LLM_API_URL;
  if (envUrl) {
    return envUrl;
  }
  if (Platform.OS === 'web') {
    // Web app runs on the host laptop itself, so it can connect to local Ollama directly.
    // This bypasses ngrok's browser warning block and CORS preflight header limitations.
    return 'http://localhost:11434/api/generate';
  }
  return 'https://surfacing-imposing-scrooge.ngrok-free.dev/api/generate';
};

const getHostLlmHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const url = getHostLlmUrl();
  // Only apply ngrok bypass header if we are actually hitting an ngrok endpoint.
  if (Platform.OS !== 'web' && url.includes('ngrok-free.dev')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  return headers;
};

const HOST_LLM_API = getHostLlmUrl();
const HOST_LLM_HEADERS = getHostLlmHeaders();

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

/**
 * Lightweight reachability check to verify if the hosted server is running.
 */
async function isHostReachable(timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = HOST_LLM_API.replace('/api/generate', '');
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: HOST_LLM_HEADERS,
      signal: controller.signal,
    });
    // Ollama returns 200 or status text "Ollama is running"
    return response.ok;
  } catch (err) {
    console.log('[Gemi] Host reachability check failed:', err);
    return false;
  } finally {
    clearTimeout(id);
  }
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
  const { aiMode, setLastGenerationSource } = useAuthStore.getState();
  let routeToLocal = false;

  if (aiMode === 'local') {
    routeToLocal = true;
  } else if (aiMode === 'hosted') {
    routeToLocal = false;
  } else {
    // Mode is 'auto': check reachability of host
    const reachable = await isHostReachable(2500);
    if (!reachable) {
      console.warn('[Gemi] Host Ollama bridge is unreachable. Falling back to on-device local inference.');
      routeToLocal = true;
    }
  }

  if (routeToLocal) {
    // Ensure the model is copied and native library is initialized
    await ensureModelInitialized();

    const startedAt = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const module = getLfmModule();

    try {
      console.log('[Gemi] Routing inference to local on-device LfmModule');
      setLastGenerationSource('local');

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
          module.cancelGeneration().catch((err) => {
            console.warn('[Gemi] Failed to cancel timed-out generation:', err);
          });
          reject(new Error(`On-device generation exceeded ${Math.round(timeoutMs / 1000)} seconds.`));
        }, timeoutMs);
      });

      const response = await Promise.race([generationPromise, timeoutPromise]);
      console.log(`[Gemi] Local response completed in ${Date.now() - startedAt} ms`);
      return response;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  } else {
    // Route to hosted Ollama bridge
    const startedAt = Date.now();
    const controller = new AbortController();
    activeAbortController = controller;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(`[Gemi] Routing inference to host bridge: ${HOST_LLM_API}`);
      setLastGenerationSource('hosted');

      const response = await fetch(HOST_LLM_API, {
        method: 'POST',
        headers: HOST_LLM_HEADERS,
        signal: controller.signal,
        body: JSON.stringify({
          model: 'qwen2.5:3b-instruct',
          prompt,
          stream: false,
          keep_alive: '20m', // Keep model in memory for 20 minutes to avoid reload latency
          options: {
            temperature,
            top_p: topP,
            top_k: topK,
            repeat_penalty: repeatPenalty,
            num_predict: maxTokens,
            num_ctx: 4096, // 4K context to fit RAG evidence cards, verbose data facts, and chat history without truncation
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
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
    }
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

export async function cancelLfmGeneration(): Promise<void> {
  console.log('[Gemi] Initiating execution cancellation...');
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  try {
    const module = getLfmModule();
    await module.cancelGeneration();
  } catch (error) {
    console.warn('[Gemi] Native cancelGeneration skipped/failed:', error);
  }
}

export async function saveWorkoutLogs(workouts: WorkoutLog[]) {
  await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(workouts));
}

export async function saveDietLogs(dietLogs: DietLog[]) {
  await AsyncStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(dietLogs));
}
