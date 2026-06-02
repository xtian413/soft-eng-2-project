import { INTENT_MAX_TOKENS, type CoachIntent, type RoutedCoachIntent } from './intentTypes';
import { checkMessageSafety } from '../safety/safetyClassifier';
import { getSafetyResponse } from '../safety/safetyResponses';

const GREETING_MESSAGES = new Set([
  'hi',
  'hello',
  'hey',
  'hiya',
  'yo',
  'sup',
  'good morning',
  'good afternoon',
  'good evening',
]);

const THANKS_PATTERNS = [/^(thanks|thank you|ty|thx)\b/, /^appreciate it\b/];
const ACK_MESSAGES = new Set(['ok', 'okay', 'alright', 'got it', 'nice']);

const CAPABILITY_PATTERNS = [
  /\bwhat can you do\b/,
  /\bwhay can you do\b/,
  /\bhow can you help\b/,
  /\bwhat do you help with\b/,
  /\bwhat are your capabilities\b/,
  /\bwho are you\b/,
  /\bwhy .*response\b/,
  /\bwhy .*answer\b/,
];

const INJURY_PATTERNS = [
  /\b(pain|hurts?|hurting|aching|ache|injur(?:y|ed)|strain|sprain|tear|torn|swollen|numb|tingl(?:e|ing))\b/,
  /\b(rehab|prehab|self rehab|self-rehab|physical therapy|physio)\b/,
  /\b(chest pain|dizzy|dizziness|faint(?:ed|ing)?|shortness of breath)\b/,
];

const PROGRESS_PATTERNS = [
  /\b(am i improving|did i improve|have i improved|i improved|improved|progress|plateau|getting stronger|getting weaker)\b/,
  /\b(performance|past 30 days|last 30 days|current performance)\b/,
  /\b(track|analy[sz]e|review).*\b(workout|training|lift|diet|weight|body)\b/,
];

const GOAL_PATTERNS = [
  /\b(current goal|my goal|achieve my goal|reach my goal|hit my goal)\b/,
  /\bgoal\b.*\b(achieve|reach|hit|think|help|current)\b/,
  /\b(achieve|reach|hit|think about|help me with)\b.*\bgoal\b/,
];

const WORKOUT_PLAN_PATTERNS = [
  /\b(make|create|build|write|design|give me)\b.*\b(plan|program|routine|split)\b/,
  /\b\d+\s*(day|days)\b.*\b(split|plan|program|routine)\b/,
  /\b(full[- ]body|push pull legs|ppl|upper lower)\b.*\b(plan|program|routine|split)\b/,
];

const WORKOUT_RECOMMENDATION_PATTERNS = [
  /\b(best|good|recommend|suggest).*\b(workout|exercise|lift|movement)\b/,
  /\b(alternative|alternatives|replace|substitute|swap)\b.*\b(exercise|movement|workout|lift)\b/,
  /\b(gym equipment|machine|cable|dumbbell|barbell)\b/,
  /\b(chest|back|legs?|glutes?|shoulders?|arms?|biceps|triceps|core|abs)\b.*\b(workout|exercise|training)\b/,
];

const EXERCISE_TECHNIQUE_PATTERNS = [
  /\b(how to|form|technique|properly|cue|cues)\b.*\b(bench|squat|deadlift|press|row|curl|lunge|pull[- ]?up|push[- ]?up|pushdown)\b/,
  /\b(bench press|squat|deadlift|overhead press|lat pulldown|barbell row|dumbbell press|tricep pushdown|triceps pushdown)\b.*\b(form|technique)\b/,
];

const MEAL_PATTERNS = [
  /\b(what should i eat|meal|breakfast|lunch|dinner|snack|food ideas?)\b/,
  /\b(pre|post)[- ]?\b(workout|training)\b.*\b(meal|eat|food|snack)\b/,
];

const NUTRITION_PATTERNS = [
  /\b(protein|calories|calorie|macro|macros|carbs?|fat|fiber|hydration|water|creatine|caffeine|supplement)\b/,
  /\b(cutting|bulking|deficit|surplus|maintenance calories|diet|nutrition)\b/,
  /\b(cut|bulk)\b.*\b(weight|fat|muscle|calories|diet)\b/,
];

const FITNESS_DOMAIN_PATTERNS = [
  /\b(workout|training|exercise|lift|gym|sets?|reps?|muscle|strength|hypertrophy|cardio|fitness|recovery|sleep|deload|goal|performance|rehab|prehab)\b/,
  /\b(chest|back|legs?|glutes?|shoulders?|arms?|biceps|triceps|tricep|core|abs)\b/,
  /\b(protein|calories|macro|meal|diet|nutrition|weight|body fat|hydration)\b/,
];

const CLEARLY_OUT_OF_SCOPE_PATTERNS = [
  /\b(weather|stock|crypto|politics|election|movie|music|programming|code|homework|history|capital of)\b/,
  /\b(recipe for|write an essay|translate|summari[sz]e this article)\b/,
];

