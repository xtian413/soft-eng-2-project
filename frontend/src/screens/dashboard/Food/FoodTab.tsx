import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import { searchFoodDatabase, type GemiFoodItem } from '@/api/foodDatabaseApi';
import {
  createDietLog as createRemoteDietLog,
  deleteDietLog as deleteRemoteDietLog,
  type DietLogCreateInput,
} from '@/api/dietApi';
import {
  foodLogEntryToCreateLocalDietLogInput,
  foodLogEntryToRemoteCreateInput,
  localDietLogToFoodLogEntry,
} from '@/local/dietLogsMapper';
import {
  createDietLog as createLocalDietLog,
  getDietLogByUserAndId,
  markDietLogDeleteSynced,
  markDietLogSyncFailed,
  markDietLogSynced,
  softDeleteDietLog,
} from '@/local/repositories/dietLogsRepository';
import { searchLocalFoods } from '@/local/repositories/foodsRepository';
import type { FoodLogEntry, MacroTargets, MealId } from '@/screens/dashboard/types';
import {
  Coffee,
  Sun,
  Moon,
  Apple,
  Droplet,
  Bed,
  Plus,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
  Info,
  Sparkles,
} from 'lucide-react-native';

interface FoodTabProps {
  userId: string | null;
  foodLogs: FoodLogEntry[];
  setFoodLogs: React.Dispatch<React.SetStateAction<FoodLogEntry[]>>;
  refreshFoodLogs: () => Promise<void>;
  targets: MacroTargets;
  triggerToast: (msg: string) => void;
}

type NutrientSlideType = 'energy' | 'macros' | 'micros';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const responseError = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
    if (responseError) return responseError;

    const message = (error as { message?: string }).message;
    if (message) return message;
  }

  return 'Unknown error';
}

