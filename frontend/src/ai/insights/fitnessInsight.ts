import type { FoodLogEntry, MacroTargets } from '@/screens/dashboard/types';
import { retrieveEvidence } from '@/ai/rag/retrieveEvidence';
import type { EvidenceCard } from '@/ai/rag/evidenceTypes';
import type { RoutedCoachIntent } from '@/ai/router/intentTypes';
import type { WorkoutLog } from '@/ai/prompts';

export type FitnessInsightInput = {
  userName: string;
  goal: string;
  weightKg: number;
  heightCm: number;
  targets: MacroTargets;
  foodLogs: FoodLogEntry[];
  workouts: WorkoutLog[];
};

export type FitnessInsight = {
  title: string;
  summary: string;
  nutrition: string;
  training: string;
  nextStep: string;
  confidence: string;
};

export type FitnessInsightChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type FitnessInsightQuality = {
  isUsable: boolean;
  reasons: string[];
};

const INSIGHT_ROUTE: RoutedCoachIntent = {
  intent: 'progress_analysis',
  answerMode: 'analysis',
  shouldUseModel: true,
};

const EMPTY_MODEL_INSIGHT: FitnessInsight = {
  title: 'Insight Needs Retry',
  summary: 'The on-device model did not return a complete insight.',
  nutrition: 'Tap Regenerate to ask the local model for a fresh nutrition analysis.',
  training: 'Training analysis will appear after the local model returns a usable section.',
  nextStep: 'Tap Regenerate.',
  confidence: 'low: model output could not be parsed.',
};

const INSIGHT_LABELS = ['TITLE', 'SUMMARY', 'NUTRITION', 'TRAINING', 'NEXT', 'CONFIDENCE'];

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

function formatGoal(goal: string) {
  return goal.replace(/_/g, ' ');
}

function roundNumber(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function percentOfTarget(value: number, target: number) {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.round((value / target) * 100));
}