function normalizeMessage(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[?!.,;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

function matchesAny(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function hasFitnessDomain(message: string) {
  return matchesAny(message, FITNESS_DOMAIN_PATTERNS);
}

function removeNegatedPainPhrases(message: string) {
  return message
    .replace(/\b(no|not any|without|zero)\s+(sharp\s+)?pain\b/g, ' ')
    .replace(/\b(no|not any|without|zero)\s+(injury|injuries|hurt|hurting|swelling|numbness|tingling)\b/g, ' ')
    .replace(/\bpain[- ]free\b/g, ' ')
    .replace(/\bdoes(?:n't| not)\s+hurt\b/g, ' ')
    .replace(/\bdo(?:n't| not)\s+have\s+(pain|an injury|injuries)\b/g, ' ');
}

function getAnswerMode(intent: CoachIntent): RoutedCoachIntent['answerMode'] {
  switch (intent) {
    case 'greeting':
    case 'thanks':
    case 'capability':
    case 'out_of_scope':
    case 'medical_condition':
    case 'eating_disorder_language':
    case 'teen_nutrition_caution':
    case 'supplement_caution':
    case 'ped_redirect':
      return 'instant';
    case 'injury_or_pain':
      return 'instant';
    case 'workout_plan':
      return 'plan';
    case 'progress_analysis':
      return 'analysis';
    case 'workout_recommendation':
    case 'exercise_technique':
    case 'nutrition':
    case 'meal_suggestion':
    case 'general_coaching':
      return 'coaching';
  }
}

export function routeCoachIntent(userMessage: string): RoutedCoachIntent {
  const normalized = normalizeMessage(userMessage);
  const normalizedWithoutNegatedPain = removeNegatedPainPhrases(normalized);
  let intent: CoachIntent = 'general_coaching';
  const safetyCheck = checkMessageSafety(userMessage);

  if (!normalized) {
    intent = 'out_of_scope';
  } else if (!safetyCheck.safe) {
    switch (safetyCheck.responseKey) {
      case 'pain_or_injury':
        intent = 'injury_or_pain';
        break;
      case 'eating_disorder':
        intent = 'eating_disorder_language';
        break;
      case 'supplement_caution':
        intent = 'supplement_caution';
        break;
      case 'ped_redirect':
        intent = 'ped_redirect';
        break;
      case 'teen_nutrition_caution':
        intent = 'teen_nutrition_caution';
        break;
      case 'medical_redirect':
      case 'unsafe_model_output':
        intent = 'medical_condition';
        break;
    }
  } else if (matchesAny(normalizedWithoutNegatedPain, INJURY_PATTERNS)) {
    intent = 'injury_or_pain';
  } else if (GREETING_MESSAGES.has(normalized)) {
    intent = 'greeting';
  } else if (ACK_MESSAGES.has(normalized)) {
    intent = 'thanks';
  } else if (matchesAny(normalized, THANKS_PATTERNS)) {
    intent = 'thanks';
  } else if (matchesAny(normalized, CAPABILITY_PATTERNS)) {
    intent = 'capability';
  } else if (matchesAny(normalized, PROGRESS_PATTERNS)) {
    intent = 'progress_analysis';
  } else if (matchesAny(normalized, WORKOUT_PLAN_PATTERNS)) {
    intent = 'workout_plan';
  } else if (matchesAny(normalized, EXERCISE_TECHNIQUE_PATTERNS)) {
    intent = 'exercise_technique';
  } else if (matchesAny(normalized, MEAL_PATTERNS)) {
    intent = 'meal_suggestion';
  } else if (matchesAny(normalized, NUTRITION_PATTERNS)) {
    intent = 'nutrition';
  } else if (matchesAny(normalized, GOAL_PATTERNS)) {
    intent = 'general_coaching';
  } else if (matchesAny(normalized, WORKOUT_RECOMMENDATION_PATTERNS)) {
    intent = 'workout_recommendation';
  } else if (matchesAny(normalized, CLEARLY_OUT_OF_SCOPE_PATTERNS) && !hasFitnessDomain(normalized)) {
    intent = 'out_of_scope';
  }

  const answerMode = getAnswerMode(intent);
  return {
    intent,
    answerMode,
    shouldUseModel: answerMode !== 'instant',
  };
}

export function getIntentMaxTokens(route: RoutedCoachIntent) {
  return INTENT_MAX_TOKENS[route.answerMode];
}

export function getInstantCoachResponse(
  route: RoutedCoachIntent,
  userName: string,
  userMessage = '',
): string | null {
  const displayName = userName || 'there';
  const normalized = normalizeMessage(userMessage);

  switch (route.intent) {
    case 'greeting':
      return `Hi ${displayName}, how can I help with your fitness or nutrition today?`;
    case 'thanks':
      return 'Got it. I am here when you want help with training, meals, recovery, or progress.';
    case 'capability':
      if (/\bwhy .*response\b|\bwhy .*answer\b/.test(normalized)) {
        return 'You are right to call that out. That kind of generic reply usually means I classified the message too narrowly instead of letting the on-device coach answer it. I will do better with a specific training, nutrition, recovery, or progress question.';
      }
      return 'I can help with workouts, exercise form, meal ideas, protein and calorie targets, progress check-ins, and recovery guidance using your logged training and nutrition when available.';
    case 'out_of_scope':
      return 'I am focused on fitness, nutrition, recovery, and your progress in Gemi. Ask me about training, meals, macros, form, or recovery and I will help.';
    case 'injury_or_pain':
      return getSafetyResponse('pain_or_injury');
    case 'medical_condition':
      return getSafetyResponse('medical_redirect');
    case 'eating_disorder_language':
      return getSafetyResponse('eating_disorder');
    case 'teen_nutrition_caution':
      return getSafetyResponse('teen_nutrition_caution');
    case 'supplement_caution':
      return getSafetyResponse('supplement_caution');
    case 'ped_redirect':
      return getSafetyResponse('ped_redirect');
    default:
      return null;
  }
}
