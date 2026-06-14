import type { DietLog, UserProfile, WorkoutLog } from './prompts';
import type { RoutedCoachIntent } from './router/intentTypes';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeMessage(message: string) {
  return message.toLowerCase().replace(/\s+/g, ' ').trim();
}

function formatGoal(goal?: string) {
  if (!goal) return 'your goal';
  return goal.replace(/_/g, ' ');
}

function parseWorkoutTime(workout: WorkoutLog) {
  const time = new Date(workout.performedAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getWorkoutVolume(workout: WorkoutLog) {
  return workout.sets.reduce((total, set) => {
    if (typeof set.reps === 'number' && typeof set.weightKg === 'number') {
      return total + set.reps * set.weightKg;
    }
    return total;
  }, 0);
}

function getAverage(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatExerciseList(workouts: WorkoutLog[]) {
  const counts = new Map<string, number>();
  for (const workout of workouts) {
    for (const set of workout.sets) {
      const exercise = set.exercise.trim();
      if (!exercise) continue;
      counts.set(exercise, (counts.get(exercise) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([exercise]) => exercise)
    .join(', ');
}

function buildProgressAnalysis(workouts: WorkoutLog[]) {
  const now = Date.now();
  const recentWorkouts = workouts
    .filter((workout) => {
      const time = parseWorkoutTime(workout);
      return time > 0 && now - time <= THIRTY_DAYS_MS;
    })
    .sort((a, b) => parseWorkoutTime(a) - parseWorkoutTime(b));

  if (recentWorkouts.length === 0) {
    return 'I cannot judge your last 30 days yet because I do not see logged workouts in that period. Log your sessions with exercises, sets, reps, and weight, then I can compare training frequency, volume, and key lift performance.';
  }

  if (recentWorkouts.length === 1) {
    return 'I only see one logged workout in the last 30 days, so I cannot confidently say whether performance improved. Keep logging each session with sets, reps, and weight. After a few workouts, I can compare consistency, volume, and your main lifts.';
  }

  const midpoint = Math.ceil(recentWorkouts.length / 2);
  const firstHalf = recentWorkouts.slice(0, midpoint);
  const secondHalf = recentWorkouts.slice(midpoint);
  const firstHalfVolume = getAverage(firstHalf.map(getWorkoutVolume));
  const secondHalfVolume = getAverage(secondHalf.map(getWorkoutVolume));
  const firstHalfSets = getAverage(firstHalf.map((workout) => workout.sets.length));
  const secondHalfSets = getAverage(secondHalf.map((workout) => workout.sets.length));
  const topExercises = formatExerciseList(recentWorkouts);

  if (secondHalf.length === 0) {
    return 'I need a few more logged workouts before I can compare your recent performance trend. Keep logging exercises, sets, reps, and weight so I can separate real progress from one good or bad session.';
  }

  const volumeTrend =
    secondHalfVolume > firstHalfVolume * 1.05
      ? 'Your logged training volume is trending up.'
      : secondHalfVolume < firstHalfVolume * 0.95
        ? 'Your logged training volume is trending down.'
        : 'Your logged training volume looks fairly stable.';
  const setTrend =
    secondHalfSets > firstHalfSets + 1
      ? 'You are also doing more sets per workout lately.'
      : secondHalfSets < firstHalfSets - 1
        ? 'You are doing fewer sets per workout lately.'
        : 'Your set count per workout is about the same.';

  return [
    `Based on ${recentWorkouts.length} logged workouts in the last 30 days, ${volumeTrend}`,
    setTrend,
    topExercises ? `Your most logged exercises were ${topExercises}.` : null,
    'For a stronger progress check, keep logging the same key lifts so I can compare reps and load exercise by exercise.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildComputedCoachContext(options: {
  route: RoutedCoachIntent;
  userMessage: string;
  userProfile: UserProfile | null;
  workouts: WorkoutLog[];
  dietLogs: DietLog[];
}) {
  const message = normalizeMessage(options.userMessage);
  const goal = formatGoal(options.userProfile?.goal);
  const facts: string[] = [];

  if (options.route.intent === 'progress_analysis') {
    facts.push(`Computed progress read: ${buildProgressAnalysis(options.workouts)}`);
  }

  if (message.includes('goal')) {
    facts.push(
      `User goal context: The user's current goal is ${goal}. Coach toward training, nutrition, and recovery steps that support this goal.`,
    );
  }

  if (options.route.intent === 'injury_or_pain') {
    facts.push(
      'Safety context: Do not diagnose injuries or prescribe rehabilitation. Encourage stopping painful movements, using pain-free alternatives, and seeing a qualified clinician for persistent, worsening, swollen, numb, weak, or daily-life-limiting symptoms.',
    );
  }

  if (message.includes('rehab') || message.includes('prehab') || message.includes('physio')) {
    facts.push(
      'Rehab context: The user is asking about self-rehab. Keep advice general, pain-free, and conservative. Do not give a detailed rehab protocol.',
    );
  }

  return facts.length > 0 ? facts.join('\n') : null;
}
