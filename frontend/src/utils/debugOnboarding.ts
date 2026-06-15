/**
 * DEBUG SCRIPT - Reset onboarding flag
 * 
 * Run this in the Expo console or in a useEffect to reset the onboarding:
 * 
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * await AsyncStorage.removeItem('hasSeenOnboarding');
 * console.log('Onboarding flag reset!');
 * 
 * Then reload the app to see the onboarding.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function debugResetOnboarding() {
  try {
    await AsyncStorage.removeItem('hasSeenOnboarding');
    console.log('[DEBUG] ✅ Onboarding flag reset! Reload app to see onboarding.');
  } catch (error) {
    console.error('[DEBUG] ❌ Error resetting onboarding:', error);
  }
}

export async function debugCheckOnboarding() {
  try {
    const flag = await AsyncStorage.getItem('hasSeenOnboarding');
    console.log('[DEBUG] Current onboarding flag:', flag);
  } catch (error) {
    console.error('[DEBUG] Error checking onboarding:', error);
  }
}
