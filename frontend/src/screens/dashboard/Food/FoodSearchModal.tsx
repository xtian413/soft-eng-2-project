import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { ArrowLeft, ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import type { GemiFoodItem } from '@/api/foodDatabaseApi';
import type { MealId } from '@/screens/dashboard/types';

type FoodSearchTab = 'All' | 'Custom';

interface FoodSearchModalProps {
  visible: boolean;
  activeMealId: MealId;
  selectedCategory: string;
  searchQuery: string;
  searchResults: GemiFoodItem[];
  selectedItem: GemiFoodItem | null;
  loading: boolean;
  isSaving: boolean;
  configQuantity: number;
  configUnit: string;
  configWeight: number;
  customName: string;
  customCals: string;
  customProtein: string;
  customCarbs: string;
  customFat: string;
  customUnit: string;
  onClose: () => void;
  onBackFromSelected: () => void;
  onSearchQueryChange: (query: string) => void;
  onSelectedCategoryChange: (category: FoodSearchTab) => void;
  onSelectFood: (item: GemiFoodItem) => void;
  onAddSelectedFood: () => void;
  onAddCustomFood: () => void;
  onMealChange: (mealId: MealId) => void;
  setConfigQuantity: (quantity: number) => void;
  setConfigUnit: (unit: string) => void;
  setConfigWeight: (weight: number) => void;
  setCustomName: (value: string) => void;
  setCustomCals: (value: string) => void;
  setCustomProtein: (value: string) => void;
  setCustomCarbs: (value: string) => void;
  setCustomFat: (value: string) => void;
  setCustomUnit: (value: string) => void;
}

const MEAL_OPTIONS: Array<{ id: MealId; label: string }> = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
];

const CUSTOM_UNITS = ['serving', 'portion', 'piece'];

