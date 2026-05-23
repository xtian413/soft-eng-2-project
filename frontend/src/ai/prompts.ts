export type WorkoutSet = {
  exercise: string;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
};

export type WorkoutLog = {
  id: string;
  name: string;
  performedAt: string;
  notes?: string;
  sets: WorkoutSet[];
};

export type DietLog = {
  id: string;
  mealName: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  loggedAt: string;
};

function formatWorkoutSummary(workouts: WorkoutLog[]) {
  if (workouts.length === 0) {
    return 'No workouts logged in the recent period.';
  }
  return workouts
    .map((workout) => {
      const setLines = workout.sets
        .map((set, idx) => {
          const reps = set.reps ? `${set.reps} reps` : 'reps n/a';
          const weight = set.weightKg ? `${set.weightKg}kg` : 'weight n/a';
          const duration = set.durationSeconds ? `${set.durationSeconds}s` : undefined;
          const details = [reps, weight, duration].filter(Boolean).join(', ');
          return `  - Set ${idx + 1}: ${set.exercise} (${details})`;
        })
        .join('\n');
      return `• ${workout.name} (${workout.performedAt})${workout.notes ? ` — ${workout.notes}` : ''}\n${setLines}`;
    })
    .join('\n');
}

function formatDietSummary(dietLogs: DietLog[]) {
  if (dietLogs.length === 0) {
    return 'No diet logs recorded recently.';
  }
  return dietLogs
    .map((log) => {
      const calories = typeof log.calories === 'number' ? `${log.calories} kcal` : 'calories n/a';
      const macros = [
        typeof log.proteinG === 'number' ? `${log.proteinG}g protein` : null,
        typeof log.carbsG === 'number' ? `${log.carbsG}g carbs` : null,
        typeof log.fatG === 'number' ? `${log.fatG}g fat` : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `• ${log.mealName} (${log.loggedAt}) — ${calories}${macros ? `, ${macros}` : ''}`;
    })
    .join('\n');
}

export function buildWorkoutInsightPrompt(
  userName: string,
  workoutData: WorkoutLog[],
  dietData: DietLog[]
) {
  const workoutSummary = formatWorkoutSummary(workoutData);
  const dietSummary = formatDietSummary(dietData);

  return [
    `You are Gemi, an offline on-device fitness coach. Respond with practical, supportive insight.`,
    `User: ${userName}`,
    '',
    'Recent workouts:',
    workoutSummary,
    '',
    'Recent diet logs:',
    dietSummary,
    '',
    'Task:',
    '- Identify 1-2 positive trends.',
    '- Identify 1-2 improvements (recovery, training balance, or nutrition).',
    '- Provide 1 actionable next step for the next workout or meal.',
    'Keep the response concise (5-8 sentences).',
  ].join('\n');
}
