import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, spacing } from '@/theme/typography';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingScreenRouteProp = RouteProp<
  { Onboarding: { onOnboardingComplete?: () => void } },
  'Onboarding'
>;

export default function OnboardingScreen() {
  console.log('[Onboarding] *** DEBUG VERSION - COMPONENT MOUNTING ***');
  
  const route = useRoute<OnboardingScreenRouteProp>();
  const [currentSlide, setCurrentSlide] = useState(0);

  console.log('[Onboarding] State hooks initialized');

  useEffect(() => {
    console.log('[Onboarding] useEffect: currentSlide updated to:', currentSlide);
  }, [currentSlide]);

  const handleGetStarted = useCallback(async () => {
    console.log('[Onboarding] handleGetStarted called');
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    route.params?.onOnboardingComplete?.();
  }, [route.params]);

  console.log('[Onboarding] About to render JSX');

  return (
    <View style={styles.container}>
      {/* TEST: Simple Text Component to verify basic rendering works */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.onBackground, marginBottom: 12 }}>
          Onboarding Test
        </Text>
        <Text style={{ fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 10, textAlign: 'center' }}>
          If you see this text, the basic component rendering works.{'\n\n'}The white screen issue is in FlatList or its props.
        </Text>
      </View>

      {/* Bottom Button Container */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: Colors.primary,
  },
  nextButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeight.semiBold,
    color: Colors.onPrimary,
  },
});
