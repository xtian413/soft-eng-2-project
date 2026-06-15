import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import {
  Home,
  Apple,
  Dumbbell,
  Sparkles,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log('[Onboarding] MODULE LOADING');

const { width: screenWidth } = Dimensions.get('window');
console.log('[Onboarding] screenWidth:', screenWidth);

/**
 * Custom Error Boundary - catches and displays errors from FlatList
 */
class OnboardingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('[ErrorBoundary] getDerivedStateFromError:', error.message);
    console.error('[ErrorBoundary] Error stack:', error.stack);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Component caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ba1a1a', marginBottom: 12, textAlign: 'center' }}>
            FlatList Error
          </Text>
          <Text style={{ fontSize: 15, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: 12 }}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
          <View style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginTop: 12 }}>
            <Text style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
              {this.state.error?.stack}
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  iconType: 'sparkles' | 'home' | 'apple' | 'dumbbell' | 'trending-up';
  backgroundColor: string;
}

const getIconForSlide = (iconType: OnboardingSlide['iconType']) => {
  switch (iconType) {
    case 'sparkles':
      return <Sparkles size={80} color={Colors.primary} strokeWidth={1.5} />;
    case 'home':
      return <Home size={80} color={Colors.primary} strokeWidth={1.5} />;
    case 'apple':
      return <Apple size={80} color={Colors.carbsAccent} strokeWidth={1.5} />;
    case 'dumbbell':
      return <Dumbbell size={80} color={Colors.proteinAccent} strokeWidth={1.5} />;
    case 'trending-up':
      return <TrendingUp size={80} color={Colors.secondaryContainer} strokeWidth={1.5} />;
    default:
      return <Sparkles size={80} color={Colors.primary} strokeWidth={1.5} />;
  }
};

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to AI Insight',
    description: 'Your smart companion for tracking nutrition, workouts, and progress.',
    iconType: 'sparkles',
    backgroundColor: Colors.background,
  },
  {
    id: '2',
    title: 'Dashboard',
    description: 'Monitor your daily progress and goals at a glance.',
    iconType: 'home',
    backgroundColor: Colors.background,
  },
  {
    id: '3',
    title: 'Food Tracking',
    description: 'Log meals and keep track of your nutrition effortlessly.',
    iconType: 'apple',
    backgroundColor: Colors.background,
  },
  {
    id: '4',
    title: 'Workouts',
    description: 'Browse exercises and monitor your training sessions.',
    iconType: 'dumbbell',
    backgroundColor: Colors.background,
  },
  {
    id: '5',
    title: 'AI Insights',
    description: 'Receive personalized recommendations based on your habits.',
    iconType: 'sparkles',
    backgroundColor: Colors.background,
  },
  {
    id: '6',
    title: 'Profile & Progress',
    description: 'Review achievements and track your improvement over time.',
    iconType: 'trending-up',
    backgroundColor: Colors.background,
  },
];

type OnboardingScreenRouteProp = RouteProp<
  { Onboarding: { onOnboardingComplete?: () => void } },
  'Onboarding'
>;

export default function OnboardingScreen() {
  console.log('[Onboarding] *** COMPONENT RENDER START ***');

  try {
    console.log('[Onboarding] Calling useRoute');
    const route = useRoute<OnboardingScreenRouteProp>();
    console.log('[Onboarding] useRoute complete');

    const handleGetStarted = async () => {
      console.log('[Onboarding] Get Started clicked');
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      route.params?.onOnboardingComplete?.();
    };

    console.log('[Onboarding] About to return JSX');

    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.slideTitle}>Onboarding Test</Text>
          <Text style={styles.slideDescription}>
            If you see this, the component is rendering correctly.
          </Text>
        </View>

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
  } catch (error) {
    console.error('[Onboarding] *** FATAL ERROR ***', error);
    if (error instanceof Error) {
      console.error('[Onboarding] Message:', error.message);
      console.error('[Onboarding] Stack:', error.stack);
    }

    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={[styles.slideTitle, { color: '#ba1a1a' }]}>
          Error
        </Text>
        <Text style={styles.slideDescription}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl + spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    borderRadius: radius.xl,
    backgroundColor: Colors.surfaceContainer,
    opacity: 0.6,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: layout.screenMaxWidth,
    paddingHorizontal: spacing.lg,
  },
  slideTitle: {
    fontSize: typography.xxl,
    fontWeight: fontWeight.bold,
    color: Colors.onBackground,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: typography.base,
    fontWeight: fontWeight.regular,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  paginationDot: {
    height: 8,
    borderRadius: radius.full,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  button: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  skipButton: {
    backgroundColor: Colors.surfaceContainer,
  },
  skipButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeight.medium,
    color: Colors.onSurface,
  },
  backButton: {
    backgroundColor: Colors.surfaceContainer,
    flex: 0.5,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    flex: 1.5,
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeight.semiBold,
    color: Colors.onPrimary,
  },
});
