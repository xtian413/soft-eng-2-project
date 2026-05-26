import 'react-native-gesture-handler';
import { useEffect } from 'react';
import AppNavigator from '@/navigation/AppNavigator';
import { initializeGemmaOnStartup } from '@/ai/gemmaInit';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  useEffect(() => {
    // Initialize Gemma model on app startup
    initializeGemmaOnStartup().catch(error => {
      console.error('App startup error:', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
