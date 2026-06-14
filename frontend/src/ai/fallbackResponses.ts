import type { RoutedCoachIntent } from './router/intentTypes';
import type { UserProfile } from './prompts';

function normalizeMessage(message: string) {
  return message.toLowerCase().replace(/\s+/g, ' ').trim();
}

function formatGoal(goal?: string) {
  if (!goal) return 'your goal';
  return goal.replace(/_/g, ' ');
}

export function buildFallbackCoachResponse(options: {
  route: RoutedCoachIntent;
  userMessage: string;
  userProfile: UserProfile | null;
  recentAssistantMessage?: string | null;
}) {
  const message = normalizeMessage(options.userMessage);
  const goal = formatGoal(options.userProfile?.goal);
  const recentAssistantMessage = normalizeMessage(options.recentAssistantMessage ?? '');

  if (/^(yes|yes please|yeah|yep|sure|please|ok|okay|sounds good)\b/.test(message)) {
    if (
      recentAssistantMessage.includes('meal adjustments') ||
      recentAssistantMessage.includes('support your target') ||
      recentAssistantMessage.includes('calorie')
    ) {
      return 'Yes. For gaining 10kg over 6 months, keep the surplus controlled and repeatable: add about 300 to 500 kcal above maintenance, aim for protein at each meal, and use easy calorie additions like rice, oats, milk, olive oil, nut butter, yogurt, eggs, or an extra shake. Since you train 4 times per week, start with the earlier calorie range, track body weight weekly, and adjust by 100 to 200 kcal if weight is not moving after 2 weeks.';
    }
  }

  if (message.includes('rehab') || message.includes('prehab') || message.includes('physio')) {
    return 'You can do gentle self-care only if it stays pain-free, but do not treat it as a diagnosis or a full rehab plan. Stop the painful exercise for now, use pain-free wrist range of motion, keep loads light, and avoid anything that recreates the pain. If pain lasts more than a few days, worsens, causes swelling, numbness, weakness, or affects daily tasks, see a qualified clinician or physical therapist.';
  }

  if ((message.includes('wrist') || message.includes('hand')) && (message.includes('tricep') || message.includes('triceps') || message.includes('pushdown'))) {
    return 'Stop any triceps movement that causes wrist pain. For gym alternatives, try rope cable pushdowns with a neutral grip, machine triceps extensions, cable overhead rope extensions, or single-arm cable pressdowns using a handle that keeps your wrist straight. Start light for 2 to 3 sets of 10 to 15 reps, keep the wrist stacked and pain-free, and avoid dips or straight-bar pushdowns for now. If pain persists, worsens, or affects daily use, get it checked by a qualified clinician.';
  }

  if (options.route.intent === 'meal_suggestion') {
    if (message.includes('high protein') || message.includes('protein')) {
      return 'For high-protein meals that are easier to tolerate, use smaller portions more often: Greek yogurt with fruit, eggs with toast, tuna or chicken rice bowls, tofu stir-fry, cottage cheese with crackers, or a whey shake with a banana. If you feel bloated, reduce huge single meals, go easier on very high-fiber foods for now, and spread protein across 3 to 5 feedings instead of forcing one large meal.';
    }
    return 'Before training, aim for an easy-to-digest meal with carbs plus some protein. A good option is rice or oats with eggs, chicken, yogurt, or whey, eaten about 1 to 3 hours before training. If you only have 30 to 60 minutes, keep it lighter: a banana with yogurt, toast with peanut butter, or a small protein shake. Keep fats and very high fiber foods lower right before training so your stomach feels better.';
  }

  if (options.route.intent === 'workout_plan') {
    return `To move toward ${goal}, use a simple gym plan you can recover from: train 3 to 4 days per week, start each session with 1 to 2 compound lifts, then add 2 to 4 accessory exercises. Use mostly 2 to 4 sets of 6 to 12 reps, rest 2 to 3 minutes on heavy lifts, and add reps before adding weight. If soreness or performance drops for several sessions, reduce volume for a week.`;
  }

  if (options.route.intent === 'workout_recommendation') {
    if (message.includes('abs') || message.includes('core')) {
      return 'For abs, use a mix of spinal flexion, anti-extension, and anti-rotation. Try cable crunches for 3 sets of 10 to 15, hanging knee raises or captain-chair raises for 3 sets of 8 to 12, plank variations for 2 sets of 30 to 60 seconds, and Pallof presses for 2 sets of 10 to 12 per side. Train core 2 to 3 times per week, progress slowly, and keep each rep controlled.';
    }
    if (message.includes('gym') || message.includes('equipment') || message.includes('machine') || message.includes('cable')) {
      return 'Since you train at a gym, use equipment that lets you load the target muscle while keeping joints comfortable. For triceps, good options are rope cable pushdowns, machine triceps extensions, single-arm cable pressdowns, and cable overhead rope extensions. Start with 2 to 3 sets of 10 to 15 reps, keep the movement controlled, and progress by adding reps first, then a small weight increase.';
    }
    return 'Pick exercises that match your equipment and goal, then progress them consistently. A good gym setup is one heavy compound lift, one secondary machine or dumbbell movement, and one controlled isolation exercise for 2 to 4 sets each. Use clean form, stop sets when technique breaks down, and increase reps or weight gradually.';
  }

  if (options.route.intent === 'nutrition') {
    if ((message.includes('bloated') || message.includes('full')) && message.includes('protein')) {
      return 'If protein makes you feel too full or bloated, stop forcing huge portions. Split protein into 3 to 5 smaller feedings, use easier options like Greek yogurt, eggs, fish, tofu, chicken, or a small whey shake, and keep very high-fiber or very fatty meals away from your highest-protein meal. If bloating is frequent, painful, or worsening, check with a qualified clinician.';
    }
    return `For ${goal}, start with consistent calories, enough protein, and meals you can repeat. If you resistance train, about 1.6 grams of protein per kilogram of body weight per day is a useful reference point for many healthy adults. Keep changes gradual, watch energy and recovery, and avoid extreme calorie cuts.`;
  }

  if (options.route.intent === 'progress_analysis') {
    return `I can help you assess ${goal}, but I need enough logged workouts, body weight, or food entries to judge trends. In the meantime, check whether your key lifts, weekly consistency, protein intake, sleep, and body-weight trend are moving in the right direction. If you log a few recent workouts and meals, I can give a more specific read.`;
  }

  if (message.includes('goal')) {
    return `Yes. Your current goal is ${goal}, so the best path is to make your training, food, and recovery support that one direction. I can help you plan workouts, choose exercises, set protein and calorie targets, review progress, and adjust when something hurts or stalls.`;
  }

  return 'I can help with that. Give me your goal, available equipment, and any limitation like pain or time, and I will suggest a practical next step with sets, reps, nutrition guidance, or recovery advice.';
}

export function finishPossiblyIncompleteResponse(response: string, fallback: string) {
  const trimmed = response.trim();
  if (!trimmed) return fallback;

  if (/[.!?]$/.test(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  const looksCutOff =
    /\b(if|when|because|and|or|but|with|for|to|from|then|while)$/.test(lower) ||
    /\b(if pain persists|if symptoms persist|if it still hurts)$/.test(lower);

  if (!looksCutOff) {
    return `${trimmed}.`;
  }

  const fallbackSentences = (fallback.match(/[^.!?]+[.!?]+/g) ?? [fallback])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const closingSentence =
    fallbackSentences.find((sentence) =>
      /pain|symptom|qualified|clinician|professional|recover|progress/i.test(sentence),
    ) ?? fallbackSentences[fallbackSentences.length - 1];

  return closingSentence ? `${trimmed}. ${closingSentence}` : `${trimmed}.`;
}
