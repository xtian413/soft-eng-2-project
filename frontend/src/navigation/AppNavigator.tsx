import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthNavigator from '@/navigation/AuthNavigator';
import TabNavigator from '@/navigation/TabNavigator';
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import { useAuthStore } from '@/store/authStore';
import { TutorialProvider } from '@/context/TutorialContext';

const OnboardingStack = createStackNavigator();

/** Switches between auth and app stacks based on session state. */
export default function AppNavigator() {
  const { session, isLoading, initializeAuth } = useAuthStore();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const onboardingFlag = await AsyncStorage.getItem('hasSeenOnboarding');
        const pendingAutoTutorialUserId = await AsyncStorage.getItem('gemi:pendingAutoTutorialUserId');
        const flag = onboardingFlag === 'true';
        console.log('[Onboarding] Flag from AsyncStorage:', onboardingFlag, '→ hasSeenOnboarding:', flag);
        console.log('[Tutorial][AppNavigator] Navigation gate check', {
          authenticatedUserId: session?.user?.id ?? null,
          legacyOnboardingKey: 'hasSeenOnboarding',
          legacyOnboardingValue: onboardingFlag,
          hasSeenLegacyOnboarding: flag,
          pendingAutoTutorialKey: 'gemi:pendingAutoTutorialUserId',
          pendingAutoTutorialValue: pendingAutoTutorialUserId,
          willRenderDashboard: flag,
          reason: flag
            ? 'Legacy onboarding flag allows DashboardScreen to mount.'
            : 'Legacy onboarding flag is missing/false, so OnboardingScreen mounts before DashboardScreen.',
        });
        setHasSeenOnboarding(flag);
      } catch (error) {
        console.error('[Onboarding] Error checking onboarding flag:', error);
        setHasSeenOnboarding(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    if (session) {
      console.log('[Onboarding] Session detected, checking onboarding flag...');
      checkOnboarding();
    } else {
      console.log('[Onboarding] No session, skipping onboarding check');
      setIsCheckingOnboarding(false);
    }
  }, [session]);

  if (isLoading || isCheckingOnboarding) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  console.log('[Onboarding] Render state - session:', !!session, 'hasSeenOnboarding:', hasSeenOnboarding);

  return (
    <TutorialProvider>
      <NavigationContainer>
        {!session ? (
          <AuthNavigator />
        ) : !hasSeenOnboarding ? (
          <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
            <OnboardingStack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              initialParams={{ onOnboardingComplete: () => setHasSeenOnboarding(true) }}
            />
          </OnboardingStack.Navigator>
        ) : (
          <TabNavigator />
        )}
      </NavigationContainer>
    </TutorialProvider>
  );
}

