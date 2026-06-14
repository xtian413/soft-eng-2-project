import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import Body from 'react-native-body-highlighter';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, spacing, radius } from '@/theme/typography';
import { getMuscleDataForExercise } from './exerciseMuscles';
import { Muscle, exerciseDbService } from '@/api/exerciseDbService';

type Side = 'front' | 'back';
type VisualSide = Side | 'both';

interface BodyMuscleMapProps {
  exerciseName?: string;
  onBodyPartClick?: (muscleId: number, muscleName: string) => void;
  isInteractive?: boolean;
  highlightMode?: 'none' | 'click' | 'exercise';
  selectedMuscleId?: number;
  primaryMuscleIds?: number[];
  secondaryMuscleIds?: number[];
}

const PRIMARY_FILL = Colors.primary;
const SECONDARY_FILL = Colors.primaryContainer;
const DEFAULT_FILL = '#e2e8f0';
const MIN_SCALE = 0.75;
const MAX_SCALE = 1.6;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const resolveVisualConfig = (muscleName: string): { parts: string[]; side: VisualSide } | null => {
  const key = normalize(muscleName);

  if (key.includes('deltoid') || key.includes('shoulder')) return { parts: ['deltoids'], side: 'front' };
  if (key.includes('chest')) return { parts: ['chest'], side: 'front' };
  if (key.includes('biceps')) return { parts: ['biceps'], side: 'front' };
  if (key === 'abs' || key.includes('abdominal')) return { parts: ['abs'], side: 'front' };
  if (key.includes('oblique')) return { parts: ['obliques'], side: 'front' };
  if (key.includes('quad')) return { parts: ['quadriceps'], side: 'front' };
  if (key.includes('hamstring')) return { parts: ['hamstring'], side: 'back' };
  if (key.includes('glute')) return { parts: ['gluteal'], side: 'back' };
  if (key.includes('adductor')) return { parts: ['adductors'], side: 'both' };
  if (key.includes('abductor')) return { parts: ['abductors'], side: 'back' };
  if (key.includes('calf')) return { parts: ['calves'], side: 'both' };
  if (key.includes('tricep')) return { parts: ['triceps'], side: 'both' };
  if (key.includes('forearm')) return { parts: ['forearm'], side: 'both' };
  if (key.includes('trap')) return { parts: ['trapezius'], side: 'both' };
  if (key.includes('upperback')) return { parts: ['upper-back'], side: 'back' };
  if (key.includes('lowerback')) return { parts: ['lower-back'], side: 'back' };
  if (key.includes('latissimus') || key.includes('lats') || key.includes('lat')) {
    return { parts: ['upper-back'], side: 'back' };
  }
  if (key.includes('back')) return { parts: ['upper-back', 'lower-back'], side: 'back' };
  if (key.includes('neck')) return { parts: ['neck'], side: 'both' };
  if (key.includes('hand')) return { parts: ['hands'], side: 'both' };
  if (key.includes('foot')) return { parts: ['feet'], side: 'both' };
  if (key.includes('ankle')) return { parts: ['ankles'], side: 'both' };
  if (key.includes('tibialis') || key.includes('shin')) return { parts: ['tibialis'], side: 'front' };

  return null;
};

