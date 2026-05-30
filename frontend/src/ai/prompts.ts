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

const MAX_CONTEXT_WORKOUTS = 3;
const MAX_CONTEXT_DIET_LOGS = 3;
const MAX_SETS_PER_WORKOUT = 4;

function buildChatMlPrompt(systemContent: string, userContent: string) {
  return [
    '<|im_start|>system',
    systemContent.trim(),
    '<|im_end|>',
    '<|im_start|>user',
    userContent.trim(),
    '<|im_end|>',
    '<|im_start|>assistant',
  ].join('\n');
}

function formatPromptDate(value: string) {
  return value.includes('T') ? value.split('T')[0] : value;
}

function getSmallTalkType(message: string) {
  const normalized = message.trim().toLowerCase().replace(/[.!?]+$/g, '');
  if ([
    'hi',
    'hello',
    'hey',
    'hiya',
    'yo',
    'sup',
    'good morning',
    'good afternoon',
    'good evening',
  ].includes(normalized)) {
    return 'greeting';
  }

  if ([
    'thanks',
    'thank you',
    'ty',
  ].includes(normalized)) {
    return 'thanks';
  }

  return null;
}

function isSmallTalkMessage(message: string) {
  return getSmallTalkType(message) !== null;
}

export function getInstantFreeChatResponse(userMessage: string, userName: string) {
  const smallTalkType = getSmallTalkType(userMessage);
  if (smallTalkType === 'greeting') {
    return `Hi ${userName || 'there'}, how can I help with your fitness or nutrition today?`;
  }
  if (smallTalkType === 'thanks') {
    return 'You are welcome. I am here when you want help with training, meals, or recovery.';
  }
  return null;
}

function formatWorkoutSummary(workouts: WorkoutLog[]) {
  if (workouts.length === 0) {
    return 'No workouts logged in the recent period.';
  }
  return workouts
    .slice(-MAX_CONTEXT_WORKOUTS)
    .map((workout) => {
      const setLines = workout.sets
        .slice(0, MAX_SETS_PER_WORKOUT)
        .map((set, idx) => {
          const reps = typeof set.reps === 'number' ? `${set.reps} reps` : null;
          const weight = typeof set.weightKg === 'number' ? `${set.weightKg} kg` : null;
          const duration =
            typeof set.durationSeconds === 'number' ? `${set.durationSeconds}s` : null;
          const details = [reps, weight, duration].filter(Boolean).join(', ');
          return `set ${idx + 1}: ${set.exercise}${details ? ` (${details})` : ''}`;
        })
        .join('; ');
      const omittedSets = workout.sets.length - MAX_SETS_PER_WORKOUT;
      const moreSets = omittedSets > 0 ? `; ${omittedSets} more sets` : '';
      const notes = workout.notes ? ` Notes: ${workout.notes}` : '';
      return `${workout.name} on ${formatPromptDate(workout.performedAt)}. ${setLines || 'No sets recorded'}${moreSets}.${notes}`;
    })
    .join('\n');
}

function formatDietSummary(dietLogs: DietLog[]) {
  if (dietLogs.length === 0) {
    return 'No diet logs recorded recently.';
  }
  return dietLogs
    .slice(-MAX_CONTEXT_DIET_LOGS)
    .map((log) => {
      const calories = typeof log.calories === 'number' ? `${log.calories} kcal` : 'calories n/a';
      const macros = [
        typeof log.proteinG === 'number' ? `${log.proteinG}g protein` : null,
        typeof log.carbsG === 'number' ? `${log.carbsG}g carbs` : null,
        typeof log.fatG === 'number' ? `${log.fatG}g fat` : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `${log.mealName} on ${formatPromptDate(log.loggedAt)}: ${calories}${macros ? `, ${macros}` : ''}`;
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

  return buildChatMlPrompt(
    [
      'You are Gemi, an offline on-device fitness coach.',
      'Give practical, supportive insight in plain conversational text.',
      'Do not use markdown, headings, bullet characters, or LaTeX.',
    ].join(' '),
    [
      `User name: ${userName}`,
      '',
      'Use this context only:',
      '',
      'Recent workouts:',
      workoutSummary,
      '',
      'Recent diet logs:',
      dietSummary,
      '',
      'Task: Mention one positive trend, one useful improvement, and one next step for the next workout or meal. Keep it under 120 words.',
    ].join('\n')
  );
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
  const includeTrainingContext = !isSmallTalkMessage(userMessage);
  const workoutSummary = includeTrainingContext
    ? formatWorkoutSummary(workoutData)
    : 'No training context needed for this short social message.';
  const dietSummary = includeTrainingContext
    ? formatDietSummary(dietData)
    : 'No diet context needed for this short social message.';

  const profileSection = userProfile
    ? `User profile: ${typeof userProfile.heightCm === 'number' ? `${userProfile.heightCm} cm` : 'height N/A'}, ${typeof userProfile.weightKg === 'number' ? `${userProfile.weightKg} kg` : 'weight N/A'}, goal ${userProfile.goal || 'N/A'}.`
    : 'User profile: not provided.';

  return buildChatMlPrompt(
    [
      'You are Gemi, an offline on-device fitness and nutrition coach.',
      'Answer the latest user message directly and naturally.',
      'For greetings, just greet the user and ask how you can help.',
      'Do not invent workouts, meals, or progress.',
      'Use plain conversational text with no markdown.',
      'Keep replies to 1 to 3 short sentences unless the user asks for details.',
    ].join(' '),
    [
      `User name: ${userName}`,
      profileSection,
      '',
      'Recent workouts:',
      workoutSummary,
      '',
      'Recent diet logs:',
      dietSummary,
      '',
      `Latest user message: ${userMessage}`,
    ].join('\n')
  );
}
