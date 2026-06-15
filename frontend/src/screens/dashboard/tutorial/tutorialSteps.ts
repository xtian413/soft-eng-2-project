/**
 * Interactive Tutorial Steps
 * Defines the guided walkthrough that highlights dashboard tabs and explains features
 */

export type TabType = 'dashboard' | 'food' | 'insights' | 'lift' | 'profile';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  tabToHighlight: TabType | null; // null for no specific tab
  tooltipText: string;
  navigateToTab: TabType | null;
  // Position hint for tooltip (above, below, left, right)
  tooltipPosition: 'above' | 'below' | 'left' | 'right';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Gemi',
    description: 'Let\'s take a quick tour of the main features to get you started!',
    tabToHighlight: null,
    tooltipText:
      'This is your personalized AI coaching dashboard. Let\'s explore the features that will help you achieve your fitness goals.',
    navigateToTab: 'dashboard',
    tooltipPosition: 'below',
  },
  {
    id: 'today-dashboard',
    title: 'Today Dashboard',
    description: 'Your daily summary and progress at a glance',
    tabToHighlight: 'dashboard',
    tooltipText:
      'The "Today" tab shows your daily summary: calories, macros, workouts, and AI insights. Check in here every morning to see what you accomplished yesterday and plan your day.',
    navigateToTab: 'dashboard',
    tooltipPosition: 'above',
  },
  {
    id: 'food-tracking',
    title: 'Food Tracking',
    description: 'Log your meals and monitor nutrition',
    tabToHighlight: 'food',
    tooltipText:
      'The "Food" tab lets you log meals quickly. Use the AI parser to describe meals in your own words, or browse the food database. Track calories, macros, and micronutrients effortlessly.',
    navigateToTab: 'food',
    tooltipPosition: 'above',
  },
  {
    id: 'workouts',
    title: 'Workouts',
    description: 'Browse exercises and monitor your training',
    tabToHighlight: 'lift',
    tooltipText:
      'The "Lift" tab is where you log exercises and track sets, reps, and weight. Browse thousands of exercises with form tips and demonstrations. Build custom workout routines.',
    navigateToTab: 'lift',
    tooltipPosition: 'above',
  },
  {
    id: 'ai-insights',
    title: 'AI Insights',
    description: 'Personalized recommendations based on your habits',
    tabToHighlight: 'insights',
    tooltipText:
      'The "Insights" tab delivers personalized coaching from our AI. Get analysis of your nutrition and training, plus recommendations to level up your results. Chat with the AI for custom guidance.',
    navigateToTab: 'insights',
    tooltipPosition: 'above',
  },
  {
    id: 'profile-progress',
    title: 'Profile & Progress',
    description: 'Review achievements and track your improvement',
    tabToHighlight: 'profile',
    tooltipText:
      'The "Profile" tab shows your stats, weight trends, goal progress, and workout history. Update your profile settings and track your long-term transformation.',
    navigateToTab: 'profile',
    tooltipPosition: 'above',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Ready to start your fitness journey?',
    tabToHighlight: null,
    tooltipText:
      'You\'re now ready to explore. Remember, consistent logging leads to better AI insights. Start with logging today\'s meals and workouts!',
    navigateToTab: null,
    tooltipPosition: 'below',
  },
];

export function getTutorialStep(stepIndex: number): TutorialStep | null {
  if (stepIndex < 0 || stepIndex >= TUTORIAL_STEPS.length) {
    return null;
  }
  return TUTORIAL_STEPS[stepIndex];
}

export function getTotalSteps(): number {
  return TUTORIAL_STEPS.length;
}