const resolveClickedMuscle = (slug: string, muscles: Muscle[]) => {
  const normalizedSlug = normalize(slug);
  const candidateNames: Record<string, string[]> = {
    chest: ['Chest'],
    biceps: ['Biceps'],
    triceps: ['Triceps'],
    forearm: ['Forearm', 'Forearms', 'Brachialis'],
    deltoids: ['Deltoids', 'Shoulders'],
    abs: ['Abs', 'Abdominals', 'Waist'],
    obliques: ['Obliques'],
    quadriceps: ['Quadriceps', 'Quads'],
    hamstring: ['Hamstrings', 'Hamstring'],
    gluteal: ['Glutes', 'Gluteus maximus', 'Gluteus Maximus'],
    calves: ['Calves'],
    adductors: ['Adductors'],
    abductors: ['Abductors'],
    trapezius: ['Trapezius', 'Traps'],
    'upper-back': ['Latissimus dorsi', 'Upper Back', 'Back'],
    'lower-back': ['Lower Back', 'Back'],
    back: ['Latissimus dorsi', 'Back', 'Upper Back', 'Lower Back'],
    neck: ['Neck'],
    hands: ['Hands'],
    feet: ['Feet'],
    ankles: ['Ankles'],
    tibialis: ['Tibialis'],
  };

  const names = candidateNames[normalizedSlug] || [slug];

  for (const candidate of names) {
    const normalizedCandidate = normalize(candidate);
    const muscle = muscles.find((item) => {
      const normalizedName = normalize(item.name_en || item.name);
      return normalizedName === normalizedCandidate || normalizedName.includes(normalizedCandidate);
    });
    if (muscle) return muscle;
  }

  return (
    muscles.find((item) => {
      const visual = resolveVisualConfig(item.name_en || item.name);
      return visual?.parts.includes(slug);
    }) || null
  );
};

const buildHighlights = (
  muscleIds: number[],
  muscles: Muscle[],
  fill: string,
): Array<{ slug: string; styles: { fill: string } }> => {
  const highlights: Array<{ slug: string; styles: { fill: string } }> = [];

  muscleIds.forEach((muscleId) => {
    const muscle = muscles.find((item) => item.id === muscleId);
    if (!muscle) return;

    const visual = resolveVisualConfig(muscle.name_en || muscle.name);
    if (!visual) return;

    visual.parts.forEach((slug) => {
      if (!highlights.some((entry) => entry.slug === slug && entry.styles.fill === fill)) {
        highlights.push({ slug, styles: { fill } });
      }
    });
  });

  return highlights;
};

const countSides = (muscleIds: number[], muscles: Muscle[]) => {
  const result = { front: 0, back: 0 };

  muscleIds.forEach((muscleId) => {
    const muscle = muscles.find((item) => item.id === muscleId);
    if (!muscle) return;

    const visual = resolveVisualConfig(muscle.name_en || muscle.name);
    if (!visual) return;

    if (visual.side === 'front') result.front += 1;
    if (visual.side === 'back') result.back += 1;
  });

  return result;
};

