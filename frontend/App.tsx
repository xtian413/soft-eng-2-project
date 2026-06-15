import 'react-native-gesture-handler';
import { useEffect } from 'react';
import AppNavigator from '@/navigation/AppNavigator';
import { initializeLfmOnStartup } from '@/ai/lfmInit';
import { migrateWeightUnitPref } from '@/local/migrateWeightUnitPref';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  useEffect(() => {
    // Initialize LFM model on app startup
    initializeLfmOnStartup().catch((error: unknown) => {
      console.error('App startup error:', error);
    });

    // Migrate legacy weight unit preference to the shared store key
    void migrateWeightUnitPref();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
