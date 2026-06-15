import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { fetchWorkouts } from '@/api/workoutApi';
import { fetchProgressEntries, type ProgressEntry } from '@/api/progressApi';
import { supabase } from '@/lib/supabase';
import { retryPendingProfileSync } from '@/local/profileSync';
import { retryPendingBodyProgressCreates } from '@/local/bodyProgressSync';
import {
  getBodyProgressByUser,
  upsertRemoteBodyProgressForUser,
} from '@/local/repositories/bodyProgressRepository';
import {
  upsertLocalProfile,
  getProfileByUser,
} from '@/local/repositories/profilesRepository';
import {
  getWorkoutsByUser,
  upsertRemoteWorkoutForUser,
} from '@/local/repositories/workoutsRepository';
import type { LocalBodyProgress, LocalWorkoutWithSets } from '@/local/schema';
import { useAuthStore } from '@/store/authStore';
import {
  startOfWeek, endOfWeek, isToday, parseISO, format
} from 'date-fns';

export interface CalendarDay {
  dayLabel: string;    // 'Sun', 'Mon', 'Tue'...
  dateNum: number;     // 25, 26, 27...
  dateStr: string;     // 'YYYY-MM-DD'
  workoutName: string; // 'Push', 'Legs', or '–'
  workoutType: string; // 'push'|'pull'|'legs'|'rest'|'other'|'empty'
  isToday: boolean;
  isClickable: boolean;
  hasActivity?: boolean;
}

export interface ProfileStats {
  setsToday: number;
  setsWeek: number;
  setsMonth: number;
  setsAllTime: number;
  weekStreak: number;
  weightEntries: ProgressEntry[];
  calendarDays: CalendarDay[];
  muscleGroupWeeklySets: Record<string, number>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function bodyProgressToProgressEntry(row: LocalBodyProgress): ProgressEntry {
  return {
    id: row.remote_id ?? row.id,
    weight_kg: row.weight_kg,
    recorded_at: row.recorded_at,
  };
}

function getRecentProgressEntries(entries: ProgressEntry[]) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return entries
    .filter((entry) => new Date(entry.recorded_at) >= cutoff)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
}

/** Maps a workout name string to a color-code key */
function classifyWorkout(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('push') || n.includes('chest') || n.includes('shoulder') || n.includes('tricep')) return 'push';
  if (n.includes('pull') || n.includes('back') || n.includes('row') || n.includes('bicep')) return 'pull';
  if (n.includes('leg') || n.includes('squat') || n.includes('deadlift') || n.includes('glute')) return 'legs';
  if (n.includes('rest') || n.includes('recovery')) return 'rest';
  return 'other';
}

/** Calculates consecutive week streak (Mon–Sun) from workout history */
function calcStreak(workouts: LocalWorkoutWithSets[]): number {
  if (workouts.length === 0) return 0;

  const weeksWithWorkout = new Set(
    workouts.map(w =>
      format(startOfWeek(parseISO(w.performed_at), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    )
  );

  let streak = 0;
  let cursor = startOfWeek(new Date(), { weekStartsOn: 1 });

  while (true) {
    const key = format(cursor, 'yyyy-MM-dd');
    if (weeksWithWorkout.has(key)) {
      streak++;
      cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }
  return streak;
}

/** Builds 7 CalendarDay entries for the current week (Sun–Sat) */
function buildCalendar(workouts: LocalWorkoutWithSets[]): CalendarDay[] {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });

  const workoutMap = new Map<string, LocalWorkoutWithSets>();
  workouts.forEach(w => {
    const key = w.performed_at.split('T')[0];
    workoutMap.set(key, w);
  });

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const workout = workoutMap.get(dateStr);
    const workoutType = workout ? classifyWorkout(workout.name) : 'empty';
    const workoutName = workout ? workout.name.split(' ')[0] : '–';

    return {
      dayLabel: DAY_LABELS[i],
      dateNum: d.getDate(),
      dateStr,
      workoutName,
      workoutType,
      isToday: isToday(d),
      isClickable: !!workout && workoutType !== 'rest',
    };
  });
}

