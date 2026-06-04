import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AppState,
  type AppStateStatus,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
} from 'react-native';
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
  getUnsyncedNewDietLogsByUser,
  markDietLogDeleteSynced,
  markDietLogSyncFailed,
  markDietLogSynced,
  softDeleteDietLog,
  updateDietLog as updateLocalDietLog,
} from '@/local/repositories/dietLogsRepository';
import {
  cacheRemoteFoodItems,
  markFoodLastUsed,
  searchLocalFoods,
} from '@/local/repositories/foodsRepository';
import type { FoodLogEntry, MacroTargets, MealId } from '@/screens/dashboard/types';
import { NutritionCarousel } from './NutritionCarousel';
import { MealDiarySection } from './MealDiarySection';
import { HydrationTrackerCard } from './HydrationTrackerCard';
import { SleepRecoveryCard } from './SleepRecoveryCard';
import { LoggedItemDetailsModal } from './LoggedItemDetailsModal';
import { FoodSearchModal } from './FoodSearchModal';
import {
  Lock,
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
type SyncCreatedDietLogResult = { didSync: boolean; message?: string };

const REMOTE_FOOD_ID_PREFIX = 'supabase_usda:';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const responseError = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
    if (responseError) return responseError;

    const message = (error as { message?: string }).message;
    if (message) return message;
  }

  return 'Unknown error';
}

function getRemoteFoodMergeKey(item: GemiFoodItem, source: 'local' | 'remote') {
  if (source === 'local') {
    return item.id.startsWith(REMOTE_FOOD_ID_PREFIX) ? item.id : item.id;
  }

  return item.id.startsWith(REMOTE_FOOD_ID_PREFIX)
    ? item.id
    : `${REMOTE_FOOD_ID_PREFIX}${item.id}`;
}

