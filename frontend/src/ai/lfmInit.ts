import { Platform } from 'react-native';
import { getLfmModule, initLfmModel } from './lfmService';

const LFM_MODEL_NAME = 'lfm2.5-1.2b-instruct-q4_k_m.gguf';

/**
 * Get the path to the LFM model file.
 * For Android, the model is bundled in APK assets at android/app/src/main/assets/models/.
 * We copy it to the internal files directory because llama.cpp needs an absolute file path.
 */
async function getLfmModelPath(): Promise<string> {
  if (Platform.OS === 'android') {
    const module = getLfmModule();
    console.log('📦 Copying LFM model from assets to physical storage via native code...');
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
  try {
    console.log('🤖 Initializing LFM model...');
    const modelPath = await getLfmModelPath();
    await initLfmModel(modelPath);
    console.log('✓ LFM model initialized successfully');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ Failed to initialize LFM model: ${message}`);
    return false;
  }
}