function sumFood(foodLogs: FoodLogEntry[]) {
  return foodLogs.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fats: total.fats + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

function workoutVolume(workout: WorkoutLog) {
  return workout.sets.reduce((total, set) => {
    if (typeof set.reps === 'number' && typeof set.weightKg === 'number') {
      return total + set.reps * set.weightKg;
    }
    return total;
  }, 0);
}

function daysSince(dateValue: string) {
  const timestamp = new Date(dateValue).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const now = Date.now();
  return Math.max(0, Math.floor((now - timestamp) / (24 * 60 * 60 * 1000)));
}

function buildWorkoutSummary(workouts: WorkoutLog[], limit = 2) {
  if (workouts.length === 0) {
    return 'No workout logs available.';
  }

  return workouts
    .slice(-limit)
    .map((workout) => {
      const volume = roundNumber(workoutVolume(workout));
      const exercises = [...new Set(workout.sets.map((set) => set.exercise).filter(Boolean))]
        .slice(0, 4)
        .join(', ');
      return `${workout.name} on ${workout.performedAt.split('T')[0]}: ${workout.sets.length} sets, ${volume}kg volume${exercises ? `, exercises: ${exercises}` : ''}`;
    })
    .join('\n');
}

function buildMealSummary(foodLogs: FoodLogEntry[], limit = 3) {
  if (foodLogs.length === 0) {
    return 'No meals logged today.';
  }

  return foodLogs
    .slice(-limit)
    .map((item) =>
      `${item.name}: ${roundNumber(item.calories)} kcal, ${roundNumber(item.protein)}g protein, ${roundNumber(item.carbs)}g carbs, ${roundNumber(item.fat)}g fat`,
    )
    .join('\n');
}

function buildRankedSignals(input: FitnessInsightInput) {
  const totals = sumFood(input.foodLogs);
  const macroGaps = [
    {
      label: 'protein',
      current: roundNumber(totals.protein),
      target: input.targets.protein,
      delta: roundNumber(totals.protein - input.targets.protein),
      percent: percentOfTarget(totals.protein, input.targets.protein),
      unit: 'g',
    },
    {
      label: 'carbs',
      current: roundNumber(totals.carbs),
      target: input.targets.carbs,
      delta: roundNumber(totals.carbs - input.targets.carbs),
      percent: percentOfTarget(totals.carbs, input.targets.carbs),
      unit: 'g',
    },
    {
      label: 'fats',
      current: roundNumber(totals.fats),
      target: input.targets.fats,
      delta: roundNumber(totals.fats - input.targets.fats),
      percent: percentOfTarget(totals.fats, input.targets.fats),
      unit: 'g',
    },
  ].sort((a, b) => a.percent - b.percent);
  const lowestMacro = macroGaps[0];
  const lastWorkout = input.workouts.at(-1);
  const lastWorkoutAge = lastWorkout ? daysSince(lastWorkout.performedAt) : null;
  const recentWorkouts = input.workouts.slice(-5);
  const recentSets = recentWorkouts.reduce((total, workout) => total + workout.sets.length, 0);
  const recentVolume = roundNumber(recentWorkouts.reduce((total, workout) => total + workoutVolume(workout), 0));
  const recentExercises = [
    ...new Set(recentWorkouts.flatMap((workout) => workout.sets.map((set) => set.exercise).filter(Boolean))),
  ].slice(0, 5);

  return [
    `Nutrition signal: ${input.foodLogs.length} meals logged, ${roundNumber(totals.calories)} of ${input.targets.calories} kcal (${percentOfTarget(totals.calories, input.targets.calories)}%).`,
    `Largest macro gap: ${lowestMacro.label} is ${lowestMacro.current}${lowestMacro.unit} of ${lowestMacro.target}${lowestMacro.unit} (${lowestMacro.percent}%, ${lowestMacro.delta}${lowestMacro.unit}).`,
    lastWorkout
      ? `Training signal: ${recentWorkouts.length} recent workouts, ${recentSets} sets, ${recentVolume}kg volume; last workout ${lastWorkout.name} was ${lastWorkoutAge ?? 'unknown'} days ago.`
      : 'Training signal: no workout session has been logged yet.',
    recentExercises.length > 0
      ? `Recent exercises: ${recentExercises.join(', ')}.`
      : 'Recent exercises: none logged.',
  ].join('\n');
}

function buildCompactEvidence(cards: EvidenceCard[]) {
  if (cards.length === 0) {
    return 'none';
  }

  return cards
    .map((card) => {
      return `${card.topic}: ${card.claim}`;
    })
    .join('\n');
}

function buildFactBlock(input: FitnessInsightInput, mode: 'full' | 'compact' = 'full') {
  const totals = sumFood(input.foodLogs);
  const calorieDelta = roundNumber(totals.calories - input.targets.calories);
  const proteinDelta = roundNumber(totals.protein - input.targets.protein);
  const carbsDelta = roundNumber(totals.carbs - input.targets.carbs);
  const fatsDelta = roundNumber(totals.fats - input.targets.fats);
  const recentWorkouts = input.workouts.slice(-3);
  const recentSets = recentWorkouts.reduce((total, workout) => total + workout.sets.length, 0);
  const recentVolume = roundNumber(recentWorkouts.reduce((total, workout) => total + workoutVolume(workout), 0));
  const lastWorkout = input.workouts.at(-1);
  const lastWorkoutAge = lastWorkout ? daysSince(lastWorkout.performedAt) : null;

  if (mode === 'compact') {
    return [
      `user=${input.userName}; goal=${formatGoal(input.goal)}; body=${input.weightKg}kg/${input.heightCm}cm`,
      `today=${input.foodLogs.length} meals; kcal=${roundNumber(totals.calories)}/${input.targets.calories} (${percentOfTarget(totals.calories, input.targets.calories)}%, ${calorieDelta >= 0 ? '+' : ''}${calorieDelta})`,
      `macros protein=${roundNumber(totals.protein)}/${input.targets.protein}g (${proteinDelta >= 0 ? '+' : ''}${proteinDelta}); carbs=${roundNumber(totals.carbs)}/${input.targets.carbs}g (${carbsDelta >= 0 ? '+' : ''}${carbsDelta}); fat=${roundNumber(totals.fats)}/${input.targets.fats}g (${fatsDelta >= 0 ? '+' : ''}${fatsDelta})`,
      `meals=${buildMealSummary(input.foodLogs, 3)}`,
      lastWorkout
        ? `training=${recentWorkouts.length} recent workouts; ${recentSets} sets; ${recentVolume}kg volume; last=${lastWorkout.name}, ${lastWorkoutAge ?? 'unknown'} days ago`
        : 'training=0 workouts logged; 0 sets; 0kg volume',
    ].join('\n');
  }

  return [
    `User: ${input.userName}`,
    `Goal: ${formatGoal(input.goal)}`,
    `Body: ${input.weightKg}kg, ${input.heightCm}cm`,
    `Meals logged today: ${input.foodLogs.length}`,
    `Calories: ${roundNumber(totals.calories)} kcal vs ${input.targets.calories} kcal target (${calorieDelta >= 0 ? '+' : ''}${calorieDelta} kcal, ${percentOfTarget(totals.calories, input.targets.calories)}% complete)`,
    `Protein: ${roundNumber(totals.protein)}g vs ${input.targets.protein}g target (${proteinDelta >= 0 ? '+' : ''}${proteinDelta}g, ${percentOfTarget(totals.protein, input.targets.protein)}% complete)`,
    `Carbs: ${roundNumber(totals.carbs)}g vs ${input.targets.carbs}g target (${carbsDelta >= 0 ? '+' : ''}${carbsDelta}g, ${percentOfTarget(totals.carbs, input.targets.carbs)}% complete)`,
    `Fats: ${roundNumber(totals.fats)}g vs ${input.targets.fats}g target (${fatsDelta >= 0 ? '+' : ''}${fatsDelta}g, ${percentOfTarget(totals.fats, input.targets.fats)}% complete)`,
    'Logged meals:',
    buildMealSummary(input.foodLogs),
    'Recent training:',
    buildWorkoutSummary(input.workouts),
  ].join('\n');
}

function buildEvidenceBlock(input: FitnessInsightInput) {
  const facts = buildFactBlock(input);
  const compactFacts = buildFactBlock(input, 'compact');
  const signals = buildRankedSignals(input);
  const evidenceCards = retrieveEvidence({
    query: ['personal nutrition training insight', signals].join('\n'),
    route: INSIGHT_ROUTE,
    userGoal: input.goal,
    recentContext: signals,
    limit: 1,
  });

  return {
    facts,
    compactFacts,
    signals,
    evidence: buildCompactEvidence(evidenceCards),
  };
}

const INSIGHT_SYSTEM_PROMPT = [
  'You are Gemi, an on-device fitness analyst.',
  'Use DATA first. RAG is only a small hint.',
  'Do not invent unlogged meals, workouts, sleep, or body-weight trends.',
  'SUMMARY, NUTRITION, TRAINING, and NEXT must each include at least one DATA number.',
  'Avoid generic advice. Do not summarize RAG as the main insight.',
  'Return exactly: TITLE=... SUMMARY=... NUTRITION=... TRAINING=... NEXT=... CONFIDENCE=...',
].join(' ');

export function buildFitnessInsightPrompt(input: FitnessInsightInput) {
  const { compactFacts, signals, evidence } = buildEvidenceBlock(input);

  return buildChatMlPrompt(
    INSIGHT_SYSTEM_PROMPT,
    [
      'DATA:',
      compactFacts,
      'SIGNALS:',
      signals,
      'RAG:',
      evidence,
      'Task: create one personal insight from DATA. Keep each field short.',
    ].join('\n'),
  );
}

export function buildFitnessInsightRepairPrompt(
  input: FitnessInsightInput,
  previousOutput: string,
  quality: FitnessInsightQuality,
) {
  const { compactFacts, signals, evidence } = buildEvidenceBlock(input);

  return buildChatMlPrompt(
    INSIGHT_SYSTEM_PROMPT,
    [
      'DATA:',
      compactFacts,
      'SIGNALS:',
      signals,
      'RAG:',
      evidence,
      'Previous:',
      previousOutput.trim() || '(empty)',
      'Rejected because:',
      quality.reasons.join('; '),
      'Task: rewrite with the six labels and include DATA numbers.',
    ].join('\n'),
  );
}

const INSIGHT_CHAT_SYSTEM_PROMPT = [
  'You are Gemi, an on-device fitness chat coach.',
  'Answer only from DATA, CURRENT_INSIGHT, and RAG.',
  'If a meal, workout, metric, or trend is missing, say it is not logged.',
  'Do not invent medical diagnoses, exact body changes, or unlogged sessions.',
  'Give a practical answer in 2 to 4 short sentences.',
].join(' ');

export function buildFitnessInsightChatPrompt(
  input: FitnessInsightInput,
  currentInsight: FitnessInsight,
  history: FitnessInsightChatMessage[],
  question: string,
) {
  const { compactFacts, signals, evidence } = buildEvidenceBlock(input);
  const recentHistory = history.slice(-4).map((message) => {
    const label = message.role === 'user' ? 'USER' : 'GEMI';
    return `${label}: ${message.content}`;
  });

  return buildChatMlPrompt(
    INSIGHT_CHAT_SYSTEM_PROMPT,
    [
      'DATA:',
      compactFacts,
      'SIGNALS:',
      signals,
      'CURRENT_INSIGHT:',
      `TITLE=${currentInsight.title}`,
      `SUMMARY=${currentInsight.summary}`,
      `NUTRITION=${currentInsight.nutrition}`,
      `TRAINING=${currentInsight.training}`,
      `NEXT=${currentInsight.nextStep}`,
      'RAG:',
      evidence,
      'CHAT_HISTORY:',
      recentHistory.length > 0 ? recentHistory.join('\n') : 'none',
      'QUESTION:',
      question,
      'Answer as Gemi with no labels and no markdown.',
    ].join('\n'),
  );
}

function parseLabeledSections(output: string) {
  const fields = new Map<string, string>();
  const labelPattern = new RegExp(
    `(?:^|\\s)(?:[-*•]\\s*)?(?:\\*\\*)?(${INSIGHT_LABELS.join('|')})(?:\\*\\*)?\\s*[:=\\-]\\s*`,
    'gi',
  );
  const matches = [...output.matchAll(labelPattern)];

  matches.forEach((match, index) => {
    const label = match[1].toUpperCase();
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = index + 1 < matches.length ? matches[index + 1].index ?? output.length : output.length;
    const value = output
      .slice(valueStart, valueEnd)
      .trim()
      .replace(/\s+CONFID(?:ENCE)?\s*$/i, '')
      .replace(/^["']|["']$/g, '');
    if (value) {
      fields.set(label, value);
    }
  });

  return fields;
}

function extractLine(sections: Map<string, string>, label: string) {
  const value = sections.get(label)?.trim() ?? null;
  if (!value) return null;
  if (/\b(\d+\s+to\s+\d+|under\s+\d+|one specific|clear words|high,\s*medium|no markdown|no bullets)\b/i.test(value)) {
    return null;
  }
  return value;
}

function cleanLine(value: string) {
  return value
    .replace(/^(title|summary|nutrition|training|next|confidence)\s*[:=\-]\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function splitSentences(output: string) {
  return output
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(cleanLine)
    .filter((line) => line.length > 0)
    .filter((line) => !/\b(return only|one specific|clear words|no markdown|no bullets|generate today's fitness insight)\b/i.test(line));
}

function findSentence(sentences: string[], pattern: RegExp, fallbackIndex: number) {
  return sentences.find((sentence) => pattern.test(sentence)) ?? sentences[fallbackIndex] ?? null;
}

function normalizeInsightText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGenericInsightText(value: string) {
  return /\b(adjust\s+(macros|macronutrient|calories)|status\s+needs\s+attention|prioritize\s+protein\s+intake|consider\s+adding\s+light\s+resistance|needs\s+focus\s+on\s+increasing|should\s+prioritize\s+recovery|aim\s+for\s+~?\d+g\s+protein|start\s+tracking|review\s+your\s+(training\s+)?logs|complete\s+failure\s+for\s+benefits|1\.6g\/kg\/day\s+is\s+a\s+reference\s+point)\b/i.test(value);
}

function isRetryPlaceholder(value: string) {
  return Object.values(EMPTY_MODEL_INSIGHT).some((placeholder) => value === placeholder);
}

function hasUserDataAnchor(value: string) {
  return (
    /\b\d+(?:\.\d+)?\s*(?:kcal|g|kg|%|sets?|workouts?|meals?|days?|entries|volume)\b/i.test(value) ||
    /\b(?:no|zero)\s+(?:meals?|workouts?|sessions?|exercises?|sets?)\b/i.test(value) ||
    /\b(?:logged|target|gap|left|remaining|complete)\b/i.test(value)
  );
}

function isGenericTitle(value: string) {
  return /^(fitness insight|start tracking|daily insight|nutrition status|training gap|\.{2,}|…+)$/i.test(value.trim());
}

function titleFromModelText(value: string) {
  const text = value
    .replace(/\bChristian(?:\s+G)?'?s?\b/gi, '')
    .replace(/[^a-z0-9\s%]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  const words = text.split(' ').filter((word) => word.length > 1 || /\d/.test(word));
  const usefulWords = words.filter((word) => !/^(has|have|logged|today|with|only|but|and|the|his|her|your)$/i.test(word));
  const titleWords = (usefulWords.length >= 2 ? usefulWords : words).slice(0, 4);
  if (titleWords.length === 0) return null;

  return titleWords
    .map((word) => (/\d/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

export function parseFitnessInsight(output: string): FitnessInsight {
  const compact = output.replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(output);
  const sections = parseLabeledSections(output);
  const summary = extractLine(sections, 'SUMMARY') ?? sentences[0] ?? compact ?? EMPTY_MODEL_INSIGHT.summary;
  const rawTitle = extractLine(sections, 'TITLE');
  const title = rawTitle && !isGenericTitle(rawTitle)
    ? rawTitle
    : titleFromModelText(summary) ?? EMPTY_MODEL_INSIGHT.title;

  return {
    title,
    summary,
    nutrition: extractLine(sections, 'NUTRITION') ?? findSentence(
      sentences,
      /\b(calorie|protein|carb|fat|macro|meal|nutrition|kcal|target)\b/i,
      1,
    ) ?? EMPTY_MODEL_INSIGHT.nutrition,
    training: extractLine(sections, 'TRAINING') ?? findSentence(
      sentences,
      /\b(training|workout|gym|sets|reps|volume|recovery|lift)\b/i,
      2,
    ) ?? EMPTY_MODEL_INSIGHT.training,
    nextStep: extractLine(sections, 'NEXT') ?? findSentence(
      sentences,
      /\b(next|today|adjust|log|aim|keep|reduce|increase|choose)\b/i,
      sentences.length - 1,
    ) ?? EMPTY_MODEL_INSIGHT.nextStep,
    confidence: extractLine(sections, 'CONFIDENCE') ?? EMPTY_MODEL_INSIGHT.confidence,
  };
}

export function assessFitnessInsightQuality(insight: FitnessInsight): FitnessInsightQuality {
  const reasons: string[] = [];
  const genericFields: string[] = [];
  const fields = [
    ['summary', insight.summary],
    ['nutrition', insight.nutrition],
    ['training', insight.training],
    ['nextStep', insight.nextStep],
  ] as const;
  const anchoredFields: string[] = [];

  if (!insight.title || isGenericTitle(insight.title) || isRetryPlaceholder(insight.title)) {
    reasons.push('title is missing or generic');
  }

  fields.forEach(([field, value]) => {
    if (!value || normalizeInsightText(value).length < 10) {
      reasons.push(`${field} is missing or too short`);
    }
    if (isGenericInsightText(value)) {
      genericFields.push(field);
    }
    if (isRetryPlaceholder(value)) {
      reasons.push(`${field} was not returned by the model`);
    }
    if (hasUserDataAnchor(value)) {
      anchoredFields.push(field);
    }
  });

  if (anchoredFields.length < 2) {
    reasons.push('insight is not anchored enough to logged user data');
  }

  const normalized = fields.map(([field, value]) => [field, normalizeInsightText(value)] as const);
  normalized.forEach(([field, value], index) => {
    if (!value) return;
    const duplicate = normalized.find(([otherField, otherValue], otherIndex) =>
      otherIndex !== index && otherField !== field && otherValue === value
    );
    if (duplicate) {
      reasons.push(`${field} repeats ${duplicate[0]}`);
    }
  });

  if (genericFields.length >= 2) {
    reasons.push(`${genericFields.join(', ')} are generic instead of analytical`);
  }

  return {
    isUsable: reasons.length === 0,
    reasons,
  };
}

export function createModelRetryFitnessInsight(): FitnessInsight {
  return EMPTY_MODEL_INSIGHT;
}

export function createLoadingFitnessInsight(): FitnessInsight {
  return {
    title: 'Reading Data',
    summary: 'Gemi is preparing one cached insight from your latest local logs.',
    nutrition: 'Nutrition analysis will appear after the local model finishes.',
    training: 'Training analysis will use recent workout logs when available.',
    nextStep: 'Keep using the app; this result will be reused until your data changes.',
    confidence: 'low: waiting for model output.',
  };
}
