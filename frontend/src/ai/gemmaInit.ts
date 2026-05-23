import { NativeModules, Platform } from 'react-native';
import { initGemmaModel } from './gemmaService';

const GEMMA_MODEL_NAME = 'gemma-4-E2B-it.litertlm';

/**
 * Get the path to the Gemma model file
 * For Android, the model is bundled in APK assets at android/app/src/main/assets/models/
 * At runtime, it's accessible via a fixed app-specific path
 */
async function getGemmaModelPath(): Promise<string> {
  if (Platform.OS === 'android') {
    // The model is bundled in the APK as an asset
    // MediaPipe LlmInference can load directly from asset paths
    // Standard Android asset path format
    const assetPath = `file:///android_asset/models/${GEMMA_MODEL_NAME}`;
    console.log(`📍 Gemma model path: ${assetPath}`);
    return assetPath;
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

