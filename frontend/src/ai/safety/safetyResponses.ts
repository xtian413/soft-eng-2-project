export type SafetyResponseKey =
  | 'pain_or_injury'
  | 'eating_disorder'
  | 'medical_redirect'
  | 'teen_nutrition_caution'
  | 'supplement_caution'
  | 'ped_redirect'
  | 'unsafe_model_output';

export const SAFETY_RESPONSES: Record<SafetyResponseKey, string> = {
  pain_or_injury:
    'Pain during exercise is a signal to stop that movement for now. Avoid pushing through sharp, persistent, swollen, numb, or worsening pain, and see a qualified clinician if it continues. I can suggest pain-free alternatives once you tell me where it hurts.',
  eating_disorder:
    "I noticed something concerning in what you shared. If food, weight, or body image feels hard to manage, a registered dietitian, doctor, or counselor can help in ways this app cannot. I won't give restrictive dieting advice here.",
  medical_redirect:
    'This needs a doctor or qualified specialist rather than a fitness app. Please check with a health professional before changing your training, diet, or supplements.',
  teen_nutrition_caution:
    'For someone your age, food supports growth, energy, and training. Avoid restrictive dieting or aggressive calorie targets, and talk with a parent, coach, school nurse, doctor, or registered dietitian if you are unsure what to eat.',
  supplement_caution:
    'High supplement doses can be harmful and are not better by default. Stay with evidence-based amounts, avoid megadosing, and check with a qualified professional if you have a health condition or take medication.',
  ped_redirect:
    "Performance-enhancing drugs and SARMs carry serious health risks, especially for people who are still developing. I won't give instructions for using them; please talk with a doctor if you have questions.",
  unsafe_model_output:
    "Keep tracking your training and nutrition. I'll surface specific, safer guidance when there is enough clear data to work from.",
};

export function getSafetyResponse(key: SafetyResponseKey) {
  return SAFETY_RESPONSES[key];
}
