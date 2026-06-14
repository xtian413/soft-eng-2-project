import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useTutorial } from '@/context/TutorialContext';
import { TUTORIAL_STEPS, getTutorialStep, getTotalSteps, type TabType } from './tutorialSteps';

const transparent = 'rgba(255, 255, 255, 0)';

interface InteractiveTutorialProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabButtonRefs?: Record<TabType, React.RefObject<View | null>>;
}

export function InteractiveTutorial({
  activeTab,
  onTabChange,
  tabButtonRefs,
}: InteractiveTutorialProps) {
  const { width, height } = useWindowDimensions();
  const {
    isTutorialActive,
    currentStep,
    endTutorial,
    nextStep,
    prevStep,
    skipTutorial,
  } = useTutorial();
  
  // Log tutorial state
  console.log('[InteractiveTutorial] Rendering with state:', {
    isTutorialActive,
    currentStep,
  });
  
  const [highlightPosition, setHighlightPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [tooltipDimensions, setTooltipDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const tooltipRef = useRef<View>(null);

  const step = getTutorialStep(currentStep);
  const totalSteps = getTotalSteps();
  const isLastStep = currentStep === totalSteps - 1;

  // Auto-navigate to the tab for this step
  useEffect(() => {
    if (!isTutorialActive || !step) return;

    if (step.navigateToTab && step.navigateToTab !== activeTab) {
      console.log('[Tutorial] Auto-navigating to tab:', step.navigateToTab);
      onTabChange(step.navigateToTab);
    }
  }, [isTutorialActive, step, activeTab, onTabChange]);

  // Calculate highlight position for the tab button using measureInWindow
  useEffect(() => {
    if (!isTutorialActive || !step || !step.tabToHighlight || !tabButtonRefs) return;

    const tabRef = tabButtonRefs[step.tabToHighlight];
    if (tabRef?.current) {
      (tabRef.current as any).measureInWindow((px: number, py: number, w: number, h: number) => {
        console.log(
          `[Tutorial] Tab '${step.tabToHighlight}' position:`,
          { x: px, y: py, width: w, height: h }
        );
        setHighlightPosition({ x: px, y: py, width: w, height: h });
      });
    }
  }, [isTutorialActive, step, tabButtonRefs, activeTab]);

  // Calculate tooltip position dynamically based on available space
  useEffect(() => {
    if (!highlightPosition || !tooltipDimensions) return;

    const MARGIN = 16;
    const tooltipWidth = Math.min(width - 32, 360);
    const targetX = highlightPosition.x;
    const targetY = highlightPosition.y;
    const targetHeight = highlightPosition.height;
    const tooltipHeight = tooltipDimensions.height;

    // Determine if there's enough space below the target
    const spaceBelow = height - (targetY + targetHeight + MARGIN);
    const showAbove = spaceBelow < tooltipHeight + MARGIN;

    const tooltipYPosition = showAbove
      ? Math.max(MARGIN, targetY - tooltipHeight - MARGIN)
      : targetY + targetHeight + MARGIN;

    // Center horizontally, but keep within screen bounds with 16px margin
    const tooltipXPosition = Math.min(
      Math.max(MARGIN, targetX - (tooltipWidth - highlightPosition.width) / 2),
      width - tooltipWidth - MARGIN
    );

    setTooltipPosition({
      top: tooltipYPosition,
      left: tooltipXPosition,
    });
  }, [highlightPosition, tooltipDimensions, width, height]);

  if (!isTutorialActive || !step) {
    if (!isTutorialActive) {
      console.log('[InteractiveTutorial] ✓ Tutorial NOT active - not rendering');
    }
    if (!step) {
      console.log('[InteractiveTutorial] ✓ No current step - not rendering');
    }
    return null;
  }

  console.log('[InteractiveTutorial] ✓ Tutorial IS active - rendering component');

  const hasHighlight = step.tabToHighlight !== null && highlightPosition;
  const spotlightRadius = Math.max(
    highlightPosition?.width || 0,
    highlightPosition?.height || 0
  ) / 2 + 12;

  const tooltipWidth = Math.min(width - 32, 360);

  return (
    <SafeAreaView style={styles.tutorialContainer} pointerEvents="box-none">
      {/* Semi-transparent dark overlay */}
      <View style={styles.overlay} />

      {/* Spotlight cutout for highlighted element */}
      {hasHighlight && (
        <View
          style={[
            styles.spotlight,
            {
              left: (highlightPosition?.x ?? 0) + (highlightPosition?.width ?? 0) / 2 - spotlightRadius,
              top: (highlightPosition?.y ?? 0) + (highlightPosition?.height ?? 0) / 2 - spotlightRadius,
              width: spotlightRadius * 2,
              height: spotlightRadius * 2,
              borderRadius: spotlightRadius,
            },
          ]}
        />
      )}

      {/* Tooltip container - positioned dynamically */}
      <View
        ref={tooltipRef}
        style={[
          styles.tooltipContainer,
          {
            width: tooltipWidth,
            top: hasHighlight ? tooltipPosition.top : height / 2 - 100,
            left: hasHighlight ? tooltipPosition.left : (width - tooltipWidth) / 2,
          },
        ]}
        onLayout={(event) => {
          const { height: tooltipH } = event.nativeEvent.layout;
          setTooltipDimensions({ width: tooltipWidth, height: tooltipH });
        }}
      >
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{step.title}</Text>
          <Text style={styles.tooltipDescription}>{step.description}</Text>
          <Text style={styles.tooltipText}>{step.tooltipText}</Text>

          {/* Navigation buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={prevStep}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color={Colors.onSurface} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={skipTutorial}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            {!isLastStep && (
              <TouchableOpacity
                style={[styles.button, styles.nextButton]}
                onPress={nextStep}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <ChevronRight size={20} color={Colors.onPrimary} />
              </TouchableOpacity>
            )}

            {isLastStep && (
              <TouchableOpacity
                style={[styles.button, styles.finishButton]}
                onPress={endTutorial}
                activeOpacity={0.85}
              >
                <Text style={styles.finishButtonText}>Finish</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Step counter */}
          <Text style={styles.stepCounter}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tutorialContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    zIndex: 10000,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: 10001,
  },
  tooltip: {
    backgroundColor: Colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipTitle: {
    fontSize: typography.xl,
    fontWeight: fontWeight.bold,
    color: Colors.onBackground,
    marginBottom: spacing.sm,
  },
  tooltipDescription: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.primary,
    marginBottom: spacing.md,
  },
  tooltipText: {
    fontSize: typography.base,
    fontWeight: fontWeight.regular,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    minHeight: 44,
  },
  backButton: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outline,
  },
  backButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeight.medium,
    color: Colors.onSurface,
  },
  skipButton: {
    backgroundColor: transparent,
    borderWidth: 1,
    borderColor: Colors.outline,
    flex: 1,
  },
  skipButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    flex: 1,
  },
  nextButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeight.medium,
    color: Colors.onPrimary,
  },
  finishButton: {
    backgroundColor: Colors.primary,
    flex: 1,
  },
  finishButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeight.medium,
    color: Colors.onPrimary,
  },
  stepCounter: {
    fontSize: typography.sm,
    fontWeight: fontWeight.regular,
    color: Colors.outlineVariant,
    textAlign: 'center',
  },
});