export function FoodSearchModal({
  visible,
  activeMealId,
  selectedCategory,
  searchQuery,
  searchResults,
  selectedItem,
  loading,
  isSaving,
  configQuantity,
  configUnit,
  configWeight,
  customName,
  customCals,
  customProtein,
  customCarbs,
  customFat,
  customUnit,
  onClose,
  onBackFromSelected,
  onSearchQueryChange,
  onSelectedCategoryChange,
  onSelectFood,
  onAddSelectedFood,
  onAddCustomFood,
  onMealChange,
  setConfigQuantity,
  setConfigUnit,
  setConfigWeight,
  setCustomName,
  setCustomCals,
  setCustomProtein,
  setCustomCarbs,
  setCustomFat,
  setCustomUnit,
}: FoodSearchModalProps) {
  const [isEnergyExpanded, setIsEnergyExpanded] = useState(true);
  const [isMacrosExpanded, setIsMacrosExpanded] = useState(true);
  const [isMicrosExpanded, setIsMicrosExpanded] = useState(false);

  const selectedNutrition = useMemo(() => {
    if (!selectedItem) return null;

    const multiplier = configQuantity * (configWeight / 100);
    return {
      calories: Math.round(selectedItem.calories * multiplier),
      protein: Number((selectedItem.protein * multiplier).toFixed(1)),
      carbs: Number((selectedItem.carbs * multiplier).toFixed(1)),
      fat: Number((selectedItem.fat * multiplier).toFixed(1)),
      fiber: Number((selectedItem.fiber * multiplier).toFixed(1)),
      sodium: Math.round(selectedItem.sodium * multiplier),
      potassium: Math.round(selectedItem.potassium * multiplier),
      calcium: Math.round(selectedItem.calcium * multiplier),
      iron: Number((selectedItem.iron * multiplier).toFixed(2)),
      vitaminC: Number((selectedItem.vitaminC * multiplier).toFixed(1)),
      folate: Math.round(selectedItem.folate * multiplier),
    };
  }, [configQuantity, configWeight, selectedItem]);

  const handleClose = () => {
    onClose();
  };

  const renderSkeletonRows = () => (
    <View style={styles.skeletonList}>
      {[0, 1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <View style={styles.skeletonTextStack}>
            <View style={[styles.skeletonLine, { width: '72%' }]} />
            <View style={[styles.skeletonLine, { width: '38%', height: 10 }]} />
            <View style={[styles.skeletonLine, { width: '56%', height: 10 }]} />
          </View>
          <View style={styles.skeletonBadge} />
        </View>
      ))}
    </View>
  );

  const renderFoodResult = ({ item }: { item: GemiFoodItem }) => {
    const servingMultiplier = item.defaultServingSize / 100;
    const servingCals = Math.round(item.calories * servingMultiplier);
    const servingProtein = (item.protein * servingMultiplier).toFixed(1);
    const servingCarbs = (item.carbs * servingMultiplier).toFixed(1);
    const servingFat = (item.fat * servingMultiplier).toFixed(1);

    return (
      <TouchableOpacity
        style={styles.searchResultRow}
        onPress={() => onSelectFood(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Select ${item.name}`}
      >
        <View style={styles.resultTextBlock}>
          <Text style={styles.resultItemName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText} numberOfLines={1}>
              {item.category}
            </Text>
          </View>
          <Text style={styles.resultItemMacros} numberOfLines={1}>
            P {servingProtein}g · C {servingCarbs}g · F {servingFat}g · {item.defaultServingSize}g
          </Text>
        </View>
        <View style={styles.resultItemCalsBadge}>
          <Text style={styles.resultItemCalsText}>{servingCals}</Text>
          <Text style={styles.resultItemCalsLabel}>kcal</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalContainer}>
        {selectedItem === null ? (
          <View style={styles.modalPane}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalEyebrow}>Food Diary</Text>
                <Text style={styles.modalTitle}>Add Food to {activeMealId}</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.iconButton}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Close food search"
              >
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.tabsWrapper}>
              <View style={styles.modalTabsRow}>
                <TouchableOpacity
                  style={[styles.modalTabPill, selectedCategory === 'All' && styles.modalTabPillActive]}
                  onPress={() => onSelectedCategoryChange('All')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === 'All' }}
                >
                  <Text style={[styles.modalTabPillText, selectedCategory === 'All' && styles.modalTabPillTextActive]}>
                    USDA Staples
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalTabPill, selectedCategory === 'Custom' && styles.modalTabPillActive]}
                  onPress={() => onSelectedCategoryChange('Custom')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === 'Custom' }}
                >
                  <Text style={[styles.modalTabPillText, selectedCategory === 'Custom' && styles.modalTabPillTextActive]}>
                    + Custom Food
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedCategory !== 'Custom' ? (
              <View style={styles.resultsPane}>
                <View style={styles.searchBarContainer}>
                  <View style={styles.searchBarWrap}>
                    <Search size={16} color={Colors.outline} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchBarInput}
                      placeholder="Search foods..."
                      value={searchQuery}
                      onChangeText={onSearchQueryChange}
                      placeholderTextColor={Colors.outline}
                      accessibilityLabel="Search food database"
                    />
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.primary} style={styles.searchSpinner} />
                    ) : searchQuery.length > 0 ? (
                      <TouchableOpacity
                        onPress={() => onSearchQueryChange('')}
                        style={styles.searchClearBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Clear food search"
                      >
                        <X size={14} color={Colors.outline} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {loading && searchResults.length === 0 ? (
                  renderSkeletonRows()
                ) : searchResults.length === 0 ? (
                  <View style={styles.emptyStateWrap}>
                    <Search size={32} color={Colors.outline} />
                    <Text style={styles.emptyStateTitle}>
                      {searchQuery.trim() ? `No results for "${searchQuery.trim()}"` : 'Start typing to search foods'}
                    </Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {searchQuery.trim() ? 'Try another name or add a custom food.' : 'Search by name or add a custom entry.'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={renderFoodResult}
                    contentContainerStyle={styles.resultsList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            ) : (
              <ScrollView style={styles.customFoodScroll} contentContainerStyle={styles.customFoodContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.formSectionTitle}>Create custom food entry</Text>
                <View style={styles.customFormField}>
                  <Text style={styles.formInputLabel}>Food Name</Text>
                  <TextInput
                    style={styles.formTextInput}
                    placeholder="e.g. Homemade Protein Cookie"
                    value={customName}
                    onChangeText={setCustomName}
                    placeholderTextColor={Colors.outline}
                    accessibilityLabel="Custom food name"
                  />
                </View>
                <View style={styles.formGrid}>
                  <View style={styles.formGridItem}>
                    <Text style={styles.formInputLabel}>Calories</Text>
                    <TextInput style={styles.formTextInput} placeholder="0" value={customCals} onChangeText={setCustomCals} keyboardType="numeric" placeholderTextColor={Colors.outline} />
                  </View>
                  <View style={styles.formGridItem}>
                    <Text style={styles.formInputLabel}>Protein</Text>
                    <TextInput style={styles.formTextInput} placeholder="0" value={customProtein} onChangeText={setCustomProtein} keyboardType="numeric" placeholderTextColor={Colors.outline} />
                  </View>
                  <View style={styles.formGridItem}>
                    <Text style={styles.formInputLabel}>Carbs</Text>
                    <TextInput style={styles.formTextInput} placeholder="0" value={customCarbs} onChangeText={setCustomCarbs} keyboardType="numeric" placeholderTextColor={Colors.outline} />
                  </View>
                  <View style={styles.formGridItem}>
                    <Text style={styles.formInputLabel}>Fat</Text>
                    <TextInput style={styles.formTextInput} placeholder="0" value={customFat} onChangeText={setCustomFat} keyboardType="numeric" placeholderTextColor={Colors.outline} />
                  </View>
                </View>
                <Text style={styles.formInputLabel}>Serving Unit</Text>
                <View style={styles.unitRow}>
                  {CUSTOM_UNITS.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.unitChip, customUnit === unit && styles.unitChipActive]}
                      onPress={() => setCustomUnit(unit)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: customUnit === unit }}
                    >
                      <Text style={[styles.unitChipText, customUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.formSubmitBtn, (!customName.trim() || isSaving) && styles.disabledButton]}
                  onPress={onAddCustomFood}
                  disabled={!customName.trim() || isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Log custom food"
                >
                  {isSaving ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : <Text style={styles.formSubmitBtnText}>Log Custom Food</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.modalPane}>
            <View style={styles.detailTitleBar}>
              <TouchableOpacity
                onPress={onBackFromSelected}
                style={styles.iconButton}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Back to food results"
              >
                <ArrowLeft size={20} color={Colors.onSurface} />
              </TouchableOpacity>
              <Text style={styles.detailItemTitle} numberOfLines={1}>
                {selectedItem.name}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.iconButton}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Close food search"
              >
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.cardSection}>
                <View style={styles.detailCardRow}>
                  <Text style={styles.detailCardLabel}>Meal</Text>
                  <View style={styles.mealChipRow}>
                    {MEAL_OPTIONS.map((meal) => (
                      <TouchableOpacity
                        key={meal.id}
                        style={[styles.mealChip, activeMealId === meal.id && styles.mealChipActive]}
                        onPress={() => onMealChange(meal.id)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activeMealId === meal.id }}
                      >
                        <Text style={[styles.mealChipText, activeMealId === meal.id && styles.mealChipTextActive]}>{meal.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.detailCardRow}>
                  <Text style={styles.detailCardLabel}>Quantity</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={String(configQuantity)}
                    onChangeText={(value) => setConfigQuantity(Number(value) || 1)}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={Colors.outline}
                    accessibilityLabel="Food quantity"
                  />
                </View>
                <View style={styles.detailCardStacked}>
                  <Text style={styles.detailCardLabel}>Serving</Text>
                  <View style={styles.unitRow}>
                    <TouchableOpacity
                      style={[styles.unitChip, configUnit === selectedItem.defaultServingUnit && styles.unitChipActive]}
                      onPress={() => {
                        setConfigUnit(selectedItem.defaultServingUnit);
                        setConfigWeight(selectedItem.defaultServingSize);
                      }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: configUnit === selectedItem.defaultServingUnit }}
                    >
                      <Text style={[styles.unitChipText, configUnit === selectedItem.defaultServingUnit && styles.unitChipTextActive]}>
                        {selectedItem.defaultServingUnit} ({selectedItem.defaultServingSize}g)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitChip, configUnit === '100g' && styles.unitChipActive]}
                      onPress={() => {
                        setConfigUnit('100g');
                        setConfigWeight(100);
                      }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: configUnit === '100g' }}
                    >
                      <Text style={[styles.unitChipText, configUnit === '100g' && styles.unitChipTextActive]}>100g</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitChip, configUnit === '1g' && styles.unitChipActive]}
                      onPress={() => {
                        setConfigUnit('1g');
                        setConfigWeight(1);
                      }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: configUnit === '1g' }}
                    >
                      <Text style={[styles.unitChipText, configUnit === '1g' && styles.unitChipTextActive]}>1g</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {selectedNutrition && (
                <>
                  <View style={styles.accordionCard}>
                    <TouchableOpacity style={styles.accordionHeaderRow} onPress={() => setIsEnergyExpanded((prev) => !prev)} activeOpacity={0.75}>
                      <Text style={styles.accordionTitle}>Energy Summary</Text>
                      {isEnergyExpanded ? <ChevronUp size={18} color={Colors.onSurface} /> : <ChevronDown size={18} color={Colors.onSurface} />}
                    </TouchableOpacity>
                    {isEnergyExpanded && (
                      <View style={styles.energySummaryRow}>
                        <View style={styles.bigCalorieBadge}>
                          <Text style={styles.bigCalorieValue}>{selectedNutrition.calories}</Text>
                          <Text style={styles.bigCalorieLabel}>kcal</Text>
                        </View>
                        <View style={styles.energyTextBlock}>
                          <Text style={styles.energyTitle}>{configQuantity} {configUnit}</Text>
                          <Text style={styles.energySubtitle}>Nutrition preview for the selected serving.</Text>
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
                      <View style={styles.macroGrid}>
                        <MacroTile label="Protein" value={`${selectedNutrition.protein}g`} color={Colors.proteinAccent} />
                        <MacroTile label="Carbs" value={`${selectedNutrition.carbs}g`} color={Colors.tertiaryFixedDim} />
                        <MacroTile label="Fat" value={`${selectedNutrition.fat}g`} color={Colors.secondaryContainer} />
                      </View>
                    )}
                  </View>

                  <View style={styles.accordionCard}>
                    <TouchableOpacity style={styles.accordionHeaderRow} onPress={() => setIsMicrosExpanded((prev) => !prev)} activeOpacity={0.75}>
                      <Text style={styles.accordionTitle}>Micronutrient Highlights</Text>
                      {isMicrosExpanded ? <ChevronUp size={18} color={Colors.onSurface} /> : <ChevronDown size={18} color={Colors.onSurface} />}
                    </TouchableOpacity>
                    {isMicrosExpanded && (
                      <View style={styles.microList}>
                        <NutrientLine label="Fiber" value={`${selectedNutrition.fiber}g`} />
                        <NutrientLine label="Sodium" value={`${selectedNutrition.sodium}mg`} />
                        <NutrientLine label="Potassium" value={`${selectedNutrition.potassium}mg`} />
                        <NutrientLine label="Calcium" value={`${selectedNutrition.calcium}mg`} />
                        <NutrientLine label="Iron" value={`${selectedNutrition.iron}mg`} />
                        <NutrientLine label="Vitamin C" value={`${selectedNutrition.vitaminC}mg`} />
                        <NutrientLine label="Folate" value={`${selectedNutrition.folate}mcg`} />
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.stickyFooter}>
              <TouchableOpacity
                style={[styles.savePillButton, isSaving && styles.disabledButton]}
                onPress={onAddSelectedFood}
                disabled={isSaving}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Add food to ${activeMealId}`}
              >
                {isSaving ? (
                  <ActivityIndicator color={Colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.savePillButtonText}>ADD TO {activeMealId.toUpperCase()}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function MacroTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.macroTile, { borderLeftColor: color }]}>
      <Text style={styles.macroTileValue}>{value}</Text>
      <Text style={styles.macroTileLabel}>{label}</Text>
    </View>
  );
}

function NutrientLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nutrientLine}>
      <Text style={styles.nutrientLineLabel}>{label}</Text>
      <Text style={styles.nutrientLineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalPane: {
    flex: 1,
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
  modalEyebrow: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textTransform: 'capitalize',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  tabsWrapper: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  modalTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modalTabPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  modalTabPillActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  modalTabPillText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  modalTabPillTextActive: {
    color: Colors.onPrimary,
  },
  resultsPane: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.18)',
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchBarInput: {
    flex: 1,
    minHeight: 42,
    fontSize: typography.sm,
    color: Colors.onSurface,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  searchSpinner: {
    marginLeft: 6,
  },
  searchClearBtn: {
    padding: 4,
    marginLeft: 2,
  },
  resultsList: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.12)',
  },
  resultTextBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  resultItemName: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
    lineHeight: 18,
    marginBottom: 5,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 5,
    maxWidth: '100%',
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurfaceVariant,
  },
  resultItemMacros: {
    fontSize: 10,
    color: Colors.outline,
  },
  resultItemCalsBadge: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    minWidth: 52,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.14)',
  },
  resultItemCalsText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  resultItemCalsLabel: {
    fontSize: 9,
    color: Colors.outline,
    marginTop: -1,
  },
  skeletonList: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.xs,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.12)',
  },
  skeletonTextStack: {
    flex: 1,
    gap: 6,
  },
  skeletonLine: {
    height: 13,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: radius.sm,
  },
  skeletonBadge: {
    width: 52,
    height: 44,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: typography.xs,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 18,
  },
  customFoodScroll: {
    flex: 1,
  },
  customFoodContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  formSectionTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.base,
  },
  customFormField: {
    marginBottom: spacing.base,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  formGridItem: {
    width: '48%',
    marginBottom: spacing.sm,
  },
  formInputLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    marginBottom: spacing.xs,
  },
  formTextInput: {
    minHeight: 44,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sm,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.14)',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  formSubmitBtn: {
    backgroundColor: Colors.primary,
    minHeight: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  formSubmitBtnText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  detailTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.12)',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  detailItemTitle: {
    flex: 1,
    marginHorizontal: spacing.md,
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: 110,
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
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  detailCardStacked: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  detailCardLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  quantityInput: {
    minHeight: 42,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.14)',
    color: Colors.onSurface,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.md,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  mealChipRow: {
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
    borderColor: 'rgba(190, 200, 210, 0.14)',
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
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.14)',
  },
  unitChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  unitChipText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    textTransform: 'capitalize',
  },
  unitChipTextActive: {
    color: Colors.onPrimary,
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
  energySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  bigCalorieBadge: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  bigCalorieValue: {
    fontSize: typography.lg,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
  },
  bigCalorieLabel: {
    fontSize: 10,
    color: Colors.outline,
  },
  energyTextBlock: {
    flex: 1,
    gap: 4,
  },
  energyTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  energySubtitle: {
    fontSize: typography.xs,
    color: Colors.outline,
    lineHeight: 17,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  macroTile: {
    flex: 1,
    minWidth: 92,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  macroTileValue: {
    fontSize: typography.base,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
  },
  macroTileLabel: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 2,
  },
  microList: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  nutrientLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  nutrientLineLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  nutrientLineValue: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurfaceVariant,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.1)',
  },
  savePillButton: {
    backgroundColor: Colors.primary,
    borderRadius: radius.full,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePillButtonText: {
    color: Colors.onPrimary,
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
