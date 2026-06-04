import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ChevronDown, ChevronUp, Clock, Trash2, X } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import type { FoodLogEntry, MacroTargets, MealId } from '@/screens/dashboard/types';

interface LoggedItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingLoggedItem: FoodLogEntry | null;
  targets: MacroTargets;
  onSaveChanges: (entry: FoodLogEntry, nextAmount: number, nextMealId: MealId) => Promise<void> | void;
  onDeleteEntry: (id: string) => void;
  isSaving: boolean;
}

const MEAL_OPTIONS: Array<{ id: MealId; label: string }> = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks & Extras' },
];

export function LoggedItemDetailsModal({
  isOpen,
  onClose,
  viewingLoggedItem,
  targets,
  onSaveChanges,
  onDeleteEntry,
  isSaving,
}: LoggedItemDetailsModalProps) {
  const [editAmount, setEditAmount] = useState('1');
  const [editMealId, setEditMealId] = useState<MealId>('snack');
  const [validationMessage, setValidationMessage] = useState('');
  const [isEnergyExpanded, setIsEnergyExpanded] = useState(true);
  const [isMacrosExpanded, setIsMacrosExpanded] = useState(true);
  const [isMicrosExpanded, setIsMicrosExpanded] = useState(true);
  const [isAllMicrosExpanded, setIsAllMicrosExpanded] = useState(false);

  useEffect(() => {
    if (!viewingLoggedItem || !isOpen) return;

    setEditAmount(String(viewingLoggedItem.servingSize || 1));
    setEditMealId(viewingLoggedItem.mealId || 'snack');
    setValidationMessage('');
  }, [isOpen, viewingLoggedItem]);

  const numericAmount = Number(editAmount);
  const isAmountValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const amountErrorMessage = validationMessage || (!isAmountValid ? 'Enter an amount greater than 0.' : '');
  const previewItem = useMemo(() => {
    if (!viewingLoggedItem || !isAmountValid) return viewingLoggedItem;

    const originalAmount = viewingLoggedItem.servingSize > 0 ? viewingLoggedItem.servingSize : 1;
    const multiplier = numericAmount / originalAmount;

    return {
      ...viewingLoggedItem,
      mealId: editMealId,
      calories: Math.round(viewingLoggedItem.calories * multiplier),
      protein: Number((viewingLoggedItem.protein * multiplier).toFixed(1)),
      carbs: Number((viewingLoggedItem.carbs * multiplier).toFixed(1)),
      fat: Number((viewingLoggedItem.fat * multiplier).toFixed(1)),
      fiber: Number((viewingLoggedItem.fiber * multiplier).toFixed(1)),
      sodium: Math.round(viewingLoggedItem.sodium * multiplier),
      potassium: Math.round(viewingLoggedItem.potassium * multiplier),
      calcium: Math.round(viewingLoggedItem.calcium * multiplier),
      iron: Number((viewingLoggedItem.iron * multiplier).toFixed(2)),
      vitaminC: Number((viewingLoggedItem.vitaminC * multiplier).toFixed(1)),
      folate: Math.round(viewingLoggedItem.folate * multiplier),
      servingSize: numericAmount,
    };
  }, [editAmount, editMealId, isAmountValid, numericAmount, viewingLoggedItem]);

  const macroSummary = useMemo(() => {
    if (!previewItem) {
      return { proteinPct: 0, carbsPct: 0, fatPct: 0, totalMacroCalories: 0 };
    }

    const proteinCalories = previewItem.protein * 4;
    const carbsCalories = previewItem.carbs * 4;
    const fatCalories = previewItem.fat * 9;
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    return {
      proteinPct: totalMacroCalories > 0 ? Math.round((proteinCalories / totalMacroCalories) * 100) : 0,
      carbsPct: totalMacroCalories > 0 ? Math.round((carbsCalories / totalMacroCalories) * 100) : 0,
      fatPct: totalMacroCalories > 0 ? Math.round((fatCalories / totalMacroCalories) * 100) : 0,
      totalMacroCalories,
    };
  }, [previewItem]);

  if (!viewingLoggedItem || !previewItem) return null;

  const caloriePct = Math.min(100, (previewItem.calories / targets.calories) * 100);
  const circumference = 2 * Math.PI * 32;
  const proteinLength = circumference * (macroSummary.proteinPct / 100);
  const carbsLength = circumference * (macroSummary.carbsPct / 100);
  const fatLength = circumference * (macroSummary.fatPct / 100);
  const carbsOffset = -proteinLength;
  const fatOffset = -(proteinLength + carbsLength);

  const handleDelete = () => {
    onDeleteEntry(viewingLoggedItem.id);
    onClose();
  };

  const handleSave = async () => {
    if (!isAmountValid) {
      setValidationMessage('Enter an amount greater than 0.');
      return;
    }

    setValidationMessage('');
    await onSaveChanges(viewingLoggedItem, numericAmount, editMealId);
  };

  const nutrients = [
    { label: 'Fiber', value: previewItem.fiber || 0, target: 30, unit: 'g', decimals: 1 },
    { label: 'Sodium', value: previewItem.sodium || 0, target: 2300, unit: 'mg', decimals: 0 },
    { label: 'Potassium', value: previewItem.potassium || 0, target: 3400, unit: 'mg', decimals: 0 },
    { label: 'Calcium', value: previewItem.calcium || 0, target: 1000, unit: 'mg', decimals: 0 },
    { label: 'Iron', value: previewItem.iron || 0, target: 18, unit: 'mg', decimals: 2 },
    { label: 'Vitamin C', value: previewItem.vitaminC || 0, target: 90, unit: 'mg', decimals: 1 },
    { label: 'Folate', value: previewItem.folate || 0, target: 400, unit: 'mcg', decimals: 0 },
  ];

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeaderRow}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Close food details">
            <X size={20} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {viewingLoggedItem.name}
          </Text>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton} accessibilityRole="button" accessibilityLabel={`Delete ${viewingLoggedItem.name}`}>
            <Trash2 size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardSection}>
            <View style={styles.detailCardRow}>
              <Text style={styles.detailCardLabel}>Amount</Text>
              <View style={styles.amountEditWrap}>
                <TextInput
                  style={styles.amountInput}
                  value={editAmount}
                  onChangeText={(value) => {
                    setEditAmount(value);
                    setValidationMessage('');
                  }}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={Colors.outline}
                  accessibilityLabel="Logged food amount"
                />
                <Text style={styles.amountUnitText}>{viewingLoggedItem.servingUnit}</Text>
              </View>
            </View>
            <View style={styles.detailCardRow}>
              <Text style={styles.detailCardLabel}>Serving Unit</Text>
              <Text style={styles.detailCardValue}>{viewingLoggedItem.servingUnit}</Text>
            </View>
            <View style={styles.detailCardRow}>
              <Text style={styles.detailCardLabel}>Calories</Text>
              <Text style={styles.calorieValue}>{previewItem.calories} kcal</Text>
            </View>
            <View style={styles.detailCardStacked}>
              <Text style={styles.detailCardLabel}>Group</Text>
              <View style={styles.mealSelectorRow}>
                {MEAL_OPTIONS.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[styles.mealChip, editMealId === meal.id && styles.mealChipActive]}
                    onPress={() => setEditMealId(meal.id)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: editMealId === meal.id }}
                  >
                    <Text style={[styles.mealChipText, editMealId === meal.id && styles.mealChipTextActive]}>
                      {meal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.detailCardRow}>
              <Text style={styles.detailCardLabel}>Timestamp</Text>
              <View style={styles.pickerRightBlock}>
                <Clock size={14} color={Colors.primary} style={styles.clockIcon} />
                <Text style={styles.pickerRightText}>Logged locally</Text>
              </View>
            </View>
          </View>

          {amountErrorMessage ? <Text style={styles.validationText}>{amountErrorMessage}</Text> : null}

          <View style={styles.accordionCard}>
            <TouchableOpacity style={styles.accordionHeaderRow} onPress={() => setIsEnergyExpanded((prev) => !prev)} activeOpacity={0.75}>
              <Text style={styles.accordionTitle}>Energy Summary</Text>
              {isEnergyExpanded ? <ChevronUp size={18} color={Colors.onSurface} /> : <ChevronDown size={18} color={Colors.onSurface} />}
            </TouchableOpacity>

            {isEnergyExpanded && (
              <View style={styles.energyContentRow}>
                <View style={styles.ringContainer}>
                  <Svg width={90} height={90} viewBox="0 0 90 90">
                    <Circle cx="45" cy="45" r="32" fill="none" stroke="rgba(229, 238, 255, 0.12)" strokeWidth="8" />
                    <Circle
                      cx="45"
                      cy="45"
                      r="32"
                      fill="none"
                      stroke={Colors.primary}
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (circumference * caloriePct) / 100}
                      strokeLinecap="round"
                      transform="rotate(-90 45 45)"
                    />
                  </Svg>
                  <View style={styles.ringCenterTextWrap}>
                    <Text style={styles.ringCenterVal}>{Math.round(caloriePct)}%</Text>
                    <Text style={styles.ringCenterLabel}>daily</Text>
                  </View>
                </View>
                <View style={styles.energyLegendWrap}>
                  <Text style={styles.legendText}>
                    <Text style={styles.legendBoldText}>{previewItem.calories} kcal</Text> of {targets.calories} kcal target
                  </Text>
                  <Text style={styles.legendText}>Serving: {previewItem.servingSize} {previewItem.servingUnit}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.accordionCard}>
            <TouchableOpacity style={styles.accordionHeaderRow} onPress={() => setIsMacrosExpanded((prev) => !prev)} activeOpacity={0.75}>
              <Text style={styles.accordionTitle}>Macro Split</Text>
              {isMacrosExpanded ? <ChevronUp size={18} color={Colors.onSurface} /> : <ChevronDown size={18} color={Colors.onSurface} />}
            </TouchableOpacity>

            {isMacrosExpanded && (
              <View style={styles.energyContentRow}>
                <View style={styles.ringContainer}>
                  <Svg width={90} height={90} viewBox="0 0 90 90">
                    <Circle cx="45" cy="45" r="32" fill="none" stroke="rgba(229, 238, 255, 0.12)" strokeWidth="8" />
                    {proteinLength > 0 && (
                      <Circle
                        cx="45"
                        cy="45"
                        r="32"
                        fill="none"
                        stroke={Colors.proteinAccent}
                        strokeWidth="8"
                        strokeDasharray={`${proteinLength} ${circumference}`}
                        strokeLinecap="round"
                        transform="rotate(-90 45 45)"
                      />
                    )}
                    {carbsLength > 0 && (
                      <Circle
                        cx="45"
                        cy="45"
                        r="32"
                        fill="none"
                        stroke={Colors.tertiaryFixedDim}
                        strokeWidth="8"
                        strokeDasharray={`${carbsLength} ${circumference}`}
                        strokeDashoffset={carbsOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 45 45)"
                      />
                    )}
                    {fatLength > 0 && (
                      <Circle
                        cx="45"
                        cy="45"
                        r="32"
                        fill="none"
                        stroke={Colors.secondaryContainer}
                        strokeWidth="8"
                        strokeDasharray={`${fatLength} ${circumference}`}
                        strokeDashoffset={fatOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 45 45)"
                      />
                    )}
                  </Svg>
                </View>
                <View style={styles.energyLegendWrap}>
                  <LegendRow color={Colors.proteinAccent} label={`Protein ${macroSummary.proteinPct}%`} value={`${previewItem.protein}g`} />
                  <LegendRow color={Colors.tertiaryFixedDim} label={`Carbs ${macroSummary.carbsPct}%`} value={`${previewItem.carbs}g`} />
                  <LegendRow color={Colors.secondaryContainer} label={`Fats ${macroSummary.fatPct}%`} value={`${previewItem.fat}g`} />
                </View>
              </View>
            )}
          </View>

          <View style={styles.accordionCard}>
            <TouchableOpacity style={styles.accordionHeaderRow} onPress={() => setIsMicrosExpanded((prev) => !prev)} activeOpacity={0.75}>
              <Text style={styles.accordionTitle}>Micronutrient Highlights</Text>
              {isMicrosExpanded ? <ChevronUp size={18} color={Colors.onSurface} /> : <ChevronDown size={18} color={Colors.onSurface} />}
            </TouchableOpacity>

            {isMicrosExpanded && (
              <View style={styles.gridContainer}>
                {nutrients.slice(0, 6).map((nutrient) => {
                  const pct = Math.min(100, (nutrient.value / nutrient.target) * 100);
                  return (
                    <View key={nutrient.label} style={styles.gridItem}>
                      <View style={styles.gridLabelRow}>
                        <Text style={styles.gridName}>{nutrient.label}</Text>
                        <Text style={styles.gridPct}>{Math.round(pct)}%</Text>
                      </View>
                      <View style={styles.gridBarBg}>
                        <View style={[styles.gridBarFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.accordionCard}>
            <TouchableOpacity style={styles.accordionHeaderRow} onPress={() => setIsAllMicrosExpanded((prev) => !prev)} activeOpacity={0.75}>
              <Text style={styles.accordionTitle}>Complete Nutrient Summary</Text>
              {isAllMicrosExpanded ? <ChevronUp size={18} color={Colors.onSurface} /> : <ChevronDown size={18} color={Colors.onSurface} />}
            </TouchableOpacity>

            {isAllMicrosExpanded && (
              <View style={styles.accordionBodyContent}>
                {nutrients.map((nutrient) => {
                  const pct = Math.min(100, (nutrient.value / nutrient.target) * 100);
                  return (
                    <View key={nutrient.label} style={styles.nutrientListItem}>
                      <View style={styles.nutrientListLabelRow}>
                        <Text style={styles.nutrientListName}>{nutrient.label}</Text>
                        <Text style={styles.nutrientListRatio}>
                          {nutrient.value.toFixed(nutrient.decimals)} / {nutrient.target} {nutrient.unit}
                        </Text>
                        <Text style={styles.nutrientListPct}>{Math.round(pct)}%</Text>
                      </View>
                      <View style={styles.nutrientBarBg}>
                        <View style={[styles.nutrientBarFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.deleteFoodActionBtn}
            onPress={handleDelete}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${viewingLoggedItem.name}`}
          >
            <Trash2 size={16} color={Colors.onPrimary} style={styles.deleteIcon} />
            <Text style={styles.deleteFoodActionText}>Delete Food Entry</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={[styles.saveChangesButton, (!isAmountValid || isSaving) && styles.disabledButton]}
            onPress={handleSave}
            disabled={!isAmountValid || isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save food log changes"
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.saveChangesText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendIndicator, { backgroundColor: color }]} />
      <Text style={styles.legendText}>
        {label}: <Text style={styles.legendBoldText}>{value}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.12)',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: spacing.md,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingBottom: 132,
  },
  cardSection: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
    overflow: 'hidden',
  },
  detailCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  detailCardStacked: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
    gap: spacing.sm,
  },
  detailCardLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  detailCardValue: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  capitalized: {
    textTransform: 'capitalize',
  },
  amountEditWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.16)',
    minHeight: 38,
    minWidth: 120,
    overflow: 'hidden',
  },
  amountInput: {
    flex: 1,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    color: Colors.onSurface,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'right',
  },
  amountUnitText: {
    paddingRight: spacing.md,
    color: Colors.outline,
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
  },
  calorieValue: {
    fontSize: typography.sm,
    color: Colors.primary,
    fontWeight: fontWeight.extraBold,
    fontVariant: ['tabular-nums'],
  },
  mealSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.16)',
  },
  mealChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  mealChipText: {
    color: Colors.onSurfaceVariant,
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
  },
  mealChipTextActive: {
    color: Colors.onPrimary,
  },
  validationText: {
    color: Colors.error,
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  pickerRightBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  clockIcon: {
    marginRight: 6,
  },
  pickerRightText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  summaryBento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginTop: spacing.base,
  },
  summaryBentoBox: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: spacing.base,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  summaryBigVal: {
    fontSize: typography.lg,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 2,
  },
  accordionCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
    overflow: 'hidden',
  },
  accordionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
  },
  accordionTitle: {
    fontSize: typography.sm + 1,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  energyContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: spacing.lg,
  },
  ringContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenterTextWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenterVal: {
    fontSize: typography.md,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  ringCenterLabel: {
    fontSize: 9,
    color: Colors.outline,
    marginTop: -2,
  },
  energyLegendWrap: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    marginRight: 8,
  },
  legendText: {
    fontSize: typography.xs,
    color: Colors.outline,
  },
  legendBoldText: {
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: 12,
  },
  gridItem: {
    width: '47%',
    gap: 4,
  },
  gridLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridName: {
    fontSize: typography.xs,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  gridPct: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  gridBarBg: {
    height: 6,
    backgroundColor: 'rgba(229, 238, 255, 0.12)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  gridBarFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
  },
  accordionBodyContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: 12,
  },
  nutrientListItem: {
    gap: 4,
  },
  nutrientListLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientListName: {
    fontSize: typography.xs,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  nutrientListRatio: {
    fontSize: 10,
    color: Colors.outline,
    flex: 1,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  nutrientListPct: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  nutrientBarBg: {
    height: 5,
    backgroundColor: 'rgba(229, 238, 255, 0.12)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  nutrientBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: radius.full,
  },
  saveChangesButton: {
    backgroundColor: Colors.primary,
    borderRadius: radius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveChangesText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
  },
  disabledButton: {
    opacity: 0.55,
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.1)',
  },
  deleteFoodActionBtn: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: Colors.error,
    borderRadius: radius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  deleteIcon: {
    marginRight: 6,
  },
  deleteFoodActionText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
  },
});
