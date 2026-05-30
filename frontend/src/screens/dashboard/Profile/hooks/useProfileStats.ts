import { useState, useEffect } from 'react';
import { fetchWorkouts, type Workout } from '@/api/workoutApi';
import { fetchProgressEntries, type ProgressEntry } from '@/api/progressApi';
import { supabase } from '@/lib/supabase';
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
}

export interface ProfileStats {
  totalVolumeKg: number;
  weekStreak: number;
  weightEntries: ProgressEntry[];
  calendarDays: CalendarDay[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
function calcStreak(workouts: Workout[]): number {
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
function buildCalendar(workouts: Workout[]): CalendarDay[] {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });

  const workoutMap = new Map<string, Workout>();
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

/** Fetches total volume for current user via the user_workout_volume view */
async function fetchTotalVolume(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from('user_workout_volume')
    .select('total_volume_kg')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return 0;
  return Number(data.total_volume_kg) ?? 0;
}

/** Main hook — fetches all profile stats in parallel */
export function useProfileStats(): ProfileStats {
  const [totalVolumeKg, setTotalVolumeKg] = useState(0);
  const [weekStreak, setWeekStreak] = useState(0);
  const [weightEntries, setWeightEntries] = useState<ProgressEntry[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = () => setTick(t => t + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [workouts, progress, volume] = await Promise.all([
          fetchWorkouts(),
          fetchProgressEntries(),
          fetchTotalVolume(),
        ]);

        if (cancelled) return;

        // Total volume
        setTotalVolumeKg(volume);

        // Week streak
        setWeekStreak(calcStreak(workouts));

        // Weight entries: last 30 days, oldest first for chart
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const recent = progress
          .filter(p => new Date(p.recorded_at) >= cutoff)
          .reverse();
        setWeightEntries(recent);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  return { totalVolumeKg, weekStreak, weightEntries, calendarDays, loading, error, refetch };
}
