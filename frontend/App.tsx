import 'react-native-gesture-handler';
import { useEffect } from 'react';
import AppNavigator from '@/navigation/AppNavigator';
import { initializeLfmOnStartup } from '@/ai/lfmInit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  useEffect(() => {
    // Initialize LFM model on app startup
    initializeLfmOnStartup().catch(error => {
      console.error('App startup error:', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
