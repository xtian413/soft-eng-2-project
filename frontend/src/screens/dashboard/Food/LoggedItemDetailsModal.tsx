import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ChevronDown, ChevronUp, Clock, Trash2, X, Plus, Minus } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import type { FoodLogEntry, MacroTargets, MealId } from '@/screens/dashboard/types';
import { searchFoodDatabase, type GemiFoodItem } from '@/api/foodDatabaseApi';

interface LoggedItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingLoggedItem: FoodLogEntry | null;
  targets: MacroTargets;
  onSaveChanges: (updatedEntry: FoodLogEntry) => Promise<void> | void;
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
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnit, setEditUnit] = useState<string>('portion');
  const [editWeight, setEditWeight] = useState<number>(100);
  const [editMealId, setEditMealId] = useState<MealId>('snack');
  const [hydratedFood, setHydratedFood] = useState<GemiFoodItem | null>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [isServingDropdownOpen, setIsServingDropdownOpen] = useState(false);
  const [isMealDropdownOpen, setIsMealDropdownOpen] = useState(false);

  // Accordion Expand/Collapse States
  const [isEnergyExpanded, setIsEnergyExpanded] = useState(true);
  const [isMacrosExpanded, setIsMacrosExpanded] = useState(true);
  const [isMicrosExpanded, setIsMicrosExpanded] = useState(true);
  const [isAllMicrosExpanded, setIsAllMicrosExpanded] = useState(false);

  useEffect(() => {
    if (viewingLoggedItem && isOpen) {
      setEditQuantity(viewingLoggedItem.servingSize || 1);
      setEditUnit(viewingLoggedItem.servingUnit || 'portion');
      setEditMealId(viewingLoggedItem.mealId || 'snack');
      setHydratedFood(null);
      setValidationMessage('');
      setIsServingDropdownOpen(false);
      setIsMealDropdownOpen(false);

      // Hydrate from USDA database by matching food name to obtain micronutrients and units
      const hydrateDetails = async () => {
        try {
          const results = await searchFoodDatabase({ query: viewingLoggedItem.name, limit: 1 });
          if (results && results.length > 0) {
            const matched = results[0];
            setHydratedFood(matched);
            
            // Sync serving weight based on the initial logged unit
            if (viewingLoggedItem.servingUnit === '100g') {
              setEditWeight(100);
            } else if (viewingLoggedItem.servingUnit === '1g') {
              setEditWeight(1);
            } else {
              setEditWeight(matched.defaultServingSize || 100);
            }
          }
        } catch (err) {
          console.error('[Gemi] Failed to hydrate food details:', err);
        }
      };

      hydrateDetails();
    }
  }, [viewingLoggedItem, isOpen]);

  const calculatedValues = useMemo(() => {
    let cals = 0;
    let prot = 0;
    let carb = 0;
    let fat = 0;
    let fiber = 0;
    let sodium = 0;
    let potassium = 0;
    let calcium = 0;
    let iron = 0;
    let vitaminC = 0;
    let folate = 0;

    if (!viewingLoggedItem) {
      return { cals, prot, carb, fat, fiber, sodium, potassium, calcium, iron, vitaminC, folate };
    }

    if (hydratedFood) {
      const multiplier = editQuantity * (editWeight / 100);
      cals = Math.round(hydratedFood.calories * multiplier);
      prot = Number((hydratedFood.protein * multiplier).toFixed(1));
      carb = Number((hydratedFood.carbs * multiplier).toFixed(1));
      fat = Number((hydratedFood.fat * multiplier).toFixed(1));
      fiber = Number((hydratedFood.fiber * multiplier).toFixed(1));
      sodium = Math.round(hydratedFood.sodium * multiplier);
      potassium = Math.round(hydratedFood.potassium * multiplier);
      calcium = Math.round(hydratedFood.calcium * multiplier);
      iron = Number((hydratedFood.iron * multiplier).toFixed(2));
      vitaminC = Number((hydratedFood.vitaminC * multiplier).toFixed(1));
      folate = Math.round(hydratedFood.folate * multiplier);
    } else {
      const ratio = editQuantity / (viewingLoggedItem.servingSize || 1);
      cals = Math.round(viewingLoggedItem.calories * ratio);
      prot = Number((viewingLoggedItem.protein * ratio).toFixed(1));
      carb = Number((viewingLoggedItem.carbs * ratio).toFixed(1));
      fat = Number((viewingLoggedItem.fat * ratio).toFixed(1));
      fiber = viewingLoggedItem.fiber ? Number((viewingLoggedItem.fiber * ratio).toFixed(1)) : 0;
      sodium = viewingLoggedItem.sodium ? Math.round(viewingLoggedItem.sodium * ratio) : 0;
      potassium = viewingLoggedItem.potassium ? Math.round(viewingLoggedItem.potassium * ratio) : 0;
      calcium = viewingLoggedItem.calcium ? Math.round(viewingLoggedItem.calcium * ratio) : 0;
      iron = viewingLoggedItem.iron ? Number((viewingLoggedItem.iron * ratio).toFixed(2)) : 0;
      vitaminC = viewingLoggedItem.vitaminC ? Number((viewingLoggedItem.vitaminC * ratio).toFixed(1)) : 0;
      folate = viewingLoggedItem.folate ? Math.round(viewingLoggedItem.folate * ratio) : 0;
    }

    return { cals, prot, carb, fat, fiber, sodium, potassium, calcium, iron, vitaminC, folate };
  }, [viewingLoggedItem, hydratedFood, editQuantity, editWeight]);

  const circularProgress = useMemo(() => {
    const { prot, carb, fat } = calculatedValues;
    const r = 32;
    const circumference = 2 * Math.PI * r;
    const totalMacroCals = (prot * 4) + (carb * 4) + (fat * 9);
    const protRatio = totalMacroCals > 0 ? (prot * 4) / totalMacroCals : 0;
    const carbRatio = totalMacroCals > 0 ? (carb * 4) / totalMacroCals : 0;
    const fatRatio = totalMacroCals > 0 ? (fat * 9) / totalMacroCals : 0;

    const protLength = circumference * protRatio;
    const carbLength = circumference * carbRatio;
    const fatLength = circumference * fatRatio;

    const protPct = Math.round(protRatio * 100);
    const carbPct = Math.round(carbRatio * 100);
    const fatPct = Math.round(fatRatio * 100);

    return { r, circumference, protLength, carbLength, fatLength, protPct, carbPct, fatPct };
  }, [calculatedValues]);

  const handleDelete = () => {
    if (!viewingLoggedItem) return;
    onDeleteEntry(viewingLoggedItem.id);
    onClose();
  };

  const handleSave = async () => {
    if (!viewingLoggedItem) return;
    if (editQuantity <= 0 || !Number.isFinite(editQuantity)) {
      setValidationMessage('Enter an amount greater than 0.');
      return;
    }

    setValidationMessage('');
    const { cals, prot, carb, fat, fiber, sodium, potassium, calcium, iron, vitaminC, folate } = calculatedValues;

    const updatedEntry: FoodLogEntry = {
      ...viewingLoggedItem,
      mealId: editMealId,
      calories: cals,
      protein: prot,
      carbs: carb,
      fat: fat,
      fiber: fiber,
      sodium: sodium,
      potassium: potassium,
      calcium: calcium,
      iron: iron,
      vitaminC: vitaminC,
      folate: folate,
      servingSize: editQuantity,
      servingUnit: editUnit,
    };

    await onSaveChanges(updatedEntry);
  };

  if (!viewingLoggedItem) return null;

  const { cals, prot, carb, fat, fiber, sodium, potassium, calcium, iron, vitaminC, folate } = calculatedValues;
  const { r, circumference, protLength, carbLength, fatLength, protPct, carbPct, fatPct } = circularProgress;

  const nutrients = [
    { label: 'Fiber', value: fiber, target: 30, unit: 'g', decimals: 1 },
    { label: 'Sodium', value: sodium, target: 2300, unit: 'mg', decimals: 0 },
    { label: 'Potassium', value: potassium, target: 3400, unit: 'mg', decimals: 0 },
    { label: 'Calcium', value: calcium, target: 1000, unit: 'mg', decimals: 0 },
    { label: 'Iron', value: iron, target: 18, unit: 'mg', decimals: 2 },
    { label: 'Vitamin C', value: vitaminC, target: 90, unit: 'mg', decimals: 1 },
    { label: 'Folate', value: folate, target: 400, unit: 'mcg', decimals: 0 },
  ];

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Sleek Custom Top Toolbar */}
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
          {/* Metadata & Portion Selection Rows */}
          <View style={styles.cardSection}>
            <View style={styles.detailCardRow}>
              <Text style={styles.detailCardLabel}>Amount</Text>
              <View style={styles.stepperWrap}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setEditQuantity(Math.max(0.5, editQuantity - (editQuantity <= 1 ? 0.5 : 1)))}
                  activeOpacity={0.7}
                >
                  <Minus size={14} color={Colors.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={String(editQuantity)}
                  onChangeText={(v) => {
                    const parsed = parseFloat(v);
                    setEditQuantity(isNaN(parsed) ? 0 : parsed);
                  }}
                  keyboardType="numeric"
                  textAlign="center"
                  placeholderTextColor={Colors.outline}
                  accessibilityLabel="Food amount quantity"
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setEditQuantity(editQuantity + (editQuantity < 1 ? 0.5 : 1))}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.detailCardRow, { zIndex: 20 }]}>
              <Text style={styles.detailCardLabel}>Serving Size</Text>
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => {
                    setIsServingDropdownOpen(!isServingDropdownOpen);
                    setIsMealDropdownOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownTriggerText}>{editUnit}</Text>
                  <ChevronDown size={14} color={Colors.outline} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                {isServingDropdownOpen && (
                  <View style={styles.dropdownList}>
                    <TouchableOpacity
                      style={[styles.dropdownOption, editUnit === (hydratedFood?.defaultServingUnit || 'portion') && styles.dropdownOptionActive]}
                      onPress={() => {
                        const unit = hydratedFood?.defaultServingUnit || 'portion';
                        setEditUnit(unit);
                        setEditWeight(hydratedFood?.defaultServingSize || 100);
                        setIsServingDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, editUnit === (hydratedFood?.defaultServingUnit || 'portion') && styles.dropdownOptionTextActive]}>
                        {hydratedFood?.defaultServingUnit || 'portion'} ({hydratedFood?.defaultServingSize || 100}g)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownOption, editUnit === '100g' && styles.dropdownOptionActive]}
                      onPress={() => {
                        setEditUnit('100g');
                        setEditWeight(100);
                        setIsServingDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, editUnit === '100g' && styles.dropdownOptionTextActive]}>100g</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownOption, editUnit === '1g' && styles.dropdownOptionActive]}
                      onPress={() => {
                        setEditUnit('1g');
                        setEditWeight(1);
                        setIsServingDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, editUnit === '1g' && styles.dropdownOptionTextActive]}>1g</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.detailCardRow}>
              <Text style={styles.detailCardLabel}>Timestamp</Text>
              <View style={styles.pickerRightBlock}>
                <Clock size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.pickerRightText}>Logged locally</Text>
              </View>
            </View>

            <View style={[styles.detailCardRow, { zIndex: 15 }]}>
              <Text style={styles.detailCardLabel}>Group</Text>
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => {
                    setIsMealDropdownOpen(!isMealDropdownOpen);
                    setIsServingDropdownOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {MEAL_OPTIONS.find((m) => m.id === editMealId)?.label || editMealId}
                  </Text>
                  <ChevronDown size={14} color={Colors.outline} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                {isMealDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {MEAL_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.dropdownOption, editMealId === opt.id && styles.dropdownOptionActive]}
                        onPress={() => {
                          setEditMealId(opt.id);
                          setIsMealDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, editMealId === opt.id && styles.dropdownOptionTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {validationMessage ? <Text style={styles.validationText}>{validationMessage}</Text> : null}

          {/* 1. Energy Summary Collapsible Accordion */}
          <View style={[styles.accordionCard, { marginTop: spacing.lg }]}>
            <TouchableOpacity 
              onPress={() => setIsEnergyExpanded(!isEnergyExpanded)} 
              style={styles.accordionHeaderRow}
              activeOpacity={0.7}
            >
              <Text style={styles.accordionTitle}>Energy Summary</Text>
              {isEnergyExpanded ? <ChevronUp size={18} color={Colors.onSurface} /> : <ChevronDown size={18} color={Colors.onSurface} />}
            </TouchableOpacity>

            {isEnergyExpanded && (
              <View style={styles.energyContentRow}>
                {/* Segmented Ring SVG */}
                <View style={styles.ringContainer}>
                  <Svg width={90} height={90} viewBox="0 0 90 90">
                    <Circle
                      cx="45"
                      cy="45"
                      r={r}
                      fill="none"
                      stroke="#17273e"
                      strokeWidth="8"
                    />
                    {protLength > 0 && (
                      <Circle
                        cx="45"
                        cy="45"
                        r={r}
                        fill="none"
                        stroke={Colors.proteinAccent || '#22c55e'}
                        strokeWidth="8"
                        strokeDasharray={`${protLength} ${circumference}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        transform="rotate(-90 45 45)"
                      />
                    )}
                    {carbLength > 0 && (
                      <Circle
                        cx="45"
                        cy="45"
                        r={r}
                        fill="none"
                        stroke={Colors.tertiaryFixedDim || '#0ea5e9'}
                        strokeWidth="8"
                        strokeDasharray={`${carbLength} ${circumference}`}
                        strokeDashoffset={-protLength}
                        strokeLinecap="round"
                        transform="rotate(-90 45 45)"
                      />
                    )}
                    {fatLength > 0 && (
                      <Circle
                        cx="45"
                        cy="45"
                        r={r}
                        fill="none"
                        stroke={Colors.secondaryContainer || '#ef4444'}
                        strokeWidth="8"
                        strokeDasharray={`${fatLength} ${circumference}`}
                        strokeDashoffset={-(protLength + carbLength)}
                        strokeLinecap="round"
                        transform="rotate(-90 45 45)"
                      />
                    )}
                  </Svg>
                  <View style={styles.ringCenterTextWrap}>
                    <Text style={styles.ringCenterVal}>{cals}</Text>
                    <Text style={styles.ringCenterLabel}>kcal</Text>
                  </View>
                </View>

                <View style={styles.energyLegendWrap}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendIndicator, { backgroundColor: Colors.proteinAccent || '#22c55e' }]} />
                    <Text style={styles.legendText}>
                      Protein ({protPct}%) — <Text style={styles.legendBoldText}>{prot}g</Text>
                    </Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendIndicator, { backgroundColor: Colors.tertiaryFixedDim || '#0ea5e9' }]} />
                    <Text style={styles.legendText}>
                      Net Carbs ({carbPct}%) — <Text style={styles.legendBoldText}>{carb}g</Text>
                    </Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendIndicator, { backgroundColor: Colors.secondaryContainer || '#ef4444' }]} />
                    <Text style={styles.legendText}>
                      Fat ({fatPct}%) — <Text style={styles.legendBoldText}>{fat}g</Text>
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 2. Macronutrient Targets Accordion */}
          <View style={styles.accordionCard}>
            <TouchableOpacity 
              onPress={() => setIsMacrosExpanded(!isMacrosExpanded)} 
              style={styles.accordionHeaderRow}
              activeOpacity={0.7}
            >
              <Text style={styles.accordionTitle}>Macronutrient Targets</Text>
              {isMacrosExpanded ? <ChevronUp size={18} color={Colors.onSurface} /> : <ChevronDown size={18} color={Colors.onSurface} />}
            </TouchableOpacity>

            {isMacrosExpanded && (
              <View style={styles.accordionBodyContent}>
                {/* Energy */}
                <View style={styles.targetBarItem}>
                  <View style={styles.targetBarLabelRow}>
                    <Text style={styles.targetBarName}>Energy</Text>
                    <Text style={styles.targetBarRatio}>{cals} / {targets.calories} kcal</Text>
                    <Text style={styles.targetBarPct}>{Math.round((cals / targets.calories) * 100)}%</Text>
                  </View>
                  <View style={styles.barContainerBg}>
                    <View style={[styles.barFill, { width: `${Math.min(100, (cals / targets.calories) * 100)}%`, backgroundColor: Colors.primary }]} />
                  </View>
                </View>

                {/* Protein */}
                <View style={styles.targetBarItem}>
                  <View style={styles.targetBarLabelRow}>
                    <Text style={styles.targetBarName}>Protein</Text>
                    <Text style={styles.targetBarRatio}>{prot} / {targets.protein} g</Text>
                    <Text style={styles.targetBarPct}>{Math.round((prot / targets.protein) * 100)}%</Text>
                  </View>
                  <View style={styles.barContainerBg}>
                    <View style={[styles.barFill, { width: `${Math.min(100, (prot / targets.protein) * 100)}%`, backgroundColor: Colors.proteinAccent }]} />
                  </View>
                </View>

                {/* Carbs */}
                <View style={styles.targetBarItem}>
                  <View style={styles.targetBarLabelRow}>
                    <Text style={styles.targetBarName}>Net Carbs</Text>
                    <Text style={styles.targetBarRatio}>{carb} / {targets.carbs} g</Text>
                    <Text style={styles.targetBarPct}>{Math.round((carb / targets.carbs) * 100)}%</Text>
                  </View>
                  <View style={styles.barContainerBg}>
                    <View style={[styles.barFill, { width: `${Math.min(100, (carb / targets.carbs) * 100)}%`, backgroundColor: Colors.tertiaryFixedDim }]} />
                  </View>
                </View>

                {/* Fat */}
                <View style={styles.targetBarItem}>
                  <View style={styles.targetBarLabelRow}>
                    <Text style={styles.targetBarName}>Fat</Text>
                    <Text style={styles.targetBarRatio}>{fat} / {targets.fats} g</Text>
                    <Text style={styles.targetBarPct}>{Math.round((fat / targets.fats) * 100)}%</Text>
                  </View>
                  <View style={styles.barContainerBg}>
                    <View style={[styles.barFill, { width: `${Math.min(100, (fat / targets.fats) * 100)}%`, backgroundColor: Colors.secondaryContainer }]} />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 3. Highlighted Targets (2-Column Grid Accordion) */}
          <View style={styles.accordionCard}>
            <TouchableOpacity 
              onPress={() => setIsMicrosExpanded(!isMicrosExpanded)} 
              style={styles.accordionHeaderRow}
              activeOpacity={0.7}
            >
              <Text style={styles.accordionTitle}>Highlighted Targets</Text>
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

          {/* 4. Complete Nutrient Summary (Detailed List Accordion) */}
          <View style={styles.accordionCard}>
            <TouchableOpacity 
              onPress={() => setIsAllMicrosExpanded(!isAllMicrosExpanded)} 
              style={styles.accordionHeaderRow}
              activeOpacity={0.7}
            >
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
        </ScrollView>

        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={[styles.saveChangesButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
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
    overflow: 'visible',
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
  detailCardLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.24)',
  },
  stepperBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    width: 44,
    height: 38,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    backgroundColor: '#ffffff',
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.24)',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.24)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  dropdownTriggerText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textTransform: 'capitalize',
  },
  dropdownList: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 999,
    minWidth: 160,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0,0,0,0.4)',
      },
    }),
  },
  dropdownOption: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownOptionActive: {
    backgroundColor: Colors.primaryContainer,
  },
  dropdownOptionText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.semiBold,
    color: Colors.outline,
  },
  dropdownOptionTextActive: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
  },
  pickerRightBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.24)',
  },
  pickerRightText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  validationText: {
    color: Colors.error,
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
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
  targetBarItem: {
    gap: 5,
  },
  targetBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetBarName: {
    fontSize: typography.xs + 1,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  targetBarRatio: {
    fontSize: typography.xs,
    color: Colors.outline,
    flex: 1,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  targetBarPct: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  barContainerBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
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
