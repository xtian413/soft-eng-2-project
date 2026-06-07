import type { CoachIntent } from '../router/intentTypes';
import type { EvidenceCard } from './evidenceTypes';

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'and',
  'are',
  'best',
  'can',
  'could',
  'for',
  'from',
  'give',
  'have',
  'help',
  'how',
  'into',
  'make',
  'need',
  'should',
  'that',
  'the',
  'this',
  'want',
  'what',
  'when',
  'with',
  'workout',
]);

const INTENT_TAGS: Partial<Record<CoachIntent, string[]>> = {
  workout_recommendation: [
    'resistance training',
    'hypertrophy',
    'strength',
    'sets per muscle group',
    'progression',
  ],
  workout_plan: [
    'resistance training',
    'program',
    'progression',
    'beginner program',
    'weekly volume',
  ],
  exercise_technique: ['technique', 'supervision', 'resistance training', 'safety'],
  nutrition: ['protein', 'calories', 'deficit', 'surplus', 'nutrition', 'hydration'],
  meal_suggestion: ['meal', 'protein', 'carbohydrate', 'nutrition', 'athletic performance'],
  progress_analysis: ['progression', 'recovery', 'performance decline', 'training load'],
  injury_or_pain: ['safety', 'pain', 'injury', 'medical clearance'],
  general_coaching: ['resistance training', 'physical activity', 'nutrition'],
};

export function normalizeEvidenceText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeEvidenceText(value: string) {
  const normalized = normalizeEvidenceText(value);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function evidenceLevelScore(card: EvidenceCard) {
  switch (card.evidenceLevel) {
    case 'high':
      return 2;
    case 'moderate':
      return 1;
    case 'limited':
      return 0;
  }
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeEvidenceText(term)));
}

export function scoreEvidenceCard(
  card: EvidenceCard,
  options: {
    query: string;
    intent: CoachIntent;
    userGoal?: string;
    recentContext?: string;
  },
) {
  const queryText = normalizeEvidenceText(options.query);
  const cardTopic = normalizeEvidenceText(card.topic);
  const cardTags = card.tags.map(normalizeEvidenceText);
  const cardSearchText = normalizeEvidenceText([
    card.topic,
    ...card.tags,
    card.claim,
    ...card.practicalAdvice,
    ...(card.dosage ? Object.values(card.dosage) : []),
    ...(card.contraindications ?? []),
    ...(card.limitations ?? []),
  ].join(' '));

  let score = evidenceLevelScore(card);

  const intentTags = INTENT_TAGS[options.intent] ?? [];
  if (containsAny(cardSearchText, intentTags)) {
    score += 5;
  }

  if (queryText.includes(cardTopic) || cardTopic.includes(queryText)) {
    score += 4;
  }

  const queryTokens = tokenizeEvidenceText(queryText);
  for (const token of queryTokens) {
    if (cardTopic.includes(token)) {
      score += 3;
    }
    if (cardTags.some((tag) => tag.includes(token))) {
      score += 2;
    }
    if (cardSearchText.includes(token)) {
      score += 1;
    }
  }

  const goalTokens = tokenizeEvidenceText(options.userGoal ?? '');
  for (const token of goalTokens) {
    if (cardSearchText.includes(token)) {
      score += 2;
    }
  }

  const contextTokens = tokenizeEvidenceText(options.recentContext ?? '');
  for (const token of contextTokens.slice(0, 20)) {
    if (cardSearchText.includes(token)) {
      score += 1;
    }
  }

  return score;
}
