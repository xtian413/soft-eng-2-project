import { Platform } from 'react-native';
import { getLfmModule, initLfmModel } from './lfmService';

const LFM_MODEL_NAME = 'qwen2.5-3b-instruct-q4_k_m.gguf';

let startupInitPromise: Promise<boolean> | null = null;
let startupInitialized = false;

/**
 * Get the path to the LFM model file.
 * For Android, the model is bundled in APK assets at android/app/src/main/assets/models/.
 * We copy it to the internal files directory because llama.cpp needs an absolute file path.
 */
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

/**
 * Initialize LFM model on app startup.
 */
export async function initializeLfmOnStartup() {
  if (startupInitialized) {
    return true;
  }

  if (startupInitPromise) {
    return startupInitPromise;
  }

  startupInitPromise = initializeLfm();
  const initialized = await startupInitPromise;
  if (!initialized) {
    startupInitPromise = null;
  }
  return initialized;
}

async function initializeLfm() {
  try {
    console.log('🤖 Initializing on-device model...');
    const modelPath = await getLfmModelPath();
    await initLfmModel(modelPath);
    console.log('✓ On-device model initialized successfully');
    startupInitialized = true;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ Failed to initialize on-device model: ${message}`);
    return false;
  }
}
