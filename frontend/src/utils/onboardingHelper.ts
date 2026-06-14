import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_FLAG = 'hasSeenOnboarding';

/**
 * Check if the user has already seen the onboarding tutorial.
 */
export async function hasUserSeenOnboarding(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem(ONBOARDING_FLAG);
    return flag === 'true';
  } catch (error) {
    console.error('Error checking onboarding flag:', error);
    return false;
  }
}

/**
 * Mark the onboarding as seen.
 */
export async function markOnboardingAsSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_FLAG, 'true');
  } catch (error) {
    console.error('Error marking onboarding as seen:', error);
  }
}

/**
 * Reset the onboarding flag (useful for testing or if user wants to see tutorial again).
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_FLAG);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
}
