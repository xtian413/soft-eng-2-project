import React, { useEffect, useMemo, useState } from 'react';
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
import { ArrowLeft, ChevronDown, ChevronUp, Search, X, Clock, Plus, Minus } from 'lucide-react-native';
import { Svg, Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import type { GemiFoodItem } from '@/api/foodDatabaseApi';
import type { MealId, MacroTargets } from '@/screens/dashboard/types';

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
  targets: MacroTargets;
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
  targets,
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
  const [isMicrosExpanded, setIsMicrosExpanded] = useState(true);
  const [isAllMicrosExpanded, setIsAllMicrosExpanded] = useState(false);
  const [isServingDropdownOpen, setIsServingDropdownOpen] = useState(false);
  const [isMealDropdownOpen, setIsMealDropdownOpen] = useState(false);

  useEffect(() => {
    if (!selectedItem) {
      setIsServingDropdownOpen(false);
      setIsMealDropdownOpen(false);
    }
  }, [selectedItem]);

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
          /* Selected configurator detail overlay */
          <View style={{ flex: 1 }}>
            {/* Custom Top Toolbar */}
            <View style={styles.detailTitleBar}>
              <TouchableOpacity onPress={onBackFromSelected} style={styles.backButton}>
                <ArrowLeft size={20} color={Colors.onSurface} />
              </TouchableOpacity>
              <Text style={styles.detailItemTitle} numberOfLines={1}>
                {selectedItem.name}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
              {/* Portion Selector Box */}
              <View style={styles.cardSection}>
                <View style={styles.detailCardRow}>
                  <Text style={styles.detailCardLabel}>Amount</Text>
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setConfigQuantity(Math.max(0.5, configQuantity - (configQuantity <= 1 ? 0.5 : 1)))}
                      activeOpacity={0.7}
                    >
                      <Minus size={14} color={Colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.stepperInput}
                      value={String(configQuantity)}
                      onChangeText={(v) => {
                        const parsed = parseFloat(v);
                        setConfigQuantity(isNaN(parsed) ? 0 : parsed);
                      }}
                      keyboardType="numeric"
                      placeholderTextColor={Colors.outline}
                      textAlign="center"
                      accessibilityLabel="Food amount quantity"
                    />
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setConfigQuantity(configQuantity + (configQuantity < 1 ? 0.5 : 1))}
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
                      <Text style={styles.dropdownTriggerText}>{configUnit}</Text>
                      <ChevronDown size={14} color={Colors.outline} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                    {isServingDropdownOpen && (
                      <View style={styles.dropdownList}>
                        <TouchableOpacity
                          style={[styles.dropdownOption, configUnit === selectedItem.defaultServingUnit && styles.dropdownOptionActive]}
                          onPress={() => {
                            setConfigUnit(selectedItem.defaultServingUnit);
                            setConfigWeight(selectedItem.defaultServingSize);
                            setIsServingDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownOptionText, configUnit === selectedItem.defaultServingUnit && styles.dropdownOptionTextActive]}>
                            {selectedItem.defaultServingUnit} ({selectedItem.defaultServingSize}g)
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.dropdownOption, configUnit === '100g' && styles.dropdownOptionActive]}
                          onPress={() => {
                            setConfigUnit('100g');
                            setConfigWeight(100);
                            setIsServingDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownOptionText, configUnit === '100g' && styles.dropdownOptionTextActive]}>100g</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.dropdownOption, configUnit === '1g' && styles.dropdownOptionActive]}
                          onPress={() => {
                            setConfigUnit('1g');
                            setConfigWeight(1);
                            setIsServingDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownOptionText, configUnit === '1g' && styles.dropdownOptionTextActive]}>1g</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.detailCardRow}>
                  <Text style={styles.detailCardLabel}>Timestamp</Text>
                  <View style={styles.pickerRightBlock}>
                    <Clock size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.pickerRightText}>Just Now</Text>
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
                        {MEAL_OPTIONS.find((m) => m.id === activeMealId)?.label || activeMealId}
                      </Text>
                      <ChevronDown size={14} color={Colors.outline} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                    {isMealDropdownOpen && (
                      <View style={styles.dropdownList}>
                        {MEAL_OPTIONS.map((opt) => (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.dropdownOption, activeMealId === opt.id && styles.dropdownOptionActive]}
                            onPress={() => {
                              onMealChange(opt.id);
                              setIsMealDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownOptionText, activeMealId === opt.id && styles.dropdownOptionTextActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Recalculate macro details */}
              {(() => {
                const mult = configQuantity * (configWeight / 100);
                const cals = Math.round(selectedItem.calories * mult);
                const prot = Number((selectedItem.protein * mult).toFixed(1));
                const carb = Number((selectedItem.carbs * mult).toFixed(1));
                const fat = Number((selectedItem.fat * mult).toFixed(1));
                const fiber = Number((selectedItem.fiber * mult).toFixed(1));
                const sodium = Math.round(selectedItem.sodium * mult);
                const potassium = Math.round(selectedItem.potassium * mult);
                const calcium = Math.round(selectedItem.calcium * mult);
                const iron = Number((selectedItem.iron * mult).toFixed(2));
                const vitaminC = Number((selectedItem.vitaminC * mult).toFixed(1));
                const folate = Math.round(selectedItem.folate * mult);

                // Circular SVG Logic
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

                return (
                  <>
                    {/* 1. Energy Summary Accordion */}
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

                    {/* 3. Highlighted Targets Accordion */}
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
                          <View style={styles.gridItem}>
                            <View style={styles.gridLabelRow}>
                              <Text style={styles.gridName}>Fiber</Text>
                              <Text style={styles.gridPct}>{Math.round((fiber / 30) * 100)}%</Text>
                            </View>
                            <View style={styles.gridBarBg}>
                              <View style={[styles.gridBarFill, { width: `${Math.min(100, (fiber / 30) * 100)}%`, backgroundColor: Colors.primary }]} />
                            </View>
                          </View>

                          <View style={styles.gridItem}>
                            <View style={styles.gridLabelRow}>
                              <Text style={styles.gridName}>Vitamin C</Text>
                              <Text style={styles.gridPct}>{Math.round((vitaminC / 90) * 100)}%</Text>
                            </View>
                            <View style={styles.gridBarBg}>
                              <View style={[styles.gridBarFill, { width: `${Math.min(100, (vitaminC / 90) * 100)}%`, backgroundColor: Colors.primary }]} />
                            </View>
                          </View>

                          <View style={styles.gridItem}>
                            <View style={styles.gridLabelRow}>
                              <Text style={styles.gridName}>Iron</Text>
                              <Text style={styles.gridPct}>{Math.round((iron / 18) * 100)}%</Text>
                            </View>
                            <View style={styles.gridBarBg}>
                              <View style={[styles.gridBarFill, { width: `${Math.min(100, (iron / 18) * 100)}%`, backgroundColor: Colors.primary }]} />
                            </View>
                          </View>

                          <View style={styles.gridItem}>
                            <View style={styles.gridLabelRow}>
                              <Text style={styles.gridName}>Folate</Text>
                              <Text style={styles.gridPct}>{Math.round((folate / 400) * 100)}%</Text>
                            </View>
                            <View style={styles.gridBarBg}>
                              <View style={[styles.gridBarFill, { width: `${Math.min(100, (folate / 400) * 100)}%`, backgroundColor: Colors.primary }]} />
                            </View>
                          </View>

                          <View style={styles.gridItem}>
                            <View style={styles.gridLabelRow}>
                              <Text style={styles.gridName}>Calcium</Text>
                              <Text style={styles.gridPct}>{Math.round((calcium / 1000) * 100)}%</Text>
                            </View>
                            <View style={styles.gridBarBg}>
                              <View style={[styles.gridBarFill, { width: `${Math.min(100, (calcium / 1000) * 100)}%`, backgroundColor: Colors.primary }]} />
                            </View>
                          </View>

                          <View style={styles.gridItem}>
                            <View style={styles.gridLabelRow}>
                              <Text style={styles.gridName}>Potassium</Text>
                              <Text style={styles.gridPct}>{Math.round((potassium / 3400) * 100)}%</Text>
                            </View>
                            <View style={styles.gridBarBg}>
                              <View style={[styles.gridBarFill, { width: `${Math.min(100, (potassium / 3400) * 100)}%`, backgroundColor: Colors.primary }]} />
                            </View>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* 4. Complete Nutrient Summary Accordion */}
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
                          <Text style={styles.nutrientCategoryHeader}>General</Text>
                          <View style={styles.nutrientListItem}>
                            <View style={styles.nutrientListLabelRow}>
                              <Text style={styles.nutrientListName}>Fiber</Text>
                              <Text style={styles.nutrientListRatio}>{fiber.toFixed(1)} / 30.0 g</Text>
                              <Text style={styles.nutrientListPct}>{Math.round((fiber / 30) * 100)}%</Text>
                            </View>
                            <View style={styles.nutrientBarBg}>
                              <View style={[styles.nutrientBarFill, { width: `${Math.min(100, (fiber / 30) * 100)}%` }]} />
                            </View>
                          </View>

                          <View style={styles.nutrientListItem}>
                            <View style={styles.nutrientListLabelRow}>
                              <Text style={styles.nutrientListName}>Sodium</Text>
                              <Text style={styles.nutrientListRatio}>{sodium} / 2300 mg</Text>
                              <Text style={styles.nutrientListPct}>{Math.round((sodium / 2300) * 100)}%</Text>
                            </View>
                            <View style={styles.nutrientBarBg}>
                              <View style={[styles.nutrientBarFill, { width: `${Math.min(100, (sodium / 2300) * 100)}%` }]} />
                            </View>
                          </View>

                          <Text style={styles.nutrientCategoryHeader}>Minerals</Text>
                          <View style={styles.nutrientListItem}>
                            <View style={styles.nutrientListLabelRow}>
                              <Text style={styles.nutrientListName}>Potassium</Text>
                              <Text style={styles.nutrientListRatio}>{potassium} / 3400 mg</Text>
                              <Text style={styles.nutrientListPct}>{Math.round((potassium / 3400) * 100)}%</Text>
                            </View>
                            <View style={styles.nutrientBarBg}>
                              <View style={[styles.nutrientBarFill, { width: `${Math.min(100, (potassium / 3400) * 100)}%` }]} />
                            </View>
                          </View>

                          <View style={styles.nutrientListItem}>
                            <View style={styles.nutrientListLabelRow}>
                              <Text style={styles.nutrientListName}>Calcium</Text>
                              <Text style={styles.nutrientListRatio}>{calcium} / 1000 mg</Text>
                              <Text style={styles.nutrientListPct}>{Math.round((calcium / 1000) * 100)}%</Text>
                            </View>
                            <View style={styles.nutrientBarBg}>
                              <View style={[styles.nutrientBarFill, { width: `${Math.min(100, (calcium / 1000) * 100)}%` }]} />
                            </View>
                          </View>

                          <View style={styles.nutrientListItem}>
                            <View style={styles.nutrientListLabelRow}>
                              <Text style={styles.nutrientListName}>Iron</Text>
                              <Text style={styles.nutrientListRatio}>{iron.toFixed(2)} / 18.0 mg</Text>
                              <Text style={styles.nutrientListPct}>{Math.round((iron / 18) * 100)}%</Text>
                            </View>
                            <View style={styles.nutrientBarBg}>
                              <View style={[styles.nutrientBarFill, { width: `${Math.min(100, (iron / 18) * 100)}%` }]} />
                            </View>
                          </View>

                          <Text style={styles.nutrientCategoryHeader}>Vitamins</Text>
                          <View style={styles.nutrientListItem}>
                            <View style={styles.nutrientListLabelRow}>
                              <Text style={styles.nutrientListName}>Vitamin C</Text>
                              <Text style={styles.nutrientListRatio}>{vitaminC.toFixed(1)} / 90.0 mg</Text>
                              <Text style={styles.nutrientListPct}>{Math.round((vitaminC / 90) * 100)}%</Text>
                            </View>
                            <View style={styles.nutrientBarBg}>
                              <View style={[styles.nutrientBarFill, { width: `${Math.min(100, (vitaminC / 90) * 100)}%` }]} />
                            </View>
                          </View>

                          <View style={styles.nutrientListItem}>
                            <View style={styles.nutrientListLabelRow}>
                              <Text style={styles.nutrientListName}>Folate</Text>
                              <Text style={styles.nutrientListRatio}>{folate} / 400 µg</Text>
                              <Text style={styles.nutrientListPct}>{Math.round((folate / 400) * 100)}%</Text>
                            </View>
                            <View style={styles.nutrientBarBg}>
                              <View style={[styles.nutrientBarFill, { width: `${Math.min(100, (folate / 400) * 100)}%` }]} />
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  </>
                );
              })()}
            </ScrollView>

            <View style={styles.stickyFooter}>
              <TouchableOpacity
                style={[styles.savePillButton, isSaving && styles.disabledButton]}
                onPress={onAddSelectedFood}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="#0f172a" size="small" />
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  cardSection: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
    overflow: 'visible',
    zIndex: 10,
  },
  detailCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  accordionCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  accordionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
  },
  accordionTitle: {
    fontSize: typography.sm,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  gridBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  nutrientCategoryHeader: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
    marginBottom: 2,
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  nutrientBarFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radius.full,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePillButton: {
    backgroundColor: Colors.primary,
    borderRadius: radius.full,
    width: '100%',
    maxWidth: 400,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: `0px 4px 20px ${Colors.primary}66`,
      },
    }),
  },
  savePillButtonText: {
    color: Colors.onPrimary,
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
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
  disabledButton: {
    opacity: 0.55,
  },
});
