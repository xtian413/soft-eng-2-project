import { useState, useEffect, useCallback } from 'react';
import { getDietLogsByUserAndDateRange } from '@/local/repositories/dietLogsRepository';
import { getDailyLogByDate } from '@/local/repositories/dailyLogsRepository';
import {
  getRecentWorkoutsByUser,
  getWorkoutsByUser,
} from '@/local/repositories/workoutsRepository';
import { localDietLogToFoodLogEntry } from '@/local/dietLogsMapper';
import type { FoodLogEntry, MacroTargets } from '@/screens/dashboard/types';
import type { LocalDailyLog, LocalWorkoutWithSets } from '@/local/schema';

export interface DateHistoryData {
  foodLogs: FoodLogEntry[];
  dailyLog: LocalDailyLog | null;
  workouts: LocalWorkoutWithSets[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches all history data (diet logs, daily log, workouts) for a given date.
 */
export function useDateHistory(
  userId: string | null,
  date: string
): DateHistoryData & { refetch: () => void } {
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([]);
  const [dailyLog, setDailyLog] = useState<LocalDailyLog | null>(null);
  const [workouts, setWorkouts] = useState<LocalWorkoutWithSets[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId || !date) {
      setFoodLogs([]);
      setDailyLog(null);
      setWorkouts([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const startIso = `${date}T00:00:00.000Z`;
        const endIso = `${date}T23:59:59.999Z`;

        // Fetch all three data sources in parallel
        const [localDietLogs, localDaily, localWorkouts] = await Promise.all([
          getDietLogsByUserAndDateRange(userId!, startIso, endIso),
          getDailyLogByDate(userId!, date),
          getWorkoutsByUser(userId!),
        ]);

        if (cancelled) return;

        // Filter workouts to the selected date
        const dateWorkouts = localWorkouts.filter((w) =>
          w.performed_at.startsWith(date)
        );

        setFoodLogs(
          localDietLogs.length > 0
            ? localDietLogs.map(localDietLogToFoodLogEntry)
            : []
        );
        setDailyLog(localDaily);
        setWorkouts(dateWorkouts);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load date history'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, date, tick]);

  return { foodLogs, dailyLog, workouts, loading, error, refetch };
}