function mergeLocalAndRemoteFoodResults(
  localResults: GemiFoodItem[],
  remoteResults: GemiFoodItem[]
) {
  const seen = new Set(localResults.map((item) => getRemoteFoodMergeKey(item, 'local')));
  const merged = [...localResults];

  for (const item of remoteResults) {
    const key = getRemoteFoodMergeKey(item, 'remote');
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(item);
  }

  return merged;
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
  const [visibleMicros, setVisibleMicros] = useState<string[]>(['fiber', 'sodium', 'potassium', 'calcium', 'iron', 'vitaminC']);

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
  const isRetryingDietLogsRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Viewing Logged Item Detail Modal State
  const [viewingLoggedItem, setViewingLoggedItem] = useState<FoodLogEntry | null>(null);

  // Tracks when a log/delete API call is in-flight so I can disable the button.
  const [isSavingLog, setIsSavingLog] = useState(false);

  const syncCreatedDietLogToRemote = useCallback(
    async (
      localId: string,
      remoteInput: DietLogCreateInput,
      options?: { showFailureToast?: boolean; refreshAfterSync?: boolean }
    ): Promise<SyncCreatedDietLogResult> => {
      if (!userId) return { didSync: false, message: 'Missing authenticated user.' };

      const showFailureToast = options?.showFailureToast ?? true;
      const refreshAfterSync = options?.refreshAfterSync ?? true;

      try {
        const remoteLog = await createRemoteDietLog(remoteInput);
        await markDietLogSynced(userId, localId, remoteLog.id);
        if (refreshAfterSync) {
          await refreshFoodLogs();
        }
        return { didSync: true };
      } catch (error) {
        const message = getErrorMessage(error);
        console.error('[Gemi] Failed to sync local diet log to backend:', message);
        await markDietLogSyncFailed(userId, localId).catch((markError) => {
          console.error('[Gemi] Failed to mark local diet log sync failed:', markError);
        });
        if (showFailureToast) {
          triggerToast(`Saved locally. Remote sync pending: ${message}`);
        }
        return { didSync: false, message };
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
      const localEntry = localDietLogToFoodLogEntry(localLog);
      const remoteInput = foodLogEntryToRemoteCreateInput(entry, loggedAt);

      setFoodLogs((prev) => [...prev, localEntry]);
      triggerToast(successMessage);
      void syncCreatedDietLogToRemote(localLog.id, remoteInput);

      return localEntry;
    },
    [setFoodLogs, syncCreatedDietLogToRemote, triggerToast, userId]
  );

  const retryPendingDietLogCreates = useCallback(
    async (targetUserId: string) => {
      if (isRetryingDietLogsRef.current) {
        console.log('[FoodTab] Diet-log create retry skipped: already running');
        return;
      }

      isRetryingDietLogsRef.current = true;
      let shouldRefreshLogs = false;
      try {
        console.log('[FoodTab] Diet-log create retry begin');
        const unsyncedLogs = await getUnsyncedNewDietLogsByUser(targetUserId);
        console.log(`[FoodTab] Unsynced new diet logs found: ${unsyncedLogs.length}`);

        for (const localLog of unsyncedLogs) {
          console.log(`[FoodTab] Retrying local diet log: ${localLog.id}`);
          const entry = localDietLogToFoodLogEntry(localLog);
          const remoteInput = foodLogEntryToRemoteCreateInput(entry, localLog.logged_at);
          const result = await syncCreatedDietLogToRemote(localLog.id, remoteInput, {
            showFailureToast: false,
            refreshAfterSync: false,
          });

          if (result.didSync) {
            shouldRefreshLogs = true;
            console.log(`[FoodTab] Diet-log create retry synced: ${localLog.id}`);
          } else {
            console.log(`[FoodTab] Diet-log create retry failed: ${result.message ?? 'Unknown error'}`);
          }
        }

        if (shouldRefreshLogs) {
          await refreshFoodLogs();
        }
        console.log('[FoodTab] Diet-log create retry complete');
      } catch (error) {
        console.log(`[FoodTab] Diet-log create retry failed: ${getErrorMessage(error)}`);
      } finally {
        isRetryingDietLogsRef.current = false;
      }
    },
    [refreshFoodLogs, syncCreatedDietLogToRemote]
  );

  // Custom Food Form
  const [customName, setCustomName] = useState('');
  const [customCals, setCustomCals] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customUnit, setCustomUnit] = useState('serving');

  // Load local food results first, then enrich with backend results if the request is still current.
  const loadFoodResults = useCallback(async (query: string) => {
    const requestId = ++latestSearchRef.current;
    setIsLoadingDb(true);
    let localResults: GemiFoodItem[] = [];

    try {
      const trimmedQuery = query.trim();
      const limit = trimmedQuery ? 50 : 15;
      localResults = await searchLocalFoods(trimmedQuery, limit).catch((error) => {
        const message = getErrorMessage(error);
        console.warn('[FoodTab] Local food search failed:', message);
        return [];
      });

      if (requestId !== latestSearchRef.current) return;

      console.log(`[FoodTab] Local food results: ${localResults.length}`);
      setDbList(localResults);
      setIsLoadingDb(false);

      const list = await searchFoodDatabase({
        query: trimmedQuery || undefined,
        limit,
      });
      if (requestId === latestSearchRef.current) {
        setDbList((currentResults) => mergeLocalAndRemoteFoodResults(currentResults, list));
        if (list.length > 0) {
          void cacheRemoteFoodItems(list).catch((cacheError) => {
            console.warn('[FoodTab] Failed to cache backend food results:', getErrorMessage(cacheError));
          });
        }
      }
    } catch (err) {
      if (requestId === latestSearchRef.current) {
        const message = getErrorMessage(err);
        console.warn('[FoodTab] Backend food enrichment skipped or failed:', message);
        if (localResults.length === 0) {
          setDbList([]);
        }
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

  useEffect(() => {
    if (!userId) return;
    void retryPendingDietLogCreates(userId);
  }, [retryPendingDietLogCreates, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        userId &&
        nextAppState === 'active' &&
        (previousAppState === 'background' || previousAppState === 'inactive')
      ) {
        void retryPendingDietLogCreates(userId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [retryPendingDietLogCreates, userId]);

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
    void markFoodLastUsed(item.id).catch((error) => {
      console.warn('[FoodTab] Failed to mark cached food used:', getErrorMessage(error));
    });
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
      void markFoodLastUsed(selectedItem.id).catch((error) => {
        console.warn('[FoodTab] Failed to mark cached food used:', getErrorMessage(error));
      });
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

  const handleUpdateEntry = async (
    entry: FoodLogEntry,
    nextAmount: number,
    nextMealId: MealId
  ) => {
    if (!userId) {
      triggerToast('Please log in before editing food logs.');
      return;
    }

    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      triggerToast('Enter an amount greater than 0.');
      return;
    }

    if (isSavingLog) return;

    const originalAmount = entry.servingSize > 0 ? entry.servingSize : 1;
    const multiplier = nextAmount / originalAmount;
    const updatedEntry: FoodLogEntry = {
      ...entry,
      mealId: nextMealId,
      calories: Math.round(entry.calories * multiplier),
      protein: Number((entry.protein * multiplier).toFixed(1)),
      carbs: Number((entry.carbs * multiplier).toFixed(1)),
      fat: Number((entry.fat * multiplier).toFixed(1)),
      fiber: Number((entry.fiber * multiplier).toFixed(1)),
      sodium: Math.round(entry.sodium * multiplier),
      potassium: Math.round(entry.potassium * multiplier),
      calcium: Math.round(entry.calcium * multiplier),
      iron: Number((entry.iron * multiplier).toFixed(2)),
      vitaminC: Number((entry.vitaminC * multiplier).toFixed(1)),
      folate: Math.round(entry.folate * multiplier),
      servingSize: nextAmount,
    };

    setIsSavingLog(true);
    try {
      const updatedLocalLog = await updateLocalDietLog(userId, entry.id, {
        meal_id: updatedEntry.mealId,
        meal_name: updatedEntry.name,
        calories: updatedEntry.calories,
        protein_g: updatedEntry.protein,
        carbs_g: updatedEntry.carbs,
        fat_g: updatedEntry.fat,
        fiber_g: updatedEntry.fiber,
        sodium_mg: updatedEntry.sodium,
        potassium_mg: updatedEntry.potassium,
        calcium_mg: updatedEntry.calcium,
        iron_mg: updatedEntry.iron,
        vitamin_c_mg: updatedEntry.vitaminC,
        folate_mcg: updatedEntry.folate,
        serving_size: updatedEntry.servingSize,
        serving_unit: updatedEntry.servingUnit,
      });
      const localEntry = localDietLogToFoodLogEntry(updatedLocalLog);

      setFoodLogs((prev) => prev.map((item) => (item.id === entry.id ? localEntry : item)));
      setViewingLoggedItem(null);
      triggerToast(`Updated ${localEntry.name}`);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error('[Gemi] Failed to update local diet log:', message);
      triggerToast(`Update failed: ${message}`);
    } finally {
      setIsSavingLog(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <NutritionCarousel
          foodLogs={foodLogs}
          targets={targets}
          visibleMicros={visibleMicros}
          setVisibleMicros={setVisibleMicros}
          triggerToast={triggerToast}
        />

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

        <MealDiarySection
          foodLogs={foodLogs}
          onOpenSearch={handleOpenSearchModal}
          onItemPress={setViewingLoggedItem}
          onDeleteEntry={handleDeleteEntry}
        />

        <HydrationTrackerCard
          hydrationGoal={hydrationGoal}
          setHydrationGoal={setHydrationGoal}
          waterGlassStates={waterGlassStates}
          setWaterGlassStates={setWaterGlassStates}
          triggerToast={triggerToast}
        />

        <SleepRecoveryCard
          bedtime={bedtime}
          setBedtime={setBedtime}
          waketime={waketime}
          setWaketime={setWaketime}
          triggerToast={triggerToast}
        />

        {/* Privacy Note */}
        <View style={styles.privacyWrap}>
          <View style={styles.privacyRow}>
            <Lock size={12} color={Colors.outline} style={{ marginRight: 6 }} />
            <Text style={styles.privacyText}>Food logs stay local-first and sync when available.</Text>
          </View>
        </View>
      </ScrollView>

      <FoodSearchModal
        visible={isModalOpen}
        activeMealId={activeMealId}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        searchResults={dbList}
        selectedItem={selectedItem}
        loading={isLoadingDb}
        isSaving={isSavingLog}
        configQuantity={configQuantity}
        configUnit={configUnit}
        configWeight={configWeight}
        customName={customName}
        customCals={customCals}
        customProtein={customProtein}
        customCarbs={customCarbs}
        customFat={customFat}
        customUnit={customUnit}
        onClose={() => {
          setSelectedItem(null);
          setIsModalOpen(false);
        }}
        onBackFromSelected={() => setSelectedItem(null)}
        onSearchQueryChange={setSearchQuery}
        onSelectedCategoryChange={setSelectedCategory}
        onSelectFood={handleSelectSearchItem}
        onAddSelectedFood={logSelectedItem}
        onAddCustomFood={handleAddCustomFood}
        onMealChange={setActiveMealId}
        setConfigQuantity={setConfigQuantity}
        setConfigUnit={setConfigUnit}
        setConfigWeight={setConfigWeight}
        setCustomName={setCustomName}
        setCustomCals={setCustomCals}
        setCustomProtein={setCustomProtein}
        setCustomCarbs={setCustomCarbs}
        setCustomFat={setCustomFat}
        setCustomUnit={setCustomUnit}
      />

      <LoggedItemDetailsModal
        isOpen={viewingLoggedItem !== null}
        onClose={() => setViewingLoggedItem(null)}
        viewingLoggedItem={viewingLoggedItem}
        targets={targets}
        onSaveChanges={handleUpdateEntry}
        onDeleteEntry={handleDeleteEntry}
        isSaving={isSavingLog}
      />
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
