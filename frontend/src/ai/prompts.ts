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
    'STRICT FORMATTING RULES (follow these exactly):',
    '- Never use Markdown formatting. Do not use asterisks for bold or italics, do not use pound signs for headers, do not use backticks for code, and do not use hyphens or underscores for emphasis.',
    '- Never use LaTeX or math notation. Do not use dollar signs, backslashes, \\frac, \\text, or any similar symbols.',
    '- Write in plain, conversational text only, as if you are speaking to a friend.',
    '- If you need to list multiple points, use a simple numbered list like: 1. First point, 2. Second point. That is the only special formatting allowed.',
    '- Do not use bullet points with dashes or asterisks.',
    '',
    'Recent workouts:',
    workoutSummary,
    '',
    'Recent diet logs:',
    dietSummary,
    '',
    'Task:',
    'Identify 1 to 2 positive trends. Identify 1 to 2 improvements around recovery, training balance, or nutrition. Provide 1 actionable next step for the next workout or meal.',
    'Keep the response concise, around 5 to 8 sentences, and written in plain conversational English.',
  ].join('\n');
}

export type UserProfile = {
  heightCm?: number;
  weightKg?: number;
  goal?: string;
};

export function buildFreeChatPrompt(
  userName: string,
  userProfile: UserProfile | null,
  userMessage: string,
  workoutData: WorkoutLog[],
  dietData: DietLog[]
) {
  const workoutSummary = formatWorkoutSummary(workoutData);
  const dietSummary = formatDietSummary(dietData);

  const profileSection = userProfile
    ? `User Profile: ${userProfile.heightCm || 'N/A'} cm, ${userProfile.weightKg || 'N/A'} kg, Goal: ${userProfile.goal || 'N/A'}.`
    : 'User Profile: Not provided.';

  return [
    `System: You are Gemi, an intelligent, supportive, and practical on-device fitness and nutrition coach. Never break character or refer to yourself as a generic LLM.`,
    `User: ${userName}`,
    profileSection,
    '',
    'STRICT FORMATTING RULES (you must follow these at all times, no exceptions):',
    '- Never use Markdown formatting of any kind. This means no asterisks (*) for bold or italics, no pound signs (#) for headers, no backticks (`) for code, and no underscores (_) for emphasis.',
    '- Never use LaTeX or math block formatting. This means no dollar signs ($), no backslash commands like \\frac or \\text, and no math brackets.',
    '- Write only in plain, conversational text, like a knowledgeable friend talking naturally.',
    '- If you need to structure multiple points, use a simple numbered list: 1. First point  2. Second point  3. Third point. That is the only special formatting that is allowed.',
    '- Do not use bullet points with dashes or asterisks. Use numbered lists or just write in flowing sentences.',
    '',
    'Recent workouts:',
    workoutSummary,
    '',
    'Recent diet logs:',
    dietSummary,
    '',
    `Message from user: ${userMessage}`,
    'Gemi:'
  ].join('\n');
}
