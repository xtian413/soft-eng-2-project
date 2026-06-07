import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import type { MacroTargets } from '@/screens/dashboard/types';
import { Flame, Sparkles, Plus } from 'lucide-react-native';
import type { FitnessInsight } from '@/ai/insights/fitnessInsight';

interface HomeTabProps {
  fullName: string;
  targets: MacroTargets;
  proteinTotal: number;
  carbsTotal: number;
  fatsTotal: number;
  caloriesEaten: number;
  onQuickLog: () => void;
  fitnessInsight: FitnessInsight;
  isInsightLoading: boolean;
  onNavigateToTab?: (tab: 'dashboard' | 'food' | 'insights' | 'lift' | 'profile') => void;
}

export function HomeTab({
  fullName,
  targets,
  proteinTotal,
  carbsTotal,
  fatsTotal,
  caloriesEaten,
  onQuickLog,
  fitnessInsight,
  isInsightLoading,
  onNavigateToTab,
}: HomeTabProps) {
  // Pure derived calculations
  const caloriesRemaining = Math.max(0, targets.calories - caloriesEaten);
  const caloriePercent = Math.min(100, (caloriesEaten / targets.calories) * 100);

  // SVG ring properties
  const radiusSize = 42;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radiusSize;
  const strokeDashoffset = circumference - (circumference * caloriePercent) / 100;

  // Macro progress rates
  const proteinPercent = Math.min(100, (proteinTotal / targets.protein) * 100);
  const carbsPercent = Math.min(100, (carbsTotal / targets.carbs) * 100);
  const fatsPercent = Math.min(100, (fatsTotal / targets.fats) * 100);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const whisperText = isInsightLoading
    ? 'Reading your latest food and training data once. This insight will stay cached until your data changes.'
    : fitnessInsight.summary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Dynamic Header Greeting */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeGreetingRow}>
          <Text style={styles.welcomeTitle}>
            {getGreeting()}, {fullName.split(' ')[0]}!
          </Text>
          <Sparkles size={20} color="#eab308" fill="#eab308" style={styles.greetingSparkle} />
        </View>
        <Text style={styles.welcomeSubtitle}>
          Here is your daily recovery & nutrition state.
        </Text>
      </View>

      {/* Calories Card (2x2 / Full Width) */}
      <View style={styles.card}>
        <View style={styles.calorieHeader}>
          <View style={styles.calorieTextGroup}>
            <Text style={styles.cardTitle}>CALORIES REMAINING</Text>
            <View style={styles.calorieMainRow}>
              <Text style={styles.caloriesBigNum} numberOfLines={1} adjustsFontSizeToFit>
                {caloriesRemaining.toLocaleString()}
              </Text>
              <Text style={styles.calorieUnit}> kcal left</Text>
            </View>
            <Text style={styles.calorieSubtext}>
              of {targets.calories.toLocaleString()} kcal target
            </Text>
          </View>

          {/* Premium Circular SVG Calorie Ring */}
          <View style={styles.ringContainer}>
            <Svg width="100" height="100" viewBox="0 0 100 100" style={styles.svgRing}>
              <Circle
                cx="50"
                cy="50"
                r={radiusSize}
                fill="transparent"
                stroke="rgba(229, 238, 255, 0.6)"
                strokeWidth={strokeWidth}
              />
              <Circle
                cx="50"
                cy="50"
                r={radiusSize}
                fill="transparent"
                stroke={Colors.primary}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </Svg>
            <View style={styles.ringCenterText}>
              <Flame size={18} color={Colors.primary} fill={Colors.primary} />
              <Text style={styles.ringCenterLabel}>
                {Math.round(caloriePercent)}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Macro Bento Grid (2 Columns on Mobile) */}
      <View style={styles.bentoGrid}>
        {/* Protein Card */}
        <View style={[styles.bentoCard, styles.proteinCard]}>
          <Text style={styles.bentoCardLabel}>PROTEIN</Text>
          <View style={styles.bentoValueRow}>
            <Text style={styles.bentoValue}>{Math.round(proteinTotal)}g</Text>
            <Text style={styles.bentoTarget}> / {targets.protein}g</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${proteinPercent}%`, backgroundColor: Colors.proteinAccent },
              ]}
            />
          </View>
        </View>

        {/* Carbs Card */}
        <View style={[styles.bentoCard, styles.carbsCard]}>
          <Text style={styles.bentoCardLabel}>CARBS</Text>
          <View style={styles.bentoValueRow}>
            <Text style={styles.bentoValue}>{Math.round(carbsTotal)}g</Text>
            <Text style={styles.bentoTarget}> / {targets.carbs}g</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${carbsPercent}%`, backgroundColor: Colors.tertiaryFixedDim },
              ]}
            />
          </View>
        </View>

        {/* Fats Card */}
        <View style={[styles.bentoCard, styles.fatsCard]}>
          <Text style={styles.bentoCardLabel}>FATS</Text>
          <View style={styles.bentoValueRow}>
            <Text style={styles.bentoValue}>{Math.round(fatsTotal)}g</Text>
            <Text style={styles.bentoTarget}> / {targets.fats}g</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${fatsPercent}%`, backgroundColor: Colors.secondaryContainer },
              ]}
            />
          </View>
        </View>

        {/* Quick Log Card */}
        <TouchableOpacity
          style={[styles.bentoCard, styles.quickLogCard]}
          onPress={onQuickLog}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Quick log food"
          accessibilityHint="Opens the food tab so you can add a meal"
        >
          <View style={styles.quickLogContent}>
            <View style={styles.quickLogIconBox}>
              <Plus size={20} color={Colors.primary} strokeWidth={3} />
            </View>
            <Text style={styles.quickLogText}>Quick Log</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* AI Recovery Insight Card */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.whisperBadge}>
            <Text style={styles.whisperBadgeText}>
              {isInsightLoading ? 'Reading...' : 'Whisper'}
            </Text>
          </View>
          <Sparkles size={16} color="#eab308" fill="#eab308" />
        </View>
        <Text style={styles.insightQuote}>
          "{whisperText}"
        </Text>
        <TouchableOpacity
          style={styles.insightBtn}
          activeOpacity={0.8}
          onPress={() => onNavigateToTab?.('insights')}
          accessibilityRole="button"
          accessibilityLabel="Adjust plan with coach"
        >
          <Text style={styles.insightBtnText}>Open Insights</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl * 2,
    width: '100%',
    maxWidth: layout.modalMaxWidth,
    alignSelf: 'center',
  },
  welcomeSection: {
    marginBottom: spacing.base,
  },
  welcomeGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  greetingSparkle: {
    marginTop: -2,
  },
  welcomeTitle: {
    fontSize: typography.xl,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    letterSpacing: 0,
    flexShrink: 1,
  },
  welcomeSubtitle: {
    fontSize: typography.base,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.base,
  },
  calorieTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 1.0,
  },
  calorieMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  caloriesBigNum: {
    fontSize: 38,
    fontWeight: fontWeight.extraBold,
    color: Colors.primary,
    letterSpacing: 0,
    flexShrink: 1,
  },
  calorieUnit: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurfaceVariant,
  },
  calorieSubtext: {
    fontSize: typography.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  ringContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgRing: {
    position: 'absolute',
  },
  ringCenterText: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenterLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    marginTop: 2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  bentoCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md + 2,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 104,
  },
  fullWidthBento: {
    minWidth: '100%',
  },
  proteinCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.proteinAccent,
  },
  carbsCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.tertiaryFixedDim,
  },
  fatsCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondaryContainer,
  },
  fatsCardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoCardLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
  },
  bentoValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: spacing.xs,
  },
  bentoValue: {
    fontSize: typography.lg,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
  },
  bentoTarget: {
    fontSize: typography.xs,
    color: Colors.outline,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(229, 238, 255, 0.7)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  quickLogCard: {
    borderColor: 'rgba(14, 165, 233, 0.2)',
    backgroundColor: Colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLogContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLogIconBox: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickLogText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  insightCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  whisperBadge: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  whisperBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  insightQuote: {
    fontSize: typography.sm,
    fontStyle: 'italic',
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  insightBtn: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  insightBtnText: {
    color: Colors.primary,
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
  },
});