function calculateSetCounts(workouts: LocalWorkoutWithSets[]) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const curWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const curMonthStr = format(now, 'yyyy-MM');

  let today = 0;
  let week = 0;
  let month = 0;
  let allTime = 0;
  const muscleGroupCount: Record<string, number> = {};

  workouts.forEach((w) => {
    const wDate = parseISO(w.performed_at);
    const wDateStr = w.performed_at.split('T')[0];
    const wWeekStart = format(startOfWeek(wDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const wMonthStr = format(wDate, 'yyyy-MM');

    let wSets = 0;
    if (w.sets) {
      wSets = w.sets.length;
      if (wWeekStart === curWeekStart) {
        w.sets.forEach((set) => {
          if (set.muscle_group) {
            muscleGroupCount[set.muscle_group] = (muscleGroupCount[set.muscle_group] || 0) + 1;
          }
        });
      }
    }

    allTime += wSets;
    if (wDateStr === todayStr) {
      today += wSets;
    }
    if (wWeekStart === curWeekStart) {
      week += wSets;
    }
    if (wMonthStr === curMonthStr) {
      month += wSets;
    }
  });

  // Sort by count descending
  const sorted = Object.entries(muscleGroupCount)
    .sort(([, a], [, b]) => b - a)
    .reduce((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {} as Record<string, number>);

  return {
    today,
    week,
    month,
    allTime,
    muscleGroupWeeklySets: sorted,
  };
}

/** Main hook — fetches all profile stats in parallel */
export function useProfileStats(): ProfileStats {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [setsToday, setSetsToday] = useState(0);
  const [setsWeek, setSetsWeek] = useState(0);
  const [setsMonth, setSetsMonth] = useState(0);
  const [setsAllTime, setSetsAllTime] = useState(0);
  const [weekStreak, setWeekStreak] = useState(0);
  const [weightEntries, setWeightEntries] = useState<ProgressEntry[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [muscleGroupWeeklySets, setMuscleGroupWeeklySets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refetch = () => setTick(t => t + 1);

  const refreshLocalBodyProgress = useCallback(async () => {
    if (!userId) {
      setWeightEntries([]);
      return;
    }

    const localRows = await getBodyProgressByUser(userId);
    setWeightEntries(getRecentProgressEntries(localRows.map(bodyProgressToProgressEntry)));
  }, [userId]);

  const retryAndRefreshLocalBodyProgress = useCallback(async () => {
    if (!userId) return;

    try {
      await retryPendingProfileSync(userId);
      await retryPendingBodyProgressCreates(userId);
      await refreshLocalBodyProgress();
    } catch (err) {
      console.warn('[Gemi] Profile foreground retry skipped:', err);
    }
  }, [refreshLocalBodyProgress, userId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (userId) {
        try {
          const localRows = await getBodyProgressByUser(userId);
          if (cancelled) return;

          setWeightEntries(getRecentProgressEntries(localRows.map(bodyProgressToProgressEntry)));
          setLoading(false);

          await retryPendingProfileSync(userId);
          if (cancelled) return;

          await retryPendingBodyProgressCreates(userId);
          if (cancelled) return;

          const retriedRows = await getBodyProgressByUser(userId);
          if (cancelled) return;

          setWeightEntries(getRecentProgressEntries(retriedRows.map(bodyProgressToProgressEntry)));
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Failed to load local body progress');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        setWeightEntries([]);
        setLoading(false);
      }

      try {
        const remoteWorkouts = await fetchWorkouts();
        if (cancelled) return;

        if (userId) {
          // Sync remote workouts (which now include sets) to local SQLite database sequentially
          // to prevent concurrent transaction attempts in SQLite (cannot start a transaction within a transaction)
          for (const rw of remoteWorkouts) {
            await upsertRemoteWorkoutForUser(userId, {
              id: rw.id,
              name: rw.name,
              notes: rw.notes,
              performed_at: rw.performed_at,
              created_at: rw.created_at,
              workout_sets: rw.workout_sets,
            });
          }
        }

        // Fetch all local workouts with their sets from local SQLite DB
        const workouts = userId ? await getWorkoutsByUser(userId) : [];
        if (cancelled) return;

        // Calculate sets client-side
        const setCounts = calculateSetCounts(workouts);
        setSetsToday(setCounts.today);
        setSetsWeek(setCounts.week);
        setSetsMonth(setCounts.month);
        setSetsAllTime(setCounts.allTime);
        setMuscleGroupWeeklySets(setCounts.muscleGroupWeeklySets);

        // Week streak
        setWeekStreak(calcStreak(workouts));

        // Calendar: filter to current week
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
        const thisWeek = workouts.filter(w => {
          const d = parseISO(w.performed_at);
          return d >= weekStart && d <= weekEnd;
        });
        setCalendarDays(buildCalendar(thisWeek));

      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load profile stats');
        }
      }

      try {
        const remoteProgress = await fetchProgressEntries();
        if (cancelled) return;

        if (userId) {
          await upsertRemoteBodyProgressForUser(userId, remoteProgress);
          if (cancelled) return;

          const mergedRows = await getBodyProgressByUser(userId);
          if (cancelled) return;

          const newestWeight = mergedRows[mergedRows.length - 1]?.weight_kg;
          if (typeof newestWeight === 'number') {
            const profile = await getProfileByUser(userId);
            const currentBaseWeight = profile?.weight_kg;
            let shouldUpdateBaseWeight = false;

            if (!currentBaseWeight) {
              shouldUpdateBaseWeight = true;
            } else {
              const diff = Math.abs(newestWeight - currentBaseWeight);
              if (diff >= 2.0) {
                shouldUpdateBaseWeight = true;
              }
            }

            await upsertLocalProfile({
              user_id: userId,
              current_weight_kg: newestWeight,
              ...(shouldUpdateBaseWeight ? { weight_kg: newestWeight } : {}),
            });
            void retryPendingProfileSync(userId);
          }

          setWeightEntries(getRecentProgressEntries(mergedRows.map(bodyProgressToProgressEntry)));
        } else {
          setWeightEntries(getRecentProgressEntries(remoteProgress));
        }
      } catch (err) {
        console.warn('[Gemi] Remote body-progress refresh skipped:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick, userId]);

  useEffect(() => {
    if (!userId) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        nextAppState === 'active' &&
        (previousAppState === 'background' || previousAppState === 'inactive')
      ) {
        void retryAndRefreshLocalBodyProgress();
      }
    });

    return () => subscription.remove();
  }, [retryAndRefreshLocalBodyProgress, userId]);

  return {
    setsToday,
    setsWeek,
    setsMonth,
    setsAllTime,
    weekStreak,
    weightEntries,
    calendarDays,
    muscleGroupWeeklySets,
    loading,
    error,
    refetch,
  };
}