export function BodyMuscleMap({
  exerciseName,
  onBodyPartClick,
  isInteractive = false,
  highlightMode = 'none',
  selectedMuscleId,
  primaryMuscleIds = [],
  secondaryMuscleIds = [],
}: BodyMuscleMapProps) {
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [side, setSide] = useState<Side>('front');
  const [manualSideOverride, setManualSideOverride] = useState(false);
  const [fallbackSlug, setFallbackSlug] = useState<string | null>(null);

  const pinchRef = useRef(null);
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scaleValueRef = useRef(1);

  const selectionKey = useMemo(() => {
    return [
      highlightMode,
      selectedMuscleId ?? 'none',
      primaryMuscleIds.join(','),
      secondaryMuscleIds.join(','),
      exerciseName || 'none',
    ].join('|');
  }, [exerciseName, highlightMode, primaryMuscleIds, secondaryMuscleIds, selectedMuscleId]);

  useEffect(() => {
    const fetchMuscles = async () => {
      const list = await exerciseDbService.getMuscles();
      setMuscles(list);
    };

    fetchMuscles();
  }, []);

  const musclesById = useMemo(() => new Map(muscles.map((muscle) => [muscle.id, muscle])), [muscles]);
  const slugToMuscleId = useMemo(() => {
    const mapping = new Map<string, number>();

    muscles.forEach((muscle) => {
      const visual = resolveVisualConfig(muscle.name_en || muscle.name);
      if (!visual) return;

      visual.parts.forEach((slug) => {
        if (!mapping.has(slug)) {
          mapping.set(slug, muscle.id);
        }
      });
    });

    return mapping;
  }, [muscles]);

  const highlightData = useMemo(() => {
    try {
      if (highlightMode === 'click' && selectedMuscleId) {
        setFallbackSlug(null);
        return buildHighlights([selectedMuscleId], muscles, PRIMARY_FILL);
      }

       if (highlightMode === 'click' && fallbackSlug) {
        return [{ slug: fallbackSlug, styles: { fill: PRIMARY_FILL } }];
       }

      if (highlightMode === 'exercise' && (primaryMuscleIds.length > 0 || secondaryMuscleIds.length > 0)) {
        return [
          ...buildHighlights(primaryMuscleIds, muscles, PRIMARY_FILL),
          ...buildHighlights(secondaryMuscleIds, muscles, SECONDARY_FILL),
        ];
      }

      if (exerciseName) {
        const legacy = getMuscleDataForExercise(exerciseName);
        const highlights: Array<{ slug: string; styles: { fill: string } }> = [];

        legacy.forEach((part: { slug: string; intensity: number }) => {
          const fill = part.intensity > 1 ? PRIMARY_FILL : SECONDARY_FILL;
          const visual = resolveVisualConfig(part.slug) || { parts: [part.slug], side: 'front' as Side };

          visual.parts.forEach((slug) => {
            if (!highlights.some((entry) => entry.slug === slug && entry.styles.fill === fill)) {
              highlights.push({ slug, styles: { fill } });
            }
          });
        });

        return highlights;
      }

      return [];
    } catch (error) {
      console.warn('[BodyMuscleMap] Failed to generate highlight data:', error);
      return [];
    }
  }, [exerciseName, highlightMode, muscles, primaryMuscleIds, secondaryMuscleIds, selectedMuscleId]);

  const suggestedSide = useMemo<Side>(() => {
    if (highlightMode === 'click' && selectedMuscleId) {
      const muscle = musclesById.get(selectedMuscleId);
      const visual = muscle ? resolveVisualConfig(muscle.name_en || muscle.name) : null;
      return visual?.side === 'back' ? 'back' : 'front';
    }

    if (highlightMode === 'exercise') {
      const primaryCounts = countSides(primaryMuscleIds, muscles);
      const secondaryCounts = countSides(secondaryMuscleIds, muscles);
      const frontCount = primaryCounts.front + secondaryCounts.front;
      const backCount = primaryCounts.back + secondaryCounts.back;

      if (backCount > frontCount) return 'back';
      if (frontCount > backCount) return 'front';
    }

    return side;
  }, [exerciseName, highlightMode, muscles, musclesById, primaryMuscleIds, secondaryMuscleIds, selectedMuscleId]);

  useEffect(() => {
    if (!manualSideOverride && suggestedSide !== side) {
      setSide(suggestedSide);
    }
  }, [manualSideOverride, selectionKey, side, suggestedSide]);

  const clampScale = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

  const handlePinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const nextScale = clampScale(scaleValueRef.current * event.nativeEvent.scale);
      scaleValueRef.current = nextScale;
      baseScale.setValue(nextScale);
      pinchScale.setValue(1);
    }
  };

  const handleBodyPartPress = (bodyPart: any) => {
    if (!isInteractive) return;

    const slug = bodyPart?.slug || bodyPart;
    const mappedMuscleId = slugToMuscleId.get(slug);
    const matchingMuscle = resolveClickedMuscle(slug, muscles) || (mappedMuscleId ? musclesById.get(mappedMuscleId) : null);

    if (!matchingMuscle) {
      setSelectedLabel(slug);
      setFallbackSlug(slug);
      return;
    }

    const visual = resolveVisualConfig(matchingMuscle.name_en || matchingMuscle.name);
    if (visual?.side === 'back') setSide('back');
    if (visual?.side === 'front') setSide('front');
    setManualSideOverride(true);

    const label = matchingMuscle.name_en || matchingMuscle.name;
    setSelectedLabel(label);
    setFallbackSlug(null);
    onBodyPartClick?.(matchingMuscle.id, label);
  };

  const resetView = () => {
    scaleValueRef.current = 1;
    baseScale.setValue(1);
    pinchScale.setValue(1);
    setSide('front');
    setManualSideOverride(false);
  };

  const toggleSide = () => {
    setManualSideOverride(true);
    setSide((current) => (current === 'front' ? 'back' : 'front'));
  };

  const statusLabel = useMemo(() => {
    if (highlightMode === 'click' && selectedMuscleId) {
      const muscle = musclesById.get(selectedMuscleId);
      return `Selected: ${muscle?.name_en || selectedLabel || 'Muscle'}`;
    }

    if (highlightMode === 'exercise') {
      return `Target: ${primaryMuscleIds.length} primary, ${secondaryMuscleIds.length} secondary`;
    }

    return selectedLabel ? `Selected: ${selectedLabel}` : '';
  }, [highlightMode, musclesById, primaryMuscleIds.length, secondaryMuscleIds.length, selectedLabel, selectedMuscleId]);

  const transformStyle = {
    transform: [
      { scale: Animated.multiply(baseScale, pinchScale) },
    ],
  } as const;

  try {
    return (
      <View style={styles.container}>
        {isInteractive && (
          <Text style={styles.instructionText}>
            Pinch to zoom • Tap a muscle to browse exercises
          </Text>
        )}

        {highlightMode === 'exercise' && (
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: PRIMARY_FILL }]} />
              <Text style={styles.legendText}>Primary</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: SECONDARY_FILL }]} />
              <Text style={styles.legendText}>Secondary</Text>
            </View>
          </View>
        )}

        <View style={styles.controlsRow}>
          <View style={styles.sideControlsGroup}>
            <TouchableOpacity
              style={[styles.pillButton, side === 'front' && styles.pillButtonActive]}
              onPress={() => setSide('front')}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillButtonText, side === 'front' && styles.pillButtonTextActive]}>
                Front
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pillButton, side === 'back' && styles.pillButtonActive]}
              onPress={() => setSide('back')}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillButtonText, side === 'back' && styles.pillButtonTextActive]}>
                Back
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionControlsGroup}>
            <TouchableOpacity style={styles.actionPillButton} onPress={toggleSide} activeOpacity={0.8}>
              <Text style={styles.actionPillButtonText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPillButton} onPress={resetView} activeOpacity={0.8}>
              <Text style={styles.actionPillButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PinchGestureHandler
          ref={pinchRef}
          onGestureEvent={Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: false })}
          onHandlerStateChange={handlePinchStateChange}
        >
          <Animated.View style={[styles.bodyStage, transformStyle]}>
            <Body
              data={highlightData as any}
              gender="male"
              side={side}
              scale={1.1}
              colors={[PRIMARY_FILL, SECONDARY_FILL]}
              defaultFill={DEFAULT_FILL}
              onBodyPartPress={isInteractive ? (bodyPart: any) => handleBodyPartPress(bodyPart) : undefined}
            />
          </Animated.View>
        </PinchGestureHandler>

        {!!statusLabel && <Text style={styles.selectedText}>{statusLabel}</Text>}
      </View>
    );
  } catch (error) {
    console.error('[BodyMuscleMap] Body component error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Muscle visualization unavailable</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  instructionText: {
    fontSize: typography.xs,
    color: Colors.outline,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing.md,
    letterSpacing: 0.25,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  sideControlsGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 101, 145, 0.06)',
    borderRadius: radius.full,
    padding: 3,
  },
  actionControlsGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pillButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillButtonActive: {
    backgroundColor: Colors.primary,
  },
  pillButtonText: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  pillButtonTextActive: {
    color: Colors.onPrimary,
  },
  actionPillButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 101, 145, 0.2)',
    backgroundColor: Colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPillButtonText: {
    fontSize: typography.xs,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.base,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0, 101, 145, 0.03)',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: typography.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: fontWeight.semiBold,
  },
  bodyStage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 340,
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    overflow: 'hidden',
    paddingVertical: spacing.md,
  },
  selectedText: {
    fontSize: typography.sm,
    color: Colors.primary,
    marginTop: spacing.md,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 101, 145, 0.06)',
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  errorContainer: {
    padding: spacing.base,
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.sm,
    color: Colors.outline,
  },
});