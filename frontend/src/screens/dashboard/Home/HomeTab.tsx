import React, { useState } from 'react';
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
import { Flame, Sparkles, Edit } from 'lucide-react-native';
import { Modal, TextInput, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { recordWeightLocalFirst } from '@/local/bodyProgressRecording';
import {
  getBodyProgressByUserAndDate,
  normalizeRecordedDate,
} from '@/local/repositories/bodyProgressRepository';
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
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightText, setWeightText] = useState('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Pure derived calculations
  const caloriesRemaining = Math.max(0, targets.calories - caloriesEaten);
  const caloriePercent = Math.min(100, (caloriesEaten / targets.calories) * 100);

  // SVG ring properties
  const radiusSize = 48;
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

  const currentWeight = useAuthStore((s) => s.profile?.weightKg ?? null);

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
          <Sparkles size={16}
            color={Colors.primary}
            fill={Colors.primary} 
          />
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
    <View style={styles.labelRow}>
      <View style={styles.proteinDot} />
      <Text style={styles.bentoCardLabel}>PROTEIN</Text>
    </View>

    <View style={styles.bentoValueRow}>
      <Text style={styles.bentoValue}>{Math.round(proteinTotal)}g</Text>
      <Text style={styles.bentoTarget}> / {targets.protein}g</Text>
    </View>

    <View style={styles.progressBarBg}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${proteinPercent}%`,
            backgroundColor: '#004B6B',
          },
        ]}
      />
    </View>
  </View>

  {/* Carbs Card */}
  <View style={[styles.bentoCard, styles.carbsCard]}>
    <View style={styles.labelRow}>
      <View style={styles.carbsDot} />
      <Text style={styles.bentoCardLabel}>CARBS</Text>
    </View>

    <View style={styles.bentoValueRow}>
      <Text style={styles.bentoValue}>{Math.round(carbsTotal)}g</Text>
      <Text style={styles.bentoTarget}> / {targets.carbs}g</Text>
    </View>

    <View style={styles.progressBarBg}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${carbsPercent}%`,
            backgroundColor: '#006591',
          },
        ]}
      />
    </View>
  </View>

  {/* Fats Card */}
  <View style={[styles.bentoCard, styles.fatsCard]}>
    <View style={styles.labelRow}>
      <View style={styles.fatsDot} />
      <Text style={styles.bentoCardLabel}>FATS</Text>
    </View>

    <View style={styles.bentoValueRow}>
      <Text style={styles.bentoValue}>{Math.round(fatsTotal)}g</Text>
      <Text style={styles.bentoTarget}> / {targets.fats}g</Text>
    </View>

    <View style={styles.progressBarBg}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${fatsPercent}%`,
            backgroundColor: '#4A93B5',
          },
        ]}
      />
    </View>
  </View>

  {/* Log Weight Card */}
  <TouchableOpacity
    style={[styles.bentoCard, styles.weightCard]}
    onPress={async () => {
      if (!userId) return;
      // load today's entry if present
      try {
        const today = normalizeRecordedDate(new Date().toISOString());
        const todayRow = await getBodyProgressByUserAndDate(userId, today);
        if (todayRow) {
          setWeightText(String(todayRow.weight_kg ?? ''));
        } else {
          setWeightText('');
        }
        setWeightModalVisible(true);
      } catch (e) {
        console.warn('[HomeTab] failed to open weight modal', e);
      }
    }}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel="Log weight"
    accessibilityHint="Updates your current weight for today"
  >
    <View style={styles.weightCardInner}>
      <View style={styles.weightHeader}>
        <View style={styles.weightHeaderLeft}>
          <View style={styles.weightDot} />
          <Text style={styles.bentoCardLabel}>WEIGHT</Text>
        </View>
        <Edit size={10} color={Colors.onSurfaceVariant} style={styles.weightEdit} />
      </View>

      <View style={styles.weightValueRow}>
        <Text style={styles.weightValue}>{currentWeight ? `${currentWeight.toFixed(1)}` : '--'}</Text>
        <Text style={styles.weightUnit}>kg</Text>
      </View>

      
    </View>
  </TouchableOpacity>
  {/* Weight Modal */}
  <Modal
    visible={weightModalVisible}
    animationType="slide"
    transparent
    onRequestClose={() => setWeightModalVisible(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <TouchableOpacity
          style={styles.modalClose}
          onPress={() => setWeightModalVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.modalCloseText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Update Weight</Text>

        <Text style={styles.currentLabel}>Current weight</Text>
        <Text style={styles.currentValue}>{currentWeight ? `${currentWeight.toFixed(1)} kg` : '—'}</Text>

        <Text style={styles.newLabel}>New weight</Text>
        <TextInput
          style={styles.modalInput}
          value={weightText}
          onChangeText={setWeightText}
          placeholder="e.g. 72.8"
          placeholderTextColor="rgba(0,0,0,0.35)"
          keyboardType="numeric"
          returnKeyType="done"
        />

        <View style={styles.modalButtonsCenter}>
          <TouchableOpacity
            style={[styles.modalButtonPrimary]}
            onPress={async () => {
              if (!userId) return;
              const parsed = parseFloat(weightText.replace(',', '.'));
              if (!Number.isFinite(parsed) || parsed <= 0) {
                return;
              }
              setIsSavingWeight(true);
              try {
                const recordedAt = new Date().toISOString();
                await recordWeightLocalFirst({
                  userId,
                  weightKg: parsed,
                  recordedAt,
                });
                // refresh profile so UI updates
                void useAuthStore.getState().fetchProfile();
                setWeightText('');
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 1600);
                setTimeout(() => setWeightModalVisible(false), 800);
              } catch (err) {
                console.warn('[HomeTab] failed to save weight', err);
              } finally {
                setIsSavingWeight(false);
              }
            }}
          >
            {isSavingWeight ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.modalButtonPrimaryText}>Save weight</Text>
            )}
          </TouchableOpacity>
        </View>

        {saveSuccess && (
          <View style={styles.successToast}>
            <Text style={styles.successText}>✓ Weight updated</Text>
          </View>
        )}
      </View>
    </View>
  </Modal>
</View>
        

      {/* AI Recovery Insight Card */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.whisperBadge}>
            <Text style={styles.whisperBadgeText}>
              {isInsightLoading ? 'Reading...' : 'Whisper'}
            </Text>
          </View>
          <Sparkles size={16}
            color={Colors.primary}
            fill={Colors.primary} 
          />
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
    fontSize: 32,
    fontWeight: '800',
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
    borderWidth: 0,
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
    fontSize: 44,
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
    width: 110,
    height: 110,
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
    gap: spacing.md,
  },
  bentoCard: {
  flex: 1,
  minWidth: '46%',
  height: 120,
  backgroundColor: Colors.surfaceContainerLowest,
  borderRadius: 20,
  padding: spacing.base,

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 5, 
  },
  fullWidthBento: {
    minWidth: '100%',
  },
  proteinCard: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(190, 200, 210, 0.15)',
  },
  carbsCard: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(190, 200, 210, 0.15)',
  },
  fatsCard: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(190, 200, 210, 0.15)',

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
  weightCard: {
    borderColor: 'rgba(14, 165, 233, 0.2)',
    backgroundColor: Colors.surfaceContainerLowest,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  quickLogContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLogIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: '#EEF6FF',
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
    backgroundColor: '#F4F8FF',
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
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
  labelRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

proteinDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#004B6B',
},

carbsDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#006591',
},

fatsDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#4A93B5',
},

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  modalInput: {
    height: 56,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    marginBottom: spacing.base,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  modalButtonsCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  modalButtonPrimary: {
    minWidth: 200,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontWeight: fontWeight.bold,
    fontSize: 14,
  },
  modalClose: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 20,
  },
  modalCloseText: {
    fontSize: 18,
    color: Colors.onSurfaceVariant,
  },
  currentLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 6,
  },
  currentValue: {
    fontSize: 20,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    marginBottom: 12,
  },
  newLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  successToast: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  successText: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  weightCardInner: {
    flex: 1,
    alignItems: 'flex-start',
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  weightValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  weightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  weightUnit: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginLeft: 6,
  },
  weightEdit: {
    marginLeft: spacing.xs,
    opacity: 0.5,
  },
  weightValue: {
    fontSize: 18,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
  },
  weightLabel: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 6,
    fontWeight: fontWeight.bold,
  },

});
