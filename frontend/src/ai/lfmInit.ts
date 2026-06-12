import { NativeModules, Platform } from 'react-native';

const LFM_MODEL_NAME = 'qwen2.5-3b-instruct-q4_k_m.gguf';
const DEFAULT_CONTEXT_TOKENS = 1024;
const DEFAULT_THREADS = 4;
const DEFAULT_BATCH = 32;

export type LfmNativeModule = {
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

async function getLfmModelPath(): Promise<string> {
  if (Platform.OS === 'android') {
    const module = getLfmModule();
    console.log('📦 Copying on-device model from assets to physical storage via native code...');
    const destPath = await module.copyAsset(`models/${LFM_MODEL_NAME}`);
    console.log(`✅ Model available at physical path: ${destPath}`);
    return destPath;
  }

  throw new Error(`LFM model loading not implemented for ${Platform.OS}`);
}

let modelInitialized = false;
let modelInitPromise: Promise<void> | null = null;

export async function ensureModelInitialized(): Promise<void> {
  if (modelInitialized) return;
  if (modelInitPromise) return modelInitPromise;

  modelInitPromise = (async () => {
    try {
      console.log('🤖 Lazy-initializing on-device model...');
      const modelPath = await getLfmModelPath();
      await initLfmModel(modelPath);
      modelInitialized = true;
      console.log('✓ On-device model initialized successfully');
    } catch (error) {
      console.error(`✗ Failed to initialize on-device model: ${error}`);
      modelInitPromise = null;
      throw error;
    }
  })();

  return modelInitPromise;
}

/**
 * Fast startup check to verify if the model asset has been copied,
 * but does not load it into memory (RAM).
 */
export async function initializeLfmOnStartup(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      console.log('[Gemi] Checking/verifying local model file on startup...');
      await getLfmModelPath();
    }
    return true;
  } catch (error) {
    console.warn('[Gemi] initializeLfmOnStartup: model file verification skipped/failed:', error);
    return true;
  }
}
