import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AppState,
  type AppStateStatus,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import { searchFoodDatabase, type GemiFoodItem } from '@/api/foodDatabaseApi';
import {
  createDietLog as createRemoteDietLog,
  deleteDietLog as deleteRemoteDietLog,
  updateDietLog as updateRemoteDietLog,
  type DietLogCreateInput,
} from '@/api/dietApi';
import {
  foodLogEntryToCreateLocalDietLogInput,
  foodLogEntryToRemoteCreateInput,
  foodLogEntryToRemoteUpdateInput,
  localDietLogToFoodLogEntry,
} from '@/local/dietLogsMapper';
import {
  createDietLog as createLocalDietLog,
  getDietLogByUserAndId,
  getUnsyncedDeletedDietLogsByUser,
  getUnsyncedEditedDietLogsByUser,
  getUnsyncedNewDietLogsByUser,
  markDietLogDeleteSyncFailed,
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
import { getDailyLogByDate, upsertDailyLog } from '@/local/repositories/dailyLogsRepository';
import { syncDailyLogsForUser } from '@/local/dailyLogsSync';
import { format } from 'date-fns';

import type { FoodLogEntry, MacroTargets, MealId } from '@/screens/dashboard/types';
import { NutritionCarousel } from './NutritionCarousel';
import { MealDiarySection } from './MealDiarySection';
import { HydrationTrackerCard } from './HydrationTrackerCard';
import { SleepRecoveryCard } from './SleepRecoveryCard';
import { LoggedItemDetailsModal } from './LoggedItemDetailsModal';
import { FoodSearchModal } from './FoodSearchModal';
import { QuickParserCard, type QuickParserReviewItem } from './QuickParserCard';
import { parseFoodDescription, type ParsedFoodItem, type ParsedFoodUnit } from '@/ai/foodParser';


interface FoodTabProps {
  userId: string | null;
  foodLogs: FoodLogEntry[];
  setFoodLogs: React.Dispatch<React.SetStateAction<FoodLogEntry[]>>;
  refreshFoodLogs: () => Promise<void>;
  targets: MacroTargets;
  triggerToast: (msg: string) => void;
}

type NutrientSlideType = 'energy' | 'macros' | 'micros';
type SyncCreatedDietLogResult = {
  didSync: boolean;
  message?: string;
  skippedInFlight?: boolean;
};
type QuickParserMatchedItem = QuickParserReviewItem & {
  entry: FoodLogEntry | null;
  sourceFoodId: string | null;
};

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

function normalizePortionText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getPortionGramWeight(food: GemiFoodItem, unit: ParsedFoodUnit) {
  const defaultUnit = normalizePortionText(food.defaultServingUnit);

  if (
    unit === 'serving' &&
    food.defaultServingSize > 0 &&
    defaultUnit !== '100g' &&
    defaultUnit !== '1g'
  ) {
    return food.defaultServingSize;
  }

  if (defaultUnit === unit && food.defaultServingSize > 0) {
    return food.defaultServingSize;
  }

  const unitMatchers: Record<ParsedFoodUnit, string[]> = {
    g: [],
    kg: [],
    ml: ['ml', 'milliliter', 'milliliters'],
    piece: ['piece', 'whole', 'unit', 'egg', 'large', 'medium', 'small'],
    serving: ['serving', 'portion'],
    tbsp: ['tbsp', 'tablespoon', 'tablespoons'],
    tsp: ['tsp', 'teaspoon', 'teaspoons'],
    cup: ['cup', 'cups'],
    oz: ['oz', 'ounce', 'ounces'],
  };

  const matchers = unitMatchers[unit];
  const portion = food.portions.find((candidate) => {
    if (!candidate.gramWeight || candidate.gramWeight <= 0 || !candidate.amount || candidate.amount <= 0) {
      return false;
    }

    const name = normalizePortionText(candidate.name);
    return matchers.some((matcher) => name.includes(matcher));
  });

  return portion ? portion.gramWeight / portion.amount : null;
}

function resolveParsedFoodWeight(food: GemiFoodItem, item: ParsedFoodItem) {
  if (item.unit === 'g') return item.quantity;
  if (item.unit === 'kg') return item.quantity * 1000;

  const gramWeight = getPortionGramWeight(food, item.unit);
  return gramWeight ? item.quantity * gramWeight : null;
}

function buildQuickParserEntry(
  item: ParsedFoodItem,
  food: GemiFoodItem,
  mealId: MealId,
  index: number
): FoodLogEntry | null {
  const grams = resolveParsedFoodWeight(food, item);
  if (!grams || grams <= 0) return null;

  const multiplier = grams / 100;
  return {
    id: `quick_${Date.now()}_${index}`,
    name: food.name,
    mealId,
    calories: Math.round(food.calories * multiplier),
    protein: Number((food.protein * multiplier).toFixed(1)),
    carbs: Number((food.carbs * multiplier).toFixed(1)),
    fat: Number((food.fat * multiplier).toFixed(1)),
    fiber: Number((food.fiber * multiplier).toFixed(1)),
    sodium: Math.round(food.sodium * multiplier),
    potassium: Math.round(food.potassium * multiplier),
    calcium: Math.round(food.calcium * multiplier),
    iron: Number((food.iron * multiplier).toFixed(2)),
    vitaminC: Number((food.vitaminC * multiplier).toFixed(1)),
    folate: Math.round(food.folate * multiplier),
    servingSize: item.quantity,
    servingUnit: item.unit,
  };
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
    setIsEditingHydration(false);
    triggerToast(`Hydration target updated to ${(ml / 1000).toFixed(2)}L!`);
  };

  // Sleep state
  const [bedtime, setBedtime] = useState<string | null>(null);
  const [waketime, setWaketime] = useState<string | null>(null);

  // Compute sleep hours
  const sleepHours = useMemo(() => {
    if (!bedtime || !waketime) return 0;
    try {
      const [bh, bm] = bedtime.split(':').map(Number);
      const [wh, wm] = waketime.split(':').map(Number);
      let diffMins = (wh * 60 + wm) - (bh * 60 + bm);
      if (diffMins < 0) diffMins += 24 * 60;
      return Number((diffMins / 60).toFixed(1));
    } catch {
      return 0;
    }
  }, [bedtime, waketime]);

  // Sleep quality calculations
  const sleepMetrics = useMemo(() => {
    if (sleepHours === 0) {
      return { sleepQuality: 'Not Logged', sleepQualityColor: Colors.outline };
    }
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

  const isDailyLogLoadedRef = useRef(false);
  const skipNextDailyAutosaveRef = useRef(false);

  const applyDailyLogToState = useCallback((log: Awaited<ReturnType<typeof getDailyLogByDate>>) => {
    if (log) {
      const targetGoal = log.water_goal_ml ?? 2000;
      setHydrationGoal(targetGoal);
      setHydrationGoalInput(String(targetGoal));

      const checkedCount = log.water_ml ? Math.floor(log.water_ml / 250) : 0;
      const totalGlasses = Math.min(12, Math.max(Math.ceil(targetGoal / 250), checkedCount));
      const newStates = Array(totalGlasses).fill(false);
      for (let i = 0; i < Math.min(checkedCount, totalGlasses); i++) {
        newStates[i] = true;
      }
      setWaterGlassStates(newStates);

      setBedtime(log.bedtime);
      setWaketime(log.waketime);
      return;
    }

    setHydrationGoal(2000);
    setHydrationGoalInput('2000');
    setWaterGlassStates(Array(8).fill(false));
    setBedtime(null);
    setWaketime(null);
  }, []);

  // Load initial daily log for today
  useEffect(() => {
    if (!userId) {
      isDailyLogLoadedRef.current = false;
      return;
    }
    let active = true;
    async function loadTodayLog() {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      try {
        const log = await getDailyLogByDate(userId!, todayStr);
        if (!active) return;
        skipNextDailyAutosaveRef.current = true;
        applyDailyLogToState(log);

        void (async () => {
          await syncDailyLogsForUser(userId!);
          const refreshed = await getDailyLogByDate(userId!, todayStr);
          if (active) {
            skipNextDailyAutosaveRef.current = true;
            applyDailyLogToState(refreshed);
          }
        })();
      } catch (err) {
        console.warn('[FoodTab] Failed to load today\'s daily log:', err);
      } finally {
        if (active) {
          isDailyLogLoadedRef.current = true;
        }
      }
    }
    isDailyLogLoadedRef.current = false;
    loadTodayLog();
    return () => {
      active = false;
    };
  }, [applyDailyLogToState, userId]);

  // Autosave hydration & sleep recovery changes to SQLite
  useEffect(() => {
    if (!userId || !isDailyLogLoadedRef.current) return;
    if (skipNextDailyAutosaveRef.current) {
      skipNextDailyAutosaveRef.current = false;
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const consumed = waterGlassStates.filter(Boolean).length * 250;

    const saveChanges = async () => {
      try {
        await upsertDailyLog(userId, todayStr, {
          water_ml: consumed,
          water_goal_ml: hydrationGoal,
          bedtime,
          waketime,
          sleep_hours: sleepHours > 0 ? sleepHours : null,
        });
        void syncDailyLogsForUser(userId);
      } catch (err) {
        console.warn('[FoodTab] Failed to save daily log:', err);
      }
    };

    saveChanges();
  }, [userId, waterGlassStates, hydrationGoal, bedtime, waketime, sleepHours]);


  // Natural-language quick log state
  const [quickInput, setQuickInput] = useState('');
  const [quickMealId, setQuickMealId] = useState<MealId>('breakfast');
  const [quickItems, setQuickItems] = useState<QuickParserMatchedItem[]>([]);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isQuickParsing, setQuickParsing] = useState(false);
  const [isQuickSaving, setQuickSaving] = useState(false);

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
  const isRetryingDietLogUpdatesRef = useRef(false);
  const isRetryingDietLogDeletesRef = useRef(false);
  const inFlightDietLogCreateIdsRef = useRef(new Set<string>());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const refreshFoodLogsRef = useRef(refreshFoodLogs);

  useEffect(() => {
    refreshFoodLogsRef.current = refreshFoodLogs;
  }, [refreshFoodLogs]);

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

      if (inFlightDietLogCreateIdsRef.current.has(localId)) {
        return {
          didSync: false,
          message: 'Diet log create sync already in progress.',
          skippedInFlight: true,
        };
      }

      inFlightDietLogCreateIdsRef.current.add(localId);

      try {
        const remoteLog = await createRemoteDietLog(remoteInput);
        await markDietLogSynced(userId, localId, remoteLog.id);
        if (refreshAfterSync) {
          await refreshFoodLogsRef.current();
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
      } finally {
        inFlightDietLogCreateIdsRef.current.delete(localId);
      }
    },
    [triggerToast, userId]
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
      const remoteInput = foodLogEntryToRemoteCreateInput(entry, loggedAt, sourceFoodId);

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
          if (inFlightDietLogCreateIdsRef.current.has(localLog.id)) {
            console.log(`[FoodTab] Diet-log create retry skipped in-flight row: ${localLog.id}`);
            continue;
          }

          console.log(`[FoodTab] Retrying local diet log: ${localLog.id}`);
          const entry = localDietLogToFoodLogEntry(localLog);
          const remoteInput = foodLogEntryToRemoteCreateInput(entry, localLog.logged_at, localLog.source_food_id);
          const result = await syncCreatedDietLogToRemote(localLog.id, remoteInput, {
            showFailureToast: false,
            refreshAfterSync: false,
          });

          if (result.didSync) {
            shouldRefreshLogs = true;
            console.log(`[FoodTab] Diet-log create retry synced: ${localLog.id}`);
          } else if (result.skippedInFlight) {
            console.log(`[FoodTab] Diet-log create retry skipped in-flight row: ${localLog.id}`);
          } else {
            console.log(`[FoodTab] Diet-log create retry failed: ${result.message ?? 'Unknown error'}`);
          }
        }

        if (shouldRefreshLogs) {
          await refreshFoodLogsRef.current();
        }
        console.log('[FoodTab] Diet-log create retry complete');
      } catch (error) {
        console.log(`[FoodTab] Diet-log create retry failed: ${getErrorMessage(error)}`);
      } finally {
        isRetryingDietLogsRef.current = false;
      }
    },
    [syncCreatedDietLogToRemote]
  );

  const retryPendingDietLogUpdates = useCallback(
    async (targetUserId: string) => {
      if (!targetUserId) return;

      if (isRetryingDietLogUpdatesRef.current) {
        console.log('[FoodTab] Diet-log update retry skipped: already running');
        return;
      }

      isRetryingDietLogUpdatesRef.current = true;
      let shouldRefreshLogs = false;
      try {
        console.log('[FoodTab] Diet-log update retry begin');
        const unsyncedLogs = await getUnsyncedEditedDietLogsByUser(targetUserId);
        console.log(`[FoodTab] Unsynced edited diet logs found: ${unsyncedLogs.length}`);

        for (const localLog of unsyncedLogs) {
          if (!localLog.remote_id) {
            console.log(`[FoodTab] Diet-log update retry skipped missing remote id: ${localLog.id}`);
            continue;
          }

          console.log(`[FoodTab] Retrying edited local diet log: ${localLog.id}`);
          const entry = localDietLogToFoodLogEntry(localLog);
          const remoteInput = foodLogEntryToRemoteUpdateInput(entry, localLog.logged_at, localLog.source_food_id);

          try {
            await updateRemoteDietLog(localLog.remote_id, remoteInput);
            await markDietLogSynced(targetUserId, localLog.id, localLog.remote_id);
            shouldRefreshLogs = true;
            console.log(`[FoodTab] Diet-log update retry synced: ${localLog.id}`);
          } catch (error) {
            const message = getErrorMessage(error);
            console.log(`[FoodTab] Diet-log update retry failed: ${message}`);
            await markDietLogSyncFailed(targetUserId, localLog.id).catch((markError) => {
              console.error('[Gemi] Failed to mark edited diet log sync failed:', markError);
            });
          }
        }

        if (shouldRefreshLogs) {
          await refreshFoodLogsRef.current();
        }
        console.log('[FoodTab] Diet-log update retry complete');
      } catch (error) {
        console.log(`[FoodTab] Diet-log update retry failed: ${getErrorMessage(error)}`);
      } finally {
        isRetryingDietLogUpdatesRef.current = false;
      }
    },
    []
  );

  const retryPendingDietLogDeletes = useCallback(
    async (targetUserId: string) => {
      if (!targetUserId) return;

      if (isRetryingDietLogDeletesRef.current) {
        console.log('[FoodTab] Diet-log delete retry skipped: already running');
        return;
      }

      isRetryingDietLogDeletesRef.current = true;
      try {
        console.log('[FoodTab] Diet-log delete retry begin');
        const unsyncedLogs = await getUnsyncedDeletedDietLogsByUser(targetUserId);
        console.log(`[FoodTab] Unsynced deleted diet logs found: ${unsyncedLogs.length}`);

        for (const localLog of unsyncedLogs) {
          if (!localLog.remote_id) {
            console.log(`[FoodTab] Diet-log delete retry skipped missing remote id: ${localLog.id}`);
            continue;
          }

          console.log(`[FoodTab] Retrying deleted local diet log: ${localLog.id}`);

          try {
            await deleteRemoteDietLog(localLog.remote_id);
            await markDietLogDeleteSynced(targetUserId, localLog.id);
            console.log(`[FoodTab] Diet-log delete retry synced: ${localLog.id}`);
          } catch (error) {
            const message = getErrorMessage(error);
            console.log(`[FoodTab] Diet-log delete retry failed: ${message}`);
            await markDietLogDeleteSyncFailed(targetUserId, localLog.id).catch((markError) => {
              console.error('[Gemi] Failed to mark deleted diet log sync failed:', markError);
            });
          }
        }

        console.log('[FoodTab] Diet-log delete retry complete');
      } catch (error) {
        console.log(`[FoodTab] Diet-log delete retry failed: ${getErrorMessage(error)}`);
      } finally {
        isRetryingDietLogDeletesRef.current = false;
      }
    },
    []
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
    void retryPendingDietLogUpdates(userId);
    void retryPendingDietLogDeletes(userId);
    void syncDailyLogsForUser(userId);
  }, [retryPendingDietLogCreates, retryPendingDietLogDeletes, retryPendingDietLogUpdates, userId]);

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
        void retryPendingDietLogUpdates(userId);
        void retryPendingDietLogDeletes(userId);
        void syncDailyLogsForUser(userId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [retryPendingDietLogCreates, retryPendingDietLogDeletes, retryPendingDietLogUpdates, userId]);

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

  const findQuickFoodMatch = useCallback(async (item: ParsedFoodItem) => {
    const localMatches = await searchLocalFoods(item.foodName, 1).catch((error) => {
      console.warn('[FoodTab] Quick Log local food search failed:', getErrorMessage(error));
      return [];
    });

    if (localMatches[0]) {
      return localMatches[0];
    }

    try {
      const remoteMatches = await searchFoodDatabase({
        query: item.foodName,
        limit: 3,
      });

      if (remoteMatches.length > 0) {
        void cacheRemoteFoodItems(remoteMatches).catch((cacheError) => {
          console.warn('[FoodTab] Failed to cache Quick Log food results:', getErrorMessage(cacheError));
        });
      }

      return remoteMatches[0] ?? null;
    } catch (error) {
      console.warn('[FoodTab] Quick Log backend food search skipped:', getErrorMessage(error));
      return null;
    }
  }, []);

  const handleQuickParse = useCallback(async () => {
    if (isQuickParsing || isQuickSaving) return;

    setQuickParsing(true);
    setQuickError(null);

    try {
      const parsed = await parseFoodDescription(quickInput);
      const nextItems: QuickParserMatchedItem[] = [];

      for (const [index, item] of parsed.items.entries()) {
        const matchedFood = await findQuickFoodMatch(item);

        if (!matchedFood) {
          nextItems.push({
            id: `quick_unmatched_${Date.now()}_${index}`,
            parsedName: item.foodName,
            quantity: item.quantity,
            unit: item.unit,
            matchedName: null,
            calories: null,
            protein: null,
            carbs: null,
            fat: null,
            status: 'unmatched',
            message: 'No database match found. Remove it or add it manually from search.',
            entry: null,
            sourceFoodId: null,
          });
          continue;
        }

        const entry = buildQuickParserEntry(item, matchedFood, quickMealId, index);
        if (!entry) {
          nextItems.push({
            id: `quick_review_${Date.now()}_${index}`,
            parsedName: item.foodName,
            quantity: item.quantity,
            unit: item.unit,
            matchedName: matchedFood.name,
            calories: null,
            protein: null,
            carbs: null,
            fat: null,
            status: 'needs_review',
            message: `Matched ${matchedFood.name}, but ${item.unit} needs a known portion. Add it manually from search.`,
            entry: null,
            sourceFoodId: matchedFood.id,
          });
          continue;
        }

        nextItems.push({
          id: entry.id,
          parsedName: item.foodName,
          quantity: item.quantity,
          unit: item.unit,
          matchedName: matchedFood.name,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          status: 'ready',
          message: 'Ready to add.',
          entry,
          sourceFoodId: matchedFood.id,
        });
      }

      setQuickItems(nextItems);
      if (!nextItems.some((item) => item.status === 'ready')) {
        setQuickError('No parsed foods are ready to add yet. Remove unresolved items or add them manually from search.');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      setQuickItems([]);
      setQuickError(message);
    } finally {
      setQuickParsing(false);
    }
  }, [findQuickFoodMatch, isQuickParsing, isQuickSaving, quickInput, quickMealId]);

  const handleQuickConfirm = useCallback(async () => {
    if (isQuickSaving || isSavingLog) return;

    const readyItems = quickItems.filter((item) => item.status === 'ready' && item.entry);
    if (readyItems.length === 0) {
      setQuickError('No matched foods are ready to add.');
      return;
    }

    setQuickSaving(true);
    setIsSavingLog(true);
    setQuickError(null);

    try {
      const loggedAt = new Date().toISOString();
      for (const item of readyItems) {
        if (!item.entry) continue;
        const entry = {
          ...item.entry,
          mealId: quickMealId,
        };

        await saveDietLogLocalFirst(
          entry,
          loggedAt,
          item.sourceFoodId,
          `Logged to ${quickMealId}: ${entry.name}`
        );

        if (item.sourceFoodId) {
          void markFoodLastUsed(item.sourceFoodId).catch((error) => {
            console.warn('[FoodTab] Failed to mark Quick Log food used:', getErrorMessage(error));
          });
        }
      }

      setQuickItems((items) => items.filter((item) => item.status !== 'ready'));
      if (quickItems.length === readyItems.length) {
        setQuickInput('');
      }
      triggerToast(`Added ${readyItems.length} Quick Log item${readyItems.length === 1 ? '' : 's'}.`);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[Gemi] Failed to save Quick Log items:', message);
      setQuickError(`Failed to save: ${message}`);
      triggerToast(`Failed to save: ${message}`);
    } finally {
      setIsSavingLog(false);
      setQuickSaving(false);
    }
  }, [isQuickSaving, isSavingLog, quickItems, quickMealId, saveDietLogLocalFirst, triggerToast]);

  const handleQuickClear = useCallback(() => {
    setQuickInput('');
    setQuickItems([]);
    setQuickError(null);
  }, []);

  const handleQuickRemoveItem = useCallback((id: string) => {
    setQuickItems((items) => items.filter((item) => item.id !== id));
  }, []);

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
            await markDietLogDeleteSyncFailed(userId, id).catch((markError) => {
              console.error('[Gemi] Failed to mark deleted diet log sync failed:', markError);
            });
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
    updatedEntry: FoodLogEntry
  ) => {
    if (!userId) {
      triggerToast('Please log in before editing food logs.');
      return;
    }

    if (isSavingLog) return;

    setIsSavingLog(true);
    try {
      const updatedLocalLog = await updateLocalDietLog(userId, updatedEntry.id, {
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

      setFoodLogs((prev) => prev.map((item) => (item.id === updatedEntry.id ? localEntry : item)));
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

        <QuickParserCard
          value={quickInput}
          mealId={quickMealId}
          items={quickItems}
          isParsing={isQuickParsing}
          isSaving={isQuickSaving}
          error={quickError}
          onChangeText={setQuickInput}
          onMealChange={setQuickMealId}
          onParse={handleQuickParse}
          onConfirm={handleQuickConfirm}
          onClear={handleQuickClear}
          onRemoveItem={handleQuickRemoveItem}
        />

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
        targets={targets}
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
