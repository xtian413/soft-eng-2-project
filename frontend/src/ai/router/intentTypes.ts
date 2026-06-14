export type CoachIntent =
  | 'greeting'
  | 'thanks'
  | 'capability'
  | 'workout_recommendation'
  | 'workout_plan'
  | 'exercise_technique'
  | 'nutrition'
  | 'meal_suggestion'
  | 'progress_analysis'
  | 'injury_or_pain'
  | 'medical_condition'
  | 'eating_disorder_language'
  | 'teen_nutrition_caution'
  | 'supplement_caution'
  | 'ped_redirect'
  | 'out_of_scope'
  | 'general_coaching';

export type AnswerLengthMode = 'instant' | 'short' | 'coaching' | 'plan' | 'analysis';

export type RoutedCoachIntent = {
  intent: CoachIntent;
  answerMode: AnswerLengthMode;
  shouldUseModel: boolean;
};

export const INTENT_MAX_TOKENS: Record<AnswerLengthMode, number> = {
  instant: 0,
  short: 64,
  coaching: 240,
  plan: 420,
  analysis: 360,
};
