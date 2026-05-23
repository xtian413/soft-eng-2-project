import { Platform } from 'react-native';
import { initGemmaModel, getGemmaModule } from './gemmaService';

const GEMMA_MODEL_NAME = 'gemma-4-E2B-it.litertlm';

/**
 * Get the path to the Gemma model file
 * For Android, the model is bundled in APK assets at android/app/src/main/assets/models/
 * We copy it to the internal files directory because the C++ engine needs an absolute physical file path
 * and cannot directly mmap from a compressed file:///android_asset/ URI.
 * We use a native method to handle the fast and robust file copy inside Android.
 */
async function getGemmaModelPath(): Promise<string> {
  if (Platform.OS === 'android') {
    const module = getGemmaModule();
    console.log(`📦 Copying Gemma model from assets to physical storage via native code...`);
    const destPath = await module.copyAsset(`models/${GEMMA_MODEL_NAME}`);
    console.log(`✅ Model available at physical path: ${destPath}`);
    return destPath;
  }

  throw new Error(`Gemma model loading not implemented for ${Platform.OS}`);
}

/**
 * Initialize Gemma model on app startup
 * This is called automatically from App.tsx useEffect
 */
export async function initializeGemmaOnStartup() {
  try {
    console.log('🤖 Initializing Gemma model...');
    const modelPath = await getGemmaModelPath();
    await initGemmaModel(modelPath);
    console.log('✓ Gemma model initialized successfully');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ Failed to initialize Gemma model: ${message}`);
    return false;
  }
}