export function FoodTab({
  userId,
  foodLogs,
  setFoodLogs,
  refreshFoodLogs,
  targets,
  triggerToast,
}: FoodTabProps) {
  // Nutrient carousel slide
  const [nutrientSlide, setNutrientSlide] = useState<NutrientSlideType>('energy');

  // Hydration state
  const [waterGlassStates, setWaterGlassStates] = useState<boolean[]>(Array(8).fill(false));
  const [hydrationGoal, setHydrationGoal] = useState(2000); // in ml
  const [isEditingHydration, setIsEditingHydration] = useState(false);
  const [hydrationGoalInput, setHydrationGoalInput] = useState('2000');

  const waterConsumedMl = waterGlassStates.filter(Boolean).length * 250;
  const waterGlassCount = Math.min(12, Math.ceil(hydrationGoal / 250));

  const handleWaterGlassToggle = (idx: number) => {
    setWaterGlassStates((prev) => {
      const next = [...prev];
      if (idx < next.length) {
        next[idx] = !next[idx];
      }
      return next;
    });
  };

  // Adjust glass states when goal is changed
  const updateHydrationGoal = (ml: number) => {
    setHydrationGoal(ml);
    const count = Math.min(12, Math.ceil(ml / 250));
    setWaterGlassStates(Array(count).fill(false));
    setIsEditingHydration(false);
    triggerToast(`Hydration target updated to ${(ml / 1000).toFixed(2)}L!`);
  };

  // Sleep state
  const [bedtime, setBedtime] = useState('23:00');
  const [waketime, setWaketime] = useState('06:30');

  // Compute sleep hours
  const sleepHours = useMemo(() => {
    try {
      const [bh, bm] = bedtime.split(':').map(Number);
      const [wh, wm] = waketime.split(':').map(Number);
      let diffMins = (wh * 60 + wm) - (bh * 60 + bm);
      if (diffMins < 0) diffMins += 24 * 60;
      return Number((diffMins / 60).toFixed(1));
    } catch {
      return 8.0;
    }
  }, [bedtime, waketime]);

  // Sleep quality calculations
  const sleepMetrics = useMemo(() => {
    let sleepQuality = 'Optimal';
    let sleepQualityColor = '#10b981'; // emerald
    if (sleepHours < 6) {
      sleepQuality = 'Poor';
      sleepQualityColor = '#ef4444'; // red
    } else if (sleepHours < 7.5) {
      sleepQuality = 'Fair';
      sleepQualityColor = '#f59e0b'; // amber
    }
    return { sleepQuality, sleepQualityColor };
  }, [sleepHours]);

  // Natural Language Input
  const [aiInput, setAiInput] = useState('');

  // Modal search state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMealId, setActiveMealId] = useState<MealId>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dbList, setDbList] = useState<GemiFoodItem[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Modal Item Detail Configurator
  const [selectedItem, setSelectedItem] = useState<GemiFoodItem | null>(null);
  const [configQuantity, setConfigQuantity] = useState(1);
  const [configUnit, setConfigUnit] = useState('portion');
  const [configWeight, setConfigWeight] = useState(100);
  const latestSearchRef = useRef(0);

  // Viewing Logged Item Detail Modal State
  const [viewingLoggedItem, setViewingLoggedItem] = useState<FoodLogEntry | null>(null);

  // Tracks when a log/delete API call is in-flight so I can disable the button.
  const [isSavingLog, setIsSavingLog] = useState(false);

  const syncCreatedDietLogToRemote = useCallback(
    async (localId: string, remoteInput: DietLogCreateInput) => {
      if (!userId) return;

      try {
        const remoteLog = await createRemoteDietLog(remoteInput);
        await markDietLogSynced(userId, localId, remoteLog.id);
        await refreshFoodLogs();
      } catch (error) {
        const message = getErrorMessage(error);
        console.error('[Gemi] Failed to sync local diet log to backend:', message);
        await markDietLogSyncFailed(userId, localId).catch((markError) => {
          console.error('[Gemi] Failed to mark local diet log sync failed:', markError);
        });
        triggerToast(`Saved locally. Remote sync pending: ${message}`);
      }
    },
    [refreshFoodLogs, triggerToast, userId]
  );

  const saveDietLogLocalFirst = useCallback(
    async (
      entry: FoodLogEntry,
      loggedAt: string,
      sourceFoodId: string | null,
      successMessage: string
    ) => {
      if (!userId) {
        triggerToast('Please log in before saving food logs.');
        return null;
      }

      const localLog = await createLocalDietLog(
        foodLogEntryToCreateLocalDietLogInput(userId, entry, loggedAt, sourceFoodId)
      );
      const localEntry = localDietLogToFoodLogEntry(localLog, entry.mealId);
      const remoteInput = foodLogEntryToRemoteCreateInput(entry, loggedAt);

      setFoodLogs((prev) => [...prev, localEntry]);
      triggerToast(successMessage);
      void syncCreatedDietLogToRemote(localLog.id, remoteInput);

      return localEntry;
    },
    [setFoodLogs, syncCreatedDietLogToRemote, triggerToast, userId]
  );

  // Custom Food Form
  const [customName, setCustomName] = useState('');
  const [customCals, setCustomCals] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customUnit, setCustomUnit] = useState('serving');
  const [customWeight, setCustomWeight] = useState('100');

  // Load food database results locally first, then fall back to the backend.
  const loadFoodResults = useCallback(async (query: string) => {
    const requestId = ++latestSearchRef.current;
    setIsLoadingDb(true);
    try {
      const trimmedQuery = query.trim();
      const limit = trimmedQuery ? 50 : 15;
      const localResults = await searchLocalFoods(trimmedQuery, limit).catch((error) => {
        const message = getErrorMessage(error);
        console.warn('[FoodTab] Local food search failed:', message);
        return [];
      });

      if (requestId !== latestSearchRef.current) return;

      console.log(`[FoodTab] Local food results: ${localResults.length}`);
      if (localResults.length > 0) {
        setDbList(localResults);
        console.log('[FoodTab] Backend food fallback skipped: local results available');
        return;
      }

      const list = await searchFoodDatabase({
        query: trimmedQuery || undefined,
        limit,
      });
      if (requestId === latestSearchRef.current) {
        setDbList(list);
      }
    } catch (err) {
      if (requestId === latestSearchRef.current) {
        const message = getErrorMessage(err);
        console.warn('[FoodTab] Backend food fallback skipped or failed:', message);
        setDbList([]);
      }
    } finally {
      if (requestId === latestSearchRef.current) {
        setIsLoadingDb(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isModalOpen || selectedCategory === 'Custom') return;
    const delay = searchQuery.trim() ? 250 : 0;
    const timer = setTimeout(() => {
      loadFoodResults(searchQuery);
    }, delay);
    return () => clearTimeout(timer);
  }, [isModalOpen, searchQuery, selectedCategory, loadFoodResults]);

  // Derived macros totals
  const proteinTotal = Number(foodLogs.reduce((acc, f) => acc + f.protein, 0).toFixed(1));
  const carbsTotal = Number(foodLogs.reduce((acc, f) => acc + f.carbs, 0).toFixed(1));
  const fatsTotal = Number(foodLogs.reduce((acc, f) => acc + f.fat, 0).toFixed(1));
  const caloriesEaten = Math.round(foodLogs.reduce((acc, x) => acc + x.calories, 0));

  const proteinPercent = Math.min(100, (proteinTotal / targets.protein) * 100);
  const carbsPercent = Math.min(100, (carbsTotal / targets.carbs) * 100);
  const fatsPercent = Math.min(100, (fatsTotal / targets.fats) * 100);

  // Derived micronutrients
  const fiberTotal = Number(foodLogs.reduce((acc, f) => acc + (f.fiber || 0), 0).toFixed(1));
  const sodiumTotal = Math.round(foodLogs.reduce((acc, f) => acc + (f.sodium || 0), 0));
  const potassiumTotal = Math.round(foodLogs.reduce((acc, f) => acc + (f.potassium || 0), 0));
  const calciumTotal = Math.round(foodLogs.reduce((acc, f) => acc + (f.calcium || 0), 0));
  const ironTotal = Number(foodLogs.reduce((acc, f) => acc + (f.iron || 0), 0).toFixed(1));
  const vitaminCTotal = Number(foodLogs.reduce((acc, f) => acc + (f.vitaminC || 0), 0).toFixed(1));

  // Handle Natural Language quick logging
  const handleAiQuickLog = () => {
    if (!aiInput.trim()) return;
    const q = aiInput.toLowerCase();
    let matchedFood: Partial<FoodLogEntry> | null = null;
    let qty = 1;

    // Local mock queries matching web staple keywords
    if (q.includes('egg')) {
      matchedFood = { name: 'Boiled Egg', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, sodium: 62 };
      const m = q.match(/(\d+)\s*egg/);
      if (m) qty = Number(m[1]);
    } else if (q.includes('toast') || q.includes('bread')) {
      matchedFood = { name: 'Whole Wheat Toast (slice)', calories: 80, protein: 4.0, carbs: 15.0, fat: 1.0, fiber: 2.0, sodium: 130 };
      const m = q.match(/(\d+)\s*(toast|slice|bread)/);
      if (m) qty = Number(m[1]);
    } else if (q.includes('hummus')) {
      matchedFood = { name: 'Hummus commercial', calories: 177, protein: 4.8, carbs: 8.6, fat: 14.3, fiber: 4.0, sodium: 300 };
    } else if (q.includes('chicken') || q.includes('breast')) {
      matchedFood = { name: 'Chicken breast grilled', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, fiber: 0, sodium: 74 };
    } else if (q.includes('salmon') || q.includes('fish')) {
      matchedFood = { name: 'Oven Baked Salmon', calories: 200, protein: 22.0, carbs: 0.0, fat: 12.0, fiber: 0, sodium: 60 };
    }

    if (matchedFood) {
      const entry: FoodLogEntry = {
        id: `ai_${Date.now()}`,
        name: matchedFood.name || 'Quick Logged Item',
        mealId: 'snack',
        calories: Math.round((matchedFood.calories || 0) * qty),
        protein: Number(((matchedFood.protein || 0) * qty).toFixed(1)),
        carbs: Number(((matchedFood.carbs || 0) * qty).toFixed(1)),
        fat: Number(((matchedFood.fat || 0) * qty).toFixed(1)),
        fiber: Number(((matchedFood.fiber || 0) * qty).toFixed(1)),
        sodium: Math.round((matchedFood.sodium || 0) * qty),
        potassium: 100 * qty,
        calcium: 20 * qty,
        iron: 0.5 * qty,
        vitaminC: 0,
        folate: 0,
        servingSize: qty,
        servingUnit: 'portion',
      };
      setFoodLogs((prev) => [...prev, entry]);
      setAiInput('');
      triggerToast(`AI Parser: Logged ${entry.name} x${qty} (+${entry.calories} kcal)`);
    } else {
      triggerToast("AI Parser: Try '2 eggs' or 'chicken breast'");
    }
  };

  const handleOpenSearchModal = (meal: MealId) => {
    setActiveMealId(meal);
    setIsModalOpen(true);
  };

  const handleSelectSearchItem = (item: GemiFoodItem) => {
    setSelectedItem(item);
    setConfigQuantity(1);
    setConfigUnit(item.defaultServingUnit);
    setConfigWeight(item.defaultServingSize);
  };

  // Saves the selected USDA food locally first, then attempts the existing backend save.
  const logSelectedItem = async () => {
    if (!selectedItem || isSavingLog) return;
    const multiplier = configQuantity * (configWeight / 100);
    const loggedAt = new Date().toISOString();
    const entry: FoodLogEntry = {
      id: `usda_${Date.now()}`,
      name: selectedItem.name,
      mealId: activeMealId,
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
      servingSize: configQuantity,
      servingUnit: configUnit,
    };

    setIsSavingLog(true);
    try {
      await saveDietLogLocalFirst(
        entry,
        loggedAt,
        selectedItem.id,
        `Logged to ${activeMealId}: ${entry.name}`
      );
      setSelectedItem(null);
      setIsModalOpen(false);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('[Gemi] Failed to save local diet log:', message);
      triggerToast(`Failed to save: ${message}`);
    } finally {
      setIsSavingLog(false);
    }
  };

  // Saves a custom food entry locally first, then attempts the existing backend save.
  const handleAddCustomFood = async () => {
    if (!customName.trim() || isSavingLog) return;
    const loggedAt = new Date().toISOString();
    const entry: FoodLogEntry = {
      id: `custom_${Date.now()}`,
      name: customName,
      mealId: activeMealId,
      calories: Math.round(Number(customCals) || 0),
      protein: Number(customProtein) || 0,
      carbs: Number(customCarbs) || 0,
      fat: Number(customFat) || 0,
      fiber: 0,
      sodium: 0,
      potassium: 0,
      calcium: 0,
      iron: 0,
      vitaminC: 0,
      folate: 0,
      servingSize: 1,
      servingUnit: customUnit,
    };

    setIsSavingLog(true);
    try {
      await saveDietLogLocalFirst(entry, loggedAt, null, `Logged custom food: ${entry.name}`);
      setCustomName('');
      setCustomCals('');
      setCustomProtein('');
      setCustomCarbs('');
      setCustomFat('');
      setIsModalOpen(false);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('[Gemi] Failed to save local custom food log:', message);
      triggerToast(`Failed to save: ${message}`);
    } finally {
      setIsSavingLog(false);
    }
  };

  // Soft-deletes a local log first, then attempts the existing backend delete if a remote row exists.
  const handleDeleteEntry = async (id: string) => {
    if (!userId) {
      triggerToast('Please log in before deleting food logs.');
      return;
    }

    try {
      const localLog = await getDietLogByUserAndId(userId, id);
      if (!localLog) {
        throw new Error('Diet log was not found for the current user.');
      }

      await softDeleteDietLog(userId, id);
      setFoodLogs((prev) => prev.filter((x) => x.id !== id));
      setViewingLoggedItem((current) => (current?.id === id ? null : current));
      triggerToast('Logged food entry deleted');

      const remoteId = localLog.remote_id;
      if (remoteId) {
        void (async () => {
          try {
            await deleteRemoteDietLog(remoteId);
            await markDietLogDeleteSynced(userId, id);
          } catch (error) {
            console.error('[Gemi] Failed to sync diet-log delete to backend:', getErrorMessage(error));
          }
        })();
      }
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('[Gemi] Failed to delete diet log:', message);
      triggerToast(`Delete failed: ${message}`);
    }
  };

  const renderMealIcon = (mealId: MealId) => {
    switch (mealId) {
      case 'breakfast':
        return <Coffee size={18} color="#fd761a" style={styles.mealIcon} />;
      case 'lunch':
        return <Sun size={18} color="#eab308" style={styles.mealIcon} />;
      case 'dinner':
        return <Moon size={18} color="#6366f1" style={styles.mealIcon} />;
      default:
        return <Apple size={18} color="#22c55e" style={styles.mealIcon} />;
    }
  };

  // Meal defs
  const mealDefs: { id: MealId; name: string }[] = [
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'lunch',     name: 'Lunch' },
    { id: 'dinner',    name: 'Dinner' },
    { id: 'snack',     name: 'Snacks & Extras' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Scrollable Nutrient Targets Panel */}
        <View style={styles.carouselContainer}>
          <View style={styles.carouselHeader}>
            <Text style={styles.carouselHeaderTitle}>
              {nutrientSlide === 'energy' && 'Daily Energy Balance'}
              {nutrientSlide === 'macros' && 'Daily Macronutrients'}
              {nutrientSlide === 'micros' && 'Daily Micronutrient Highlights'}
            </Text>

            <View style={styles.carouselArrows}>
              <TouchableOpacity
                onPress={() =>
                  setNutrientSlide((p) => (p === 'energy' ? 'micros' : p === 'macros' ? 'energy' : 'macros'))
                }
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
                onPress={() =>
                  setNutrientSlide((p) => (p === 'energy' ? 'macros' : p === 'macros' ? 'micros' : 'energy'))
                }
                style={styles.arrowBtn}
                accessibilityRole="button"
                accessibilityLabel="Next nutrition summary"
                hitSlop={8}
              >
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Slide 1: Energy rings */}
          {nutrientSlide === 'energy' && (
            <View style={styles.energyRingsRow}>
              {/* Target */}
              <View style={styles.ringCol}>
                <Svg width="70" height="70" viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="42" stroke="#e5eeff" strokeWidth="8" fill="transparent" />
                  <Circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke={Colors.primary}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={263.8}
                    strokeDashoffset={0}
                  />
                </Svg>
                <View style={styles.miniRingLabel}>
                  <Text style={styles.miniRingNum}>{targets.calories}</Text>
                  <Text style={styles.miniRingDesc}>Target</Text>
                </View>
              </View>

              {/* Consumed */}
              <View style={styles.ringCol}>
                <Svg width="70" height="70" viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="42" stroke="#e5eeff" strokeWidth="8" fill="transparent" />
                  <Circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke={Colors.primaryContainer}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={263.8}
                    strokeDashoffset={263.8 - (263.8 * Math.min(100, (caloriesEaten / targets.calories) * 100)) / 100}
                    transform="rotate(-90 50 50)"
                  />
                </Svg>
                <View style={styles.miniRingLabel}>
                  <Text style={styles.miniRingNum}>{caloriesEaten}</Text>
                  <Text style={styles.miniRingDesc}>Eaten</Text>
                </View>
              </View>

              {/* Remaining */}
              <View style={styles.ringCol}>
                <Svg width="70" height="70" viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="42" stroke="#e5eeff" strokeWidth="8" fill="transparent" />
                  <Circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke={Colors.secondaryContainer}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={263.8}
                    strokeDashoffset={263.8 - (263.8 * Math.min(100, (Math.max(0, targets.calories - caloriesEaten) / targets.calories) * 100)) / 100}
                    transform="rotate(-90 50 50)"
                  />
                </Svg>
                <View style={styles.miniRingLabel}>
                  <Text style={styles.miniRingNum}>{Math.max(0, targets.calories - caloriesEaten)}</Text>
                  <Text style={styles.miniRingDesc}>Left</Text>
                </View>
              </View>
            </View>
          )}

          {/* Slide 2: Macronutrients summary */}
          {nutrientSlide === 'macros' && (
            <View style={styles.macrosProgressWrap}>
              <View style={styles.macroProgressRow}>
                <Text style={styles.macroLabel}>Protein ({Math.round(proteinTotal)}g / {targets.protein}g)</Text>
                <View style={styles.progressLineBg}>
                  <View style={[styles.progressLineFill, { width: `${proteinPercent}%`, backgroundColor: Colors.proteinAccent }]} />
                </View>
              </View>
              <View style={styles.macroProgressRow}>
                <Text style={styles.macroLabel}>Carbs ({Math.round(carbsTotal)}g / {targets.carbs}g)</Text>
                <View style={styles.progressLineBg}>
                  <View style={[styles.progressLineFill, { width: `${carbsPercent}%`, backgroundColor: Colors.tertiaryFixedDim }]} />
                </View>
              </View>
              <View style={styles.macroProgressRow}>
                <Text style={styles.macroLabel}>Fats ({Math.round(fatsTotal)}g / {targets.fats}g)</Text>
                <View style={styles.progressLineBg}>
                  <View style={[styles.progressLineFill, { width: `${fatsPercent}%`, backgroundColor: Colors.secondaryContainer }]} />
                </View>
              </View>
            </View>
          )}

          {/* Slide 3: Micronutrients tracking */}
          {nutrientSlide === 'micros' && (
            <View style={styles.microsGrid}>
              <View style={styles.microBox}>
                <Text style={styles.microVal}>{fiberTotal}g</Text>
                <Text style={styles.microName}>Fiber</Text>
              </View>
              <View style={styles.microBox}>
                <Text style={styles.microVal}>{sodiumTotal}mg</Text>
                <Text style={styles.microName}>Sodium</Text>
              </View>
              <View style={styles.microBox}>
                <Text style={styles.microVal}>{potassiumTotal}mg</Text>
                <Text style={styles.microName}>Potassium</Text>
              </View>
              <View style={styles.microBox}>
                <Text style={styles.microVal}>{calciumTotal}mg</Text>
                <Text style={styles.microName}>Calcium</Text>
              </View>
              <View style={styles.microBox}>
                <Text style={styles.microVal}>{ironTotal}mg</Text>
                <Text style={styles.microName}>Iron</Text>
              </View>
              <View style={styles.microBox}>
                <Text style={styles.microVal}>{vitaminCTotal}mg</Text>
                <Text style={styles.microName}>Vit C</Text>
              </View>
            </View>
          )}
        </View>

        {/* AI Natural Language Log Card */}
        <View style={styles.aiLogCard}>
          <View style={styles.aiLogHeader}>
            <Sparkles size={14} color={Colors.primaryContainer} />
            <Text style={styles.aiLogTitle}>AI QUICK PARSER</Text>
          </View>
          <View style={styles.aiLogInputRow}>
            <TextInput
              style={styles.aiLogInput}
              placeholder="e.g. '2 boiled eggs' or 'chicken breast'"
              placeholderTextColor={Colors.outline}
              value={aiInput}
              onChangeText={setAiInput}
              accessibilityLabel="Quick food log input"
            />
            <TouchableOpacity
              style={styles.aiLogBtn}
              onPress={handleAiQuickLog}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Log quick food"
            >
              <Text style={styles.aiLogBtnText}>Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Meal Diary Sections */}
        {mealDefs.map((meal) => {
          const logged = foodLogs.filter((x) => x.mealId === meal.id);
          const mealCals = Math.round(logged.reduce((s, x) => s + x.calories, 0));

          return (
            <View key={meal.id} style={styles.mealSectionCard}>
              <View style={styles.mealSectionHeader}>
                <View style={styles.mealHeaderTitleGroup}>
                  {renderMealIcon(meal.id)}
                  <View>
                    <Text style={styles.mealSectionName}>{meal.name}</Text>
                    <Text style={styles.mealSectionSubtext}>
                      {logged.length} items · {mealCals} kcal logged
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.mealAddCircleBtn}
                  onPress={() => handleOpenSearchModal(meal.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Add food to ${meal.name}`}
                  hitSlop={8}
                >
                  <Plus size={14} color={Colors.primaryContainer} strokeWidth={3} />
                </TouchableOpacity>
              </View>

              {/* Logged Item Sub-rows */}
              {logged.length > 0 && (
                <View style={styles.loggedRowsList}>
                  {logged.map((entry) => (
                    <View key={entry.id} style={styles.loggedRow}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setViewingLoggedItem(entry)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`View details for ${entry.name}`}
                      >
                        <Text style={styles.loggedRowName}>{entry.name}</Text>
                        <Text style={styles.loggedRowMacros}>
                          {entry.servingSize} {entry.servingUnit} · {entry.calories} kcal · {entry.protein}P · {entry.carbs}C · {entry.fat}F · Tap for details
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteRowBtn}
                        onPress={() => handleDeleteEntry(entry.id)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${entry.name}`}
                        hitSlop={8}
                      >
                        <Trash2 size={14} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Hydration Tracker */}
        <View style={styles.hydrationCard}>
          <View style={styles.hydrationHeader}>
            <View style={styles.cardTitleRow}>
              <Droplet size={14} color={Colors.primary} fill={Colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.cardTitle}>DAILY HYDRATION</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.hydrationGoalLabel}>Goal: {(hydrationGoal / 1000).toFixed(2)}L</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsEditingHydration(true);
                  setHydrationGoalInput(String(hydrationGoal));
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Edit hydration goal"
              >
                <Edit2 size={12} color={Colors.outline} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline goal selector */}
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
                    accessibilityLabel={`Set hydration goal to ${ml} milliliters`}
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
                  placeholder="Custom mL (e.g. 3500)"
                  placeholderTextColor={Colors.outline}
                  value={hydrationGoalInput}
                  onChangeText={setHydrationGoalInput}
                  accessibilityLabel="Custom hydration goal in milliliters"
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
                  accessibilityLabel="Set custom hydration goal"
                >
                  <Text style={styles.customGoalBtnText}>Set</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.customGoalClose}
                  onPress={() => setIsEditingHydration(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close hydration goal editor"
                  hitSlop={8}
                >
                  <X size={18} color={Colors.outline} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.hydrationSubtext}>
            {waterConsumedMl.toLocaleString()} ml logged / {waterGlassCount} glasses
          </Text>

          {/* Fluid hydration progress indicator line */}
          <View style={styles.hydrationProgressContainer}>
            <View
              style={[
                styles.hydrationProgressFill,
                { width: `${Math.min(100, (waterConsumedMl / hydrationGoal) * 100)}%` },
              ]}
            />
          </View>

          <View style={styles.glassRow}>
            {Array.from({ length: waterGlassCount }).map((_, idx) => {
              const filled = waterGlassStates[idx] === true;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.glassBtn, filled && styles.glassBtnFilled]}
                  onPress={() => {
                    handleWaterGlassToggle(idx);
                    if (idx + 1 === waterGlassCount && !filled) {
                      triggerToast('Perfect daily hydration met!');
                    }
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${filled ? 'Remove' : 'Add'} water glass ${idx + 1}`}
                  accessibilityState={{ checked: filled }}
                >
                  <Droplet
                    size={16}
                    color={filled ? '#0ea5e9' : 'rgba(110, 120, 129, 0.4)'}
                    fill={filled ? '#0ea5e9' : 'transparent'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sleep Tracker Card */}
        <View style={styles.card}>
          <View style={styles.sleepHeader}>
            <View style={styles.cardTitleRow}>
              <Bed size={14} color="#8b5cf6" style={{ marginRight: 4 }} />
              <Text style={styles.cardTitle}>SLEEP TRACKER</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.sleepHoursText, { color: sleepMetrics.sleepQualityColor }]}>
                {sleepHours} hrs
              </Text>
              <Text style={[styles.sleepQualityText, { color: sleepMetrics.sleepQualityColor }]}>
                {sleepMetrics.sleepQuality}
              </Text>
            </View>
          </View>

          <Text style={styles.sleepSubtext}>Daily recovery target: 8.0 hrs · last night → morning</Text>

          {/* Sleep pickers */}
          <View style={styles.sleepInputsRow}>
            <View style={styles.sleepInputCol}>
              <Text style={styles.sleepInputLabel}>Slept at (last night)</Text>
              <TextInput
                style={styles.sleepTextInput}
                value={bedtime}
                onChangeText={setBedtime}
                placeholder="23:00"
                placeholderTextColor={Colors.outline}
                accessibilityLabel="Sleep start time"
              />
            </View>
            <View style={styles.sleepInputCol}>
              <Text style={styles.sleepInputLabel}>Woke up (morning)</Text>
              <TextInput
                style={styles.sleepTextInput}
                value={waketime}
                onChangeText={setWaketime}
                placeholder="06:30"
                placeholderTextColor={Colors.outline}
                accessibilityLabel="Wake time"
              />
            </View>
          </View>

          {/* Sleep recovery progress bar */}
          <View style={styles.sleepBarRow}>
            <View style={styles.sleepProgressBg}>
              <View
                style={[
                  styles.sleepProgressFill,
                  {
                    width: `${Math.min(100, (sleepHours / 9) * 100)}%`,
                    backgroundColor: sleepMetrics.sleepQualityColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.sleepGoalLabelText}>Goal: 8h</Text>
          </View>

          {sleepHours < 6 && (
            <View style={styles.sleepWarningRow}>
              <Info size={13} color="#ef4444" style={{ marginRight: 6 }} />
              <Text style={styles.sleepWarningText}>
                Less than 6h — recovery may be impaired. Aim for 7–9h.
              </Text>
            </View>
          )}
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyWrap}>
          <View style={styles.privacyRow}>
            <Lock size={12} color={Colors.outline} style={{ marginRight: 6 }} />
            <Text style={styles.privacyText}>Food search results are fetched from the backend. Logged entries stay on this device.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Database Search & Modal Sheet */}
      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalOpen(false)}>
        <SafeAreaView style={styles.modalContainer}>
          {selectedItem === null ? (
            <View style={styles.modalBody}>
              {/* Modal Title bar */}
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Add Food to {activeMealId}</Text>
                <TouchableOpacity
                  onPress={() => setIsModalOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close food search"
                  hitSlop={8}
                >
                  <Text style={styles.closeModalText}>Close</Text>
                </TouchableOpacity>
              </View>

              {/* Tab Selector */}
              <View style={styles.modalTabsRow}>
                <TouchableOpacity
                  style={[styles.modalTabPill, selectedCategory === 'All' && styles.modalTabPillActive]}
                  onPress={() => setSelectedCategory('All')}
                  accessibilityRole="button"
                  accessibilityLabel="Show USDA staples"
                  accessibilityState={{ selected: selectedCategory === 'All' }}
                >
                  <Text style={[styles.modalTabPillText, selectedCategory === 'All' && styles.modalTabPillTextActive]}>USDA Staples</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalTabPill, selectedCategory === 'Custom' && styles.modalTabPillActive]}
                  onPress={() => setSelectedCategory('Custom')}
                  accessibilityRole="button"
                  accessibilityLabel="Create custom food"
                  accessibilityState={{ selected: selectedCategory === 'Custom' }}
                >
                  <Text style={[styles.modalTabPillText, selectedCategory === 'Custom' && styles.modalTabPillTextActive]}>+ Custom Food</Text>
                </TouchableOpacity>
              </View>

              {selectedCategory !== 'Custom' ? (
                <>
                  {/* Search Field */}
                  <View style={styles.searchBarContainer}>
                    <TextInput
                      style={styles.searchBarInput}
                      placeholder="Search USDA database..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={Colors.outline}
                      accessibilityLabel="Search food database"
                    />
                  </View>

                  {/* Results List */}
                  {isLoadingDb ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                  ) : (
                    <FlatList
                      data={dbList}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.searchResultRow}
                          onPress={() => handleSelectSearchItem(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${item.name}`}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resultItemName}>{item.name}</Text>
                            <Text style={styles.resultItemCategory}>{item.category}</Text>
                            <Text style={styles.resultItemMacros}>
                              P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g (per 100g)
                            </Text>
                          </View>
                          <View style={styles.resultItemCalsBadge}>
                            <Text style={styles.resultItemCalsText}>{item.calories}</Text>
                            <Text style={styles.resultItemCalsLabel}>kcal</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </>
              ) : (
                /* Custom Food Form */
                <ScrollView style={styles.customFoodScroll}>
                  <Text style={styles.formSectionTitle}>Create reusable custom food entry:</Text>
                  <View style={styles.customFormField}>
                    <Text style={styles.formInputLabel}>Food Name</Text>
                    <TextInput style={styles.formTextInput} placeholder="e.g. Homemade Protein Cookie" value={customName} onChangeText={setCustomName} accessibilityLabel="Custom food name" />
                  </View>
                  <View style={styles.customFormField}>
                    <Text style={styles.formInputLabel}>Calories (kcal)</Text>
                    <TextInput style={styles.formTextInput} placeholder="0" value={customCals} onChangeText={setCustomCals} keyboardType="numeric" accessibilityLabel="Custom food calories" />
                  </View>
                  <View style={styles.customFormField}>
                    <Text style={styles.formInputLabel}>Protein (g)</Text>
                    <TextInput style={styles.formTextInput} placeholder="0" value={customProtein} onChangeText={setCustomProtein} keyboardType="numeric" accessibilityLabel="Custom food protein grams" />
                  </View>
                  <View style={styles.customFormField}>
                    <Text style={styles.formInputLabel}>Carbohydrates (g)</Text>
                    <TextInput style={styles.formTextInput} placeholder="0" value={customCarbs} onChangeText={setCustomCarbs} keyboardType="numeric" accessibilityLabel="Custom food carbohydrates grams" />
                  </View>
                  <View style={styles.customFormField}>
                    <Text style={styles.formInputLabel}>Fat (g)</Text>
                    <TextInput style={styles.formTextInput} placeholder="0" value={customFat} onChangeText={setCustomFat} keyboardType="numeric" accessibilityLabel="Custom food fat grams" />
                  </View>
                  <TouchableOpacity
                    style={styles.formSubmitBtn}
                    onPress={handleAddCustomFood}
                    accessibilityRole="button"
                    accessibilityLabel="Log custom food"
                  >
                    <Text style={styles.formSubmitBtnText}>Log Custom Food</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          ) : (
            /* Selected configurator detail overlay */
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailTitleBar}>
                <TouchableOpacity
                  onPress={() => setSelectedItem(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Back to food results"
                >
                  <Text style={styles.detailBackText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={styles.detailItemTitle} numberOfLines={1}>{selectedItem.name}</Text>
              </View>

              {/* Quantity config */}
              <View style={styles.portionSection}>
                <Text style={styles.sectionHeading}>Portion Configurator:</Text>
                <View style={styles.portionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>{configUnit === '1g' ? 'Grams:' : 'Quantity (Servings)'}</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={String(configQuantity)}
                      onChangeText={(v) => setConfigQuantity(Number(v) || 1)}
                      keyboardType="numeric"
                      accessibilityLabel="Food quantity"
                    />
                  </View>
                  <View style={{ flex: 1.5, marginLeft: spacing.md }}>
                    <Text style={styles.formInputLabel}>Serving Unit</Text>
                    <View style={styles.servingUnitsRow}>
                      <TouchableOpacity
                        style={[styles.unitChip, configUnit === selectedItem.defaultServingUnit && styles.unitChipActive]}
                        onPress={() => { setConfigUnit(selectedItem.defaultServingUnit); setConfigWeight(selectedItem.defaultServingSize); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${selectedItem.defaultServingUnit}`}
                        accessibilityState={{ selected: configUnit === selectedItem.defaultServingUnit }}
                      >
                        <Text style={[styles.unitChipText, configUnit === selectedItem.defaultServingUnit && styles.unitChipTextActive]}>{selectedItem.defaultServingUnit} ({selectedItem.defaultServingSize}g)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitChip, configUnit === '100g' && styles.unitChipActive]}
                        onPress={() => { setConfigUnit('100g'); setConfigWeight(100); }}
                        accessibilityRole="button"
                        accessibilityLabel="Use 100 grams"
                        accessibilityState={{ selected: configUnit === '100g' }}
                      >
                        <Text style={[styles.unitChipText, configUnit === '100g' && styles.unitChipTextActive]}>100g</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitChip, configUnit === '1g' && styles.unitChipActive]}
                        onPress={() => { setConfigUnit('1g'); setConfigWeight(1); }}
                        accessibilityRole="button"
                        accessibilityLabel="Use 1 gram"
                        accessibilityState={{ selected: configUnit === '1g' }}
                      >
                        <Text style={[styles.unitChipText, configUnit === '1g' && styles.unitChipTextActive]}>1g</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Nutrition Summary Box */}
              {(() => {
                const mult = configQuantity * (configWeight / 100);
                const scaledKcal = Math.round(selectedItem.calories * mult);
                const scaledProt = (selectedItem.protein * mult).toFixed(1);
                const scaledCarb = (selectedItem.carbs * mult).toFixed(1);
                const scaledFat = (selectedItem.fat * mult).toFixed(1);

                return (
                  <>
                    <View style={styles.summaryBento}>
                      <View style={[styles.summaryBentoBox, { borderLeftColor: Colors.primary, borderLeftWidth: 3 }]}>
                        <Text style={styles.summaryBigVal}>{scaledKcal}</Text>
                        <Text style={styles.summaryLabel}>Calories</Text>
                      </View>
                      <View style={[styles.summaryBentoBox, { borderLeftColor: Colors.proteinAccent, borderLeftWidth: 3 }]}>
                        <Text style={styles.summaryBigVal}>{scaledProt}g</Text>
                        <Text style={styles.summaryLabel}>Protein</Text>
                      </View>
                      <View style={[styles.summaryBentoBox, { borderLeftColor: Colors.tertiaryFixedDim, borderLeftWidth: 3 }]}>
                        <Text style={styles.summaryBigVal}>{scaledCarb}g</Text>
                        <Text style={styles.summaryLabel}>Carbs</Text>
                      </View>
                      <View style={[styles.summaryBentoBox, { borderLeftColor: Colors.secondaryContainer, borderLeftWidth: 3 }]}>
                        <Text style={styles.summaryBigVal}>{scaledFat}g</Text>
                        <Text style={styles.summaryLabel}>Fats</Text>
                      </View>
                    </View>

                    {/* Detailed Micronutrients Breakdown list */}
                    <View style={styles.microsListCard}>
                      <Text style={styles.microsCardTitle}>Micronutrient Highlights:</Text>
                      <View style={styles.microDetailRow}>
                        <Text style={styles.microDetailName}>Fiber</Text>
                        <Text style={styles.microDetailVal}>{(selectedItem.fiber * mult).toFixed(1)}g</Text>
                      </View>
                      <View style={styles.microDetailRow}>
                        <Text style={styles.microDetailName}>Sodium</Text>
                        <Text style={styles.microDetailVal}>{Math.round(selectedItem.sodium * mult)}mg</Text>
                      </View>
                      <View style={styles.microDetailRow}>
                        <Text style={styles.microDetailName}>Potassium</Text>
                        <Text style={styles.microDetailVal}>{Math.round(selectedItem.potassium * mult)}mg</Text>
                      </View>
                      <View style={styles.microDetailRow}>
                        <Text style={styles.microDetailName}>Calcium</Text>
                        <Text style={styles.microDetailVal}>{Math.round(selectedItem.calcium * mult)}mg</Text>
                      </View>
                      <View style={styles.microDetailRow}>
                        <Text style={styles.microDetailName}>Iron</Text>
                        <Text style={styles.microDetailVal}>{(selectedItem.iron * mult).toFixed(2)}mg</Text>
                      </View>
                      <View style={styles.microDetailRow}>
                        <Text style={styles.microDetailName}>Vitamin C</Text>
                        <Text style={styles.microDetailVal}>{(selectedItem.vitaminC * mult).toFixed(1)}mg</Text>
                      </View>
                      <View style={styles.microDetailRow}>
                        <Text style={styles.microDetailName}>Folate</Text>
                        <Text style={styles.microDetailVal}>{Math.round(selectedItem.folate * mult)}µg</Text>
                      </View>
                    </View>
                  </>
                );
              })()}

              <TouchableOpacity
                style={[styles.finalLogBtn, { marginTop: spacing.md }]}
                onPress={logSelectedItem}
                accessibilityRole="button"
                accessibilityLabel={`Add food to ${activeMealId}`}
              >
                <Text style={styles.finalLogBtnText}>Add to {activeMealId}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Logged Item Details Sheet Modal */}
      <Modal visible={viewingLoggedItem !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setViewingLoggedItem(null)}>
        <SafeAreaView style={styles.modalContainer}>
          {viewingLoggedItem && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.modalTitleRow}>
                <Text style={[styles.modalTitle, { flex: 1, marginRight: spacing.md }]} numberOfLines={2}>
                  {viewingLoggedItem.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setViewingLoggedItem(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close food details"
                  hitSlop={8}
                >
                  <Text style={styles.closeModalText}>Close</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.loggedDetailSub}>
                Logged to {viewingLoggedItem.mealId.toUpperCase()} · {viewingLoggedItem.servingSize} {viewingLoggedItem.servingUnit}
              </Text>

              {/* Bento Grid */}
              <View style={styles.summaryBento}>
                <View style={[styles.summaryBentoBox, { borderLeftColor: Colors.primary, borderLeftWidth: 3 }]}>
                  <Text style={styles.summaryBigVal}>{viewingLoggedItem.calories}</Text>
                  <Text style={styles.summaryLabel}>Calories</Text>
                </View>
                <View style={[styles.summaryBentoBox, { borderLeftColor: Colors.proteinAccent, borderLeftWidth: 3 }]}>
                  <Text style={styles.summaryBigVal}>{viewingLoggedItem.protein}g</Text>
                  <Text style={styles.summaryLabel}>Protein</Text>
                </View>
                <View style={[styles.summaryBentoBox, { borderLeftColor: Colors.tertiaryFixedDim, borderLeftWidth: 3 }]}>
                  <Text style={styles.summaryBigVal}>{viewingLoggedItem.carbs}g</Text>
                  <Text style={styles.summaryLabel}>Carbs</Text>
                </View>
                <View style={[styles.summaryBentoBox, { borderLeftColor: Colors.secondaryContainer, borderLeftWidth: 3 }]}>
                  <Text style={styles.summaryBigVal}>{viewingLoggedItem.fat}g</Text>
                  <Text style={styles.summaryLabel}>Fats</Text>
                </View>
              </View>

              {/* Micronutrients breakdown */}
              <View style={styles.microsListCard}>
                <Text style={styles.microsCardTitle}>Micronutrient Highlights:</Text>
                <View style={styles.microDetailRow}>
                  <Text style={styles.microDetailName}>Fiber</Text>
                  <Text style={styles.microDetailVal}>{(viewingLoggedItem.fiber || 0).toFixed(1)}g</Text>
                </View>
                <View style={styles.microDetailRow}>
                  <Text style={styles.microDetailName}>Sodium</Text>
                  <Text style={styles.microDetailVal}>{viewingLoggedItem.sodium || 0}mg</Text>
                </View>
                <View style={styles.microDetailRow}>
                  <Text style={styles.microDetailName}>Potassium</Text>
                  <Text style={styles.microDetailVal}>{viewingLoggedItem.potassium || 0}mg</Text>
                </View>
                <View style={styles.microDetailRow}>
                  <Text style={styles.microDetailName}>Calcium</Text>
                  <Text style={styles.microDetailVal}>{viewingLoggedItem.calcium || 0}mg</Text>
                </View>
                <View style={styles.microDetailRow}>
                  <Text style={styles.microDetailName}>Iron</Text>
                  <Text style={styles.microDetailVal}>{(viewingLoggedItem.iron || 0).toFixed(2)}mg</Text>
                </View>
                <View style={styles.microDetailRow}>
                  <Text style={styles.microDetailName}>Vitamin C</Text>
                  <Text style={styles.microDetailVal}>{(viewingLoggedItem.vitaminC || 0).toFixed(1)}mg</Text>
                </View>
                <View style={styles.microDetailRow}>
                  <Text style={styles.microDetailName}>Folate</Text>
                  <Text style={styles.microDetailVal}>{viewingLoggedItem.folate || 0}µg</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.deleteFoodActionBtn}
                onPress={() => {
                  handleDeleteEntry(viewingLoggedItem.id);
                  setViewingLoggedItem(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${viewingLoggedItem.name}`}
              >
                <Trash2 size={16} color={Colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.deleteFoodActionText}>Delete Food Entry</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
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
    flex: 1,
    marginRight: spacing.sm,
  },
  carouselArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  arrowBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
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
  energyRingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ringCol: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRingLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  miniRingNum: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  miniRingDesc: {
    fontSize: 8,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  macrosProgressWrap: {
    gap: spacing.sm,
  },
  macroProgressRow: {
    gap: 4,
  },
  macroLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onSurfaceVariant,
  },
  progressLineBg: {
    height: 6,
    backgroundColor: 'rgba(229, 238, 255, 0.7)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressLineFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  microsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  microBox: {
    width: '30%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  microVal: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  microName: {
    fontSize: 9,
    color: Colors.outline,
    marginTop: 2,
    fontWeight: fontWeight.medium,
  },
  aiLogCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  aiLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  aiLogTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
    letterSpacing: 0.8,
  },
  aiLogInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  aiLogInput: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    backgroundColor: Colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.base,
    fontSize: typography.sm,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  aiLogBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
  },
  aiLogBtnText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
    fontSize: typography.sm,
  },
  mealSectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealSectionName: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  mealSectionSubtext: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 1,
  },
  mealAddCircleBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loggedRowsList: {
    marginTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.15)',
    paddingTop: spacing.xs,
  },
  loggedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  loggedRowName: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  loggedRowMacros: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 2,
  },
  deleteRowBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
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
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
  },
  hydrationGoalLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  hydrationSubtext: {
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  hydrationProgressContainer: {
    height: 4,
    backgroundColor: 'rgba(229, 238, 255, 0.7)',
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  glassBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.full,
    backgroundColor: 'rgba(110, 120, 129, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
  },
  glassBtnFilled: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: Colors.primaryContainer,
  },
  sleepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sleepHoursText: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
  },
  sleepQualityText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  sleepSubtext: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 2,
    marginBottom: spacing.base,
  },
  sleepInputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sleepInputCol: {
    flex: 1,
  },
  sleepInputLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    marginBottom: 4,
  },
  sleepTextInput: {
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  sleepBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  sleepProgressBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(229, 238, 255, 0.7)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sleepProgressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  sleepGoalLabelText: {
    fontSize: 11,
    color: Colors.outline,
    fontWeight: fontWeight.bold,
  },
  sleepWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  sleepWarningText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: fontWeight.bold,
    flex: 1,
  },
  privacyWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: 10,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealIcon: {
    marginRight: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalBody: {
    padding: spacing.base,
    width: '100%',
    maxWidth: layout.modalMaxWidth,
    alignSelf: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  closeModalText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  modalTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  modalTabPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(110, 120, 129, 0.05)',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTabPillActive: {
    backgroundColor: Colors.primaryContainer,
  },
  modalTabPillText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  modalTabPillTextActive: {
    color: Colors.onPrimary,
  },
  searchBarContainer: {
    marginBottom: spacing.base,
  },
  searchBarInput: {
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    fontSize: typography.sm,
    color: Colors.onSurface,
  },
  searchResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  resultItemName: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  resultItemCategory: {
    fontSize: 9,
    color: Colors.outline,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  resultItemMacros: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 2,
  },
  resultItemCalsBadge: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.xs,
    alignItems: 'center',
    minWidth: 44,
  },
  resultItemCalsText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  resultItemCalsLabel: {
    fontSize: 8,
    color: Colors.outline,
  },
  customFoodScroll: {
    gap: spacing.md,
  },
  formSectionTitle: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  customFormField: {
    marginBottom: spacing.sm,
  },
  formInputLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    marginBottom: 4,
  },
  formTextInput: {
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    fontSize: typography.sm,
    color: Colors.onSurface,
  },
  formSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  formSubmitBtnText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
    fontSize: typography.base,
  },
  detailTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  detailBackText: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  detailItemTitle: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    flex: 1,
  },
  portionSection: {
    marginBottom: spacing.base,
  },
  sectionHeading: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    marginBottom: spacing.xs,
  },
  portionRow: {
    flexDirection: 'row',
  },
  servingUnitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  unitChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    backgroundColor: Colors.surfaceContainerLowest,
    minHeight: 36,
    justifyContent: 'center',
  },
  unitChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  unitChipText: {
    fontSize: 9,
    color: Colors.outline,
    fontWeight: fontWeight.bold,
  },
  unitChipTextActive: {
    color: Colors.onPrimary,
  },
  summaryBento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryBentoBox: {
    width: '46%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  summaryBigVal: {
    fontSize: typography.lg,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 2,
    fontWeight: fontWeight.medium,
  },
  finalLogBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  finalLogBtnText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
    fontSize: typography.base,
  },

  // Newly Added Styles for Hydration Goal Editor, Micros Card, Detail viewing logged modal, and Action triggers
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
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    backgroundColor: Colors.surfaceContainerLowest,
    minHeight: 36,
    justifyContent: 'center',
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
    minHeight: layout.minTouchTarget,
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
    minHeight: layout.minTouchTarget,
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
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microsListCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.base,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.12)',
  },
  microsCardTitle: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  microDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.06)',
  },
  microDetailName: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.medium,
  },
  microDetailVal: {
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: fontWeight.bold,
  },
  loggedDetailSub: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginBottom: spacing.lg,
  },
  deleteFoodActionBtn: {
    backgroundColor: Colors.error,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    minHeight: layout.minTouchTarget,
  },
  deleteFoodActionText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
    fontSize: typography.base,
  },
});
