import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Droplet, Edit2, Minus, Plus, X } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';

interface HydrationTrackerCardProps {
  hydrationGoal: number;
  setHydrationGoal: (ml: number) => void;
  waterGlassStates: boolean[];
  setWaterGlassStates: React.Dispatch<React.SetStateAction<boolean[]>>;
  triggerToast: (msg: string) => void;
  readOnly?: boolean;
}

export function HydrationTrackerCard({
  hydrationGoal,
  setHydrationGoal,
  waterGlassStates,
  setWaterGlassStates,
  triggerToast,
  readOnly = false,
}: HydrationTrackerCardProps) {
  const [isEditingHydration, setIsEditingHydration] = useState(false);
  const [hydrationGoalInput, setHydrationGoalInput] = useState(String(hydrationGoal));

  const waterConsumedMl = waterGlassStates.filter(Boolean).length * 250;
  const waterGlassCount = Math.min(12, Math.max(Math.ceil(hydrationGoal / 250), waterGlassStates.length));
  const filledCount = waterGlassStates.filter(Boolean).length;
  const nextUnfilledIdx = filledCount;
  const lastFilledIdx = filledCount - 1;

  const handleWaterGlassToggle = (idx: number) => {
    if (idx === nextUnfilledIdx) {
      setWaterGlassStates((prev) => {
        const next = [...prev];
        while (next.length <= idx) next.push(false);
        next[idx] = true;
        return next;
      });
      if (idx + 1 === waterGlassCount) {
        triggerToast('Perfect daily hydration met!');
      }
      return;
    }

    if (idx === lastFilledIdx) {
      setWaterGlassStates((prev) => {
        const next = [...prev];
        next[idx] = false;
        return next;
      });
      return;
    }

    triggerToast(idx > nextUnfilledIdx ? 'Please log water in order without skipping!' : 'To remove water, tap the last filled glass.');
  };

  const updateHydrationGoal = (ml: number) => {
    setHydrationGoal(ml);
    setIsEditingHydration(false);
    triggerToast(`Hydration target updated to ${(ml / 1000).toFixed(2)}L!`);
  };

  return (
    <View style={styles.hydrationCard}>
      <View style={styles.hydrationHeader}>
        <View style={styles.cardTitleRow}>
          <View style={styles.hydrationIconWrapper}>
            <Droplet size={16} color={Colors.primary} fill={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>DAILY HYDRATION</Text>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.hydrationGoalLabel}>Goal: {(hydrationGoal / 1000).toFixed(2)}L</Text>
          {!readOnly && (
            <TouchableOpacity
              onPress={() => {
                setIsEditingHydration(true);
                setHydrationGoalInput(String(hydrationGoal));
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit hydration goal"
            >
              <Edit2 size={14} color={Colors.outline} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isEditingHydration && (
        <View style={styles.hydrationGoalEditor}>
          <Text style={styles.editorLabel}>Set Daily Target Goal (mL):</Text>
          <View style={styles.chipsRow}>
            {[1500, 2000, 2500, 3000, 3500, 4000].map((ml) => (
              <TouchableOpacity
                key={ml}
                style={[styles.editorChip, hydrationGoal === ml && styles.editorChipActive]}
                onPress={() => updateHydrationGoal(ml)}
                accessibilityRole="button"
                accessibilityState={{ selected: hydrationGoal === ml }}
              >
                <Text style={[styles.editorChipText, hydrationGoal === ml && styles.editorChipTextActive]}>
                  {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customGoalRow}>
            <TextInput
              style={styles.customGoalInput}
              keyboardType="numeric"
              placeholder="Custom mL"
              placeholderTextColor={Colors.outline}
              value={hydrationGoalInput}
              onChangeText={setHydrationGoalInput}
            />
            <TouchableOpacity
              style={styles.customGoalBtn}
              onPress={() => {
                const ml = Number(hydrationGoalInput);
                if (ml >= 250 && ml <= 6000) {
                  updateHydrationGoal(ml);
                } else {
                  triggerToast('Enter target between 250 and 6000 mL!');
                }
              }}
              accessibilityRole="button"
            >
              <Text style={styles.customGoalBtnText}>Set</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.customGoalClose} onPress={() => setIsEditingHydration(false)} hitSlop={8}>
              <X size={18} color={Colors.outline} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.hydrationSubtext}>
        {waterConsumedMl.toLocaleString()} ml logged / {waterGlassCount} glasses
      </Text>

      <View style={styles.hydrationProgressContainer}>
        <View style={[styles.hydrationProgressFill, { width: `${Math.min(100, (waterConsumedMl / hydrationGoal) * 100)}%` }]} />
      </View>

      <View style={styles.glassRow}>
        {Array.from({ length: waterGlassCount }).map((_, idx) => {
          const filled = waterGlassStates[idx] === true;
          const isNextToFill = !readOnly && idx === nextUnfilledIdx;
          const isLastToEmpty = !readOnly && idx === lastFilledIdx;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.glassBtn,
                filled && styles.glassBtnFilled,
                isNextToFill && styles.glassBtnNext,
              ]}
              onPress={readOnly ? undefined : () => handleWaterGlassToggle(idx)}
              activeOpacity={readOnly ? 1 : 0.75}
              accessibilityRole={readOnly ? 'none' : 'button'}
              accessibilityLabel={readOnly ? undefined : `${filled ? 'Remove' : 'Add'} water glass ${idx + 1}`}
              accessibilityState={readOnly ? undefined : { checked: filled }}
            >
              <Droplet size={18} color={filled ? '#0ea5e9' : 'rgba(110, 120, 129, 0.4)'} fill={filled ? '#0ea5e9' : 'transparent'} />
              {isNextToFill && (
                <View style={styles.plusBadge}>
                  <Plus size={8} color="#ffffff" strokeWidth={3.5} />
                </View>
              )}
              {isLastToEmpty && (
                <View style={styles.minusBadge}>
                  <Minus size={8} color="#ffffff" strokeWidth={3.5} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hydrationCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hydrationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hydrationGoalLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
    fontVariant: ['tabular-nums'],
  },
  hydrationGoalEditor: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  editorLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  editorChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  editorChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  editorChipText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  editorChipTextActive: {
    color: Colors.onPrimary,
  },
  customGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  customGoalInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    fontSize: typography.sm,
    color: Colors.onSurface,
  },
  customGoalBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.md,
    height: 36,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customGoalBtnText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
    fontSize: typography.sm,
  },
  customGoalClose: {
    padding: 6,
  },
  hydrationSubtext: {
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  hydrationProgressContainer: {
    height: 4,
    backgroundColor: 'rgba(229, 238, 255, 0.12)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  hydrationProgressFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: radius.full,
  },
  glassRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.xs,
  },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: 'rgba(110, 120, 129, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    position: 'relative',
  },
  glassBtnFilled: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderColor: '#0ea5e9',
  },
  glassBtnNext: {
    borderColor: 'rgba(14, 165, 233, 0.5)',
    borderStyle: 'dashed',
  },
  plusBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minusBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
