import type { SafetyResponseKey } from './safetyResponses';

export type SafetyReason =
  | 'pain_or_injury_mentioned'
  | 'eating_disorder_language'
  | 'medical_condition'
  | 'teen_nutrition_caution'
  | 'supplement_megadose'
  | 'steroid_or_ped_mention'
  | 'unsafe_model_output';

export type SafetyCheckResult =
  | { safe: true }
  | { safe: false; reason: SafetyReason; responseKey: SafetyResponseKey };

function includesAny(message: string, terms: string[]) {
  return terms.some((term) => message.includes(term));
}

function removeNegatedPainPhrases(message: string) {
  return message
    .replace(/\b(no|not any|without|zero)\s+(sharp\s+)?pain\b/g, ' ')
    .replace(/\b(no|not any|without|zero)\s+(injury|injuries|hurt|hurting|swelling|numbness|tingling)\b/g, ' ')
    .replace(/\bpain[- ]free\b/g, ' ')
    .replace(/\bdoes(?:n't| not)\s+hurt\b/g, ' ')
    .replace(/\bdo(?:n't| not)\s+have\s+(pain|an injury|injuries)\b/g, ' ');
}

export function checkMessageSafety(userMessage: string): SafetyCheckResult {
  const msg = userMessage.toLowerCase();
  const safetyMsg = removeNegatedPainPhrases(msg);

  const painKeywords = [
    'sharp pain',
    'chest pain',
    'pain',
    'hurts',
    'hurt',
    'injured',
    'injury',
    'swollen',
    'numb',
    'tingling',
    "can't move",
    'dizzy',
    'faint',
  ];
  const eatingDisorderKeywords = [
    'not eating',
    'starving',
    'purging',
    'binge',
    'hate my body',
    'too fat',
    'too skinny',
    'skip meals',
    'restrict',
  ];
  const medicalKeywords = [
    'diabetes',
    'heart condition',
    'pregnant',
    'cancer',
    'eating disorder',
    'depression',
    'hypertension',
    'kidney disease',
  ];
  const supplementKeywords = ['megadose', 'mega dose', 'overdose', '10x', 'too many', 'ton of creatine'];
  const pedKeywords = ['steroids', 'testosterone', 'hgh', 'sarms', 'tren', 'cycle', 'gear'];
  const teenRestrictionKeywords = [
    'i am 13',
    'i am 14',
    'i am 15',
    'i am 16',
    'i am 17',
    "i'm 13",
    "i'm 14",
    "i'm 15",
    "i'm 16",
    "i'm 17",
  ];

  if (includesAny(safetyMsg, painKeywords)) {
    return { safe: false, reason: 'pain_or_injury_mentioned', responseKey: 'pain_or_injury' };
  }
  if (includesAny(msg, eatingDisorderKeywords)) {
    return { safe: false, reason: 'eating_disorder_language', responseKey: 'eating_disorder' };
  }
  if (includesAny(msg, medicalKeywords)) {
    return { safe: false, reason: 'medical_condition', responseKey: 'medical_redirect' };
  }
  if (includesAny(msg, supplementKeywords)) {
    return { safe: false, reason: 'supplement_megadose', responseKey: 'supplement_caution' };
  }
  if (includesAny(msg, pedKeywords)) {
    return { safe: false, reason: 'steroid_or_ped_mention', responseKey: 'ped_redirect' };
  }
  if (includesAny(msg, teenRestrictionKeywords) && /cut|diet|calorie|lose weight|fat|skinny/.test(msg)) {
    return { safe: false, reason: 'teen_nutrition_caution', responseKey: 'teen_nutrition_caution' };
  }

  return { safe: true };
}

export function scanModelOutput(output: string): { clean: boolean; sanitized: string } {
  const redFlags = [
    "you're suffering from",
    'stop eating',
    'skip meals',
    'under 1000 calories',
    'under 1,000 calories',
    'take steroids',
    'take sarms',
    'ignore the pain',
    'push through the pain',
  ];
  const lower = output.toLowerCase();
  const diagnosisPattern =
    /\b(you have|you are suffering from|you're suffering from)\s+(diabetes|cancer|hypertension|depression|an eating disorder|kidney disease|heart disease|a heart condition|an injury|a tear|a sprain|a strain)\b/i;
  const prescriptionPattern = /\b(i\s+)?(diagnosed|diagnose|prescribed|prescribe)\b/i;
  const flagged =
    diagnosisPattern.test(output) ||
    prescriptionPattern.test(output) ||
    redFlags.some((term) => lower.includes(term));

  if (!flagged) {
    return { clean: true, sanitized: output };
  }

  return {
    clean: false,
    sanitized:
      "Keep tracking your training and nutrition. I'll surface specific, safer guidance when there is enough clear data to work from.",
  };
}
