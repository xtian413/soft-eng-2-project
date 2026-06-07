import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import type { FoodLogEntry, MacroTargets } from '@/screens/dashboard/types';
import { ALL_MICROS, MicrosConfigModal } from './MicrosConfigModal';

interface NutritionCarouselProps {
  foodLogs: FoodLogEntry[];
  targets: MacroTargets;
  visibleMicros: string[];
  setVisibleMicros: React.Dispatch<React.SetStateAction<string[]>>;
  triggerToast: (msg: string) => void;
}

type NutrientSlideType = 'energy' | 'macros' | 'micros';

export function NutritionCarousel({
  foodLogs,
  targets,
  visibleMicros,
  setVisibleMicros,
  triggerToast,
}: NutritionCarouselProps) {
  const [nutrientSlide, setNutrientSlide] = useState<NutrientSlideType>('energy');
  const [isMicrosModalOpen, setIsMicrosModalOpen] = useState(false);

  const totals = useMemo(() => {
    const calories = Math.round(foodLogs.reduce((acc, food) => acc + food.calories, 0));
    const protein = Number(foodLogs.reduce((acc, food) => acc + food.protein, 0).toFixed(1));
    const carbs = Number(foodLogs.reduce((acc, food) => acc + food.carbs, 0).toFixed(1));
    const fat = Number(foodLogs.reduce((acc, food) => acc + food.fat, 0).toFixed(1));

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber: Number(foodLogs.reduce((acc, food) => acc + (food.fiber || 0), 0).toFixed(1)),
      sodium: Math.round(foodLogs.reduce((acc, food) => acc + (food.sodium || 0), 0)),
      potassium: Math.round(foodLogs.reduce((acc, food) => acc + (food.potassium || 0), 0)),
      calcium: Math.round(foodLogs.reduce((acc, food) => acc + (food.calcium || 0), 0)),
      iron: Number(foodLogs.reduce((acc, food) => acc + (food.iron || 0), 0).toFixed(1)),
      vitaminC: Number(foodLogs.reduce((acc, food) => acc + (food.vitaminC || 0), 0).toFixed(1)),
      folate: Math.round(foodLogs.reduce((acc, food) => acc + (food.folate || 0), 0)),
    };
  }, [foodLogs]);

  const nextSlide = () => {
    setNutrientSlide((prev) => (prev === 'energy' ? 'macros' : prev === 'macros' ? 'micros' : 'energy'));
  };

  const previousSlide = () => {
    setNutrientSlide((prev) => (prev === 'energy' ? 'micros' : prev === 'macros' ? 'energy' : 'macros'));
  };

  const getMicroValue = (key: string) => {
    switch (key) {
      case 'fiber':
        return totals.fiber;
      case 'sodium':
        return totals.sodium;
      case 'potassium':
        return totals.potassium;
      case 'calcium':
        return totals.calcium;
      case 'iron':
        return totals.iron;
      case 'vitaminC':
        return totals.vitaminC;
      case 'folate':
        return totals.folate;
      default:
        return 0;
    }
  };

  return (
    <View style={styles.carouselContainer}>
      <View style={styles.carouselHeader}>
        <Text style={styles.carouselHeaderTitle}>
          {nutrientSlide === 'energy' && 'Daily Energy Balance'}
          {nutrientSlide === 'macros' && 'Daily Macronutrients'}
          {nutrientSlide === 'micros' && 'Daily Micronutrient Highlights'}
        </Text>

        <View style={styles.carouselArrows}>
          <TouchableOpacity
            onPress={previousSlide}
            style={styles.arrowBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous nutrition summary"
            hitSlop={8}
          >
            <ChevronLeft size={16} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.carouselDots}>
            <View style={[styles.dot, nutrientSlide === 'energy' && styles.dotActive]} />
            <View style={[styles.dot, nutrientSlide === 'macros' && styles.dotActive]} />
            <View style={[styles.dot, nutrientSlide === 'micros' && styles.dotActive]} />
          </View>
          <TouchableOpacity
            onPress={nextSlide}
            style={styles.arrowBtn}
            accessibilityRole="button"
            accessibilityLabel="Next nutrition summary"
            hitSlop={8}
          >
            <ChevronRight size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {nutrientSlide === 'energy' && (
        <View style={styles.energyLayoutRow}>
          <View style={styles.largeRingContainer}>
            <Svg width="110" height="110" viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="42" stroke="rgba(14, 165, 233, 0.1)" strokeWidth="7" fill="transparent" />
              <Circle
                cx="50"
                cy="50"
                r="42"
                stroke={Colors.primaryContainer}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={263.8}
                strokeDashoffset={263.8 - (263.8 * Math.min(100, (totals.calories / targets.calories) * 100)) / 100}
                transform="rotate(-90 50 50)"
                strokeLinecap="round"
              />
              {totals.calories > targets.calories && (
                <Circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke={Colors.error}
                  strokeWidth="7.5"
                  fill="transparent"
                  strokeDasharray={263.8}
                  strokeDashoffset={
                    263.8 - (263.8 * Math.min(100, ((totals.calories - targets.calories) / targets.calories) * 100)) / 100
                  }
                  transform="rotate(-90 50 50)"
                  strokeLinecap="round"
                />
              )}
            </Svg>
            <View style={styles.largeRingLabel}>
              <Text style={[styles.largeRingNum, totals.calories > targets.calories && { color: Colors.error }]}>
                {totals.calories > targets.calories ? totals.calories - targets.calories : targets.calories - totals.calories}
              </Text>
              <Text style={[styles.largeRingDesc, totals.calories > targets.calories && { color: Colors.error }]}>
                {totals.calories > targets.calories ? 'over' : 'left'}
              </Text>
            </View>
          </View>

          <View style={styles.calorieStatsCol}>
            <View style={styles.calorieStatItem}>
              <Text style={styles.calorieStatLabel}>Daily Budget</Text>
              <Text style={styles.calorieStatValue}>{targets.calories} kcal</Text>
            </View>
            <View style={styles.calorieStatDivider} />
            <View style={styles.calorieStatItem}>
              <Text style={styles.calorieStatLabel}>Consumed</Text>
              <Text style={[styles.calorieStatValue, { color: Colors.primary }]}>+{totals.calories} kcal</Text>
            </View>
          </View>
        </View>
      )}

      {nutrientSlide === 'macros' && (
        <View style={styles.macrosProgressWrap}>
          {[
            { label: 'Protein', value: totals.protein, target: targets.protein, color: Colors.proteinAccent },
            { label: 'Carbs', value: totals.carbs, target: targets.carbs, color: Colors.tertiaryFixedDim },
            { label: 'Fats', value: totals.fat, target: targets.fats, color: Colors.secondaryContainer },
          ].map((macro) => {
            const pct = Math.min(100, (macro.value / macro.target) * 100);

            return (
              <View key={macro.label} style={styles.macroProgressRow}>
                <View style={styles.macroLabelRow}>
                  <Text style={styles.macroLabel}>{macro.label}</Text>
                  <Text style={styles.macroValue}>
                    {Math.round(macro.value)}g / {macro.target}g
                  </Text>
                </View>
                <View style={styles.progressLineBg}>
                  <View style={[styles.progressLineFill, { width: `${pct}%`, backgroundColor: macro.color }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {nutrientSlide === 'micros' && (
        <View style={styles.microsProgressContainer}>
          <View style={styles.microsProgressHeader}>
            <Text style={styles.microsSectionTitle}>Active Micronutrients</Text>
            <TouchableOpacity
              style={styles.customizeMicrosBtn}
              onPress={() => setIsMicrosModalOpen(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Configure micronutrients"
            >
              <Settings size={14} color={Colors.primary} style={styles.settingsIcon} />
              <Text style={styles.customizeMicrosBtnText}>Configure</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.microsBarsList}>
            {ALL_MICROS.filter((micro) => visibleMicros.includes(micro.key)).map((micro) => {
              const currentValue = getMicroValue(micro.key);
              const pct = Math.min(100, (currentValue / micro.target) * 100);
              const isExceededMax = micro.key === 'sodium' && currentValue > micro.target;

              return (
                <View key={micro.key} style={styles.microBarRow}>
                  <View style={styles.microBarLabelRow}>
                    <View style={styles.microNameWrap}>
                      <Text style={styles.microBarName}>{micro.name}</Text>
                      <Text style={styles.microBarDesc}>{micro.desc}</Text>
                    </View>
                    <Text style={styles.microBarValue}>
                      {currentValue}
                      {micro.unit} / {micro.target}
                      {micro.unit}
                    </Text>
                  </View>
                  <View style={styles.microProgressBarBg}>
                    <View
                      style={[
                        styles.microProgressBarFill,
                        { width: `${pct}%`, backgroundColor: isExceededMax ? Colors.error : micro.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <MicrosConfigModal
        isOpen={isMicrosModalOpen}
        onClose={() => setIsMicrosModalOpen(false)}
        visibleMicros={visibleMicros}
        setVisibleMicros={setVisibleMicros}
        triggerToast={triggerToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  carouselHeaderTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
  },
  carouselArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  arrowBtn: {
    paddingHorizontal: 8,
  },
  carouselDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(190, 200, 210, 0.4)',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 12,
  },
  energyLayoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  largeRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeRingLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeRingNum: {
    fontSize: 22,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  largeRingDesc: {
    fontSize: 9,
    color: Colors.outline,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  calorieStatsCol: {
    flex: 1,
    marginLeft: spacing.lg,
    gap: spacing.xs,
  },
  calorieStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  calorieStatLabel: {
    fontSize: typography.xs,
    color: Colors.outline,
    fontWeight: fontWeight.semiBold,
  },
  calorieStatValue: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  calorieStatDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(190, 200, 210, 0.15)',
  },
  macrosProgressWrap: {
    gap: spacing.sm,
  },
  macroProgressRow: {
    gap: 4,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurfaceVariant,
  },
  macroValue: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  progressLineBg: {
    height: 6,
    backgroundColor: 'rgba(229, 238, 255, 0.12)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressLineFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  microsProgressContainer: {
    gap: spacing.sm,
  },
  microsProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  microsSectionTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customizeMicrosBtn: {
    backgroundColor: 'rgba(110, 120, 129, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    marginRight: 6,
  },
  customizeMicrosBtnText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  microsBarsList: {
    gap: 12,
  },
  microBarRow: {
    gap: 6,
  },
  microBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  microNameWrap: {
    flex: 1,
    paddingRight: 8,
  },
  microBarName: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  microBarDesc: {
    fontSize: 9,
    color: Colors.outline,
    marginTop: 1,
  },
  microBarValue: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  microProgressBarBg: {
    height: 7,
    backgroundColor: 'rgba(229, 238, 255, 0.12)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  microProgressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
