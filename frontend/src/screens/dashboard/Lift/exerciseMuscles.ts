/**
 * Exercise to muscle groups mapping
 * Maps each exercise to the primary and secondary muscles it targets
 */

export interface ExerciseMuscleMap {
  [exerciseName: string]: {
    primary: Array<{slug: string; intensity: number; side?: 'left' | 'right'}>;
    secondary: Array<{slug: string; intensity: number; side?: 'left' | 'right'}>;
  };
}

export const exerciseMuscleMap: ExerciseMuscleMap = {
  // Barbell exercises
  'Back Squat': {
    primary: [
      { slug: 'quadriceps', intensity: 2 },
      { slug: 'gluteal', intensity: 2 },
      { slug: 'hamstring', intensity: 2 },
    ],
    secondary: [
      { slug: 'lower-back', intensity: 1 },
      { slug: 'calves', intensity: 1 },
      { slug: 'abs', intensity: 1 },
    ],
  },
  'Bench Press': {
    primary: [
      { slug: 'chest', intensity: 2 },
      { slug: 'triceps', intensity: 2 },
      { slug: 'deltoids', intensity: 1 },
    ],
    secondary: [
      { slug: 'upper-back', intensity: 1 },
      { slug: 'forearm', intensity: 1 },
    ],
  },
  'Deadlift': {
    primary: [
      { slug: 'hamstring', intensity: 2 },
      { slug: 'gluteal', intensity: 2 },
      { slug: 'lower-back', intensity: 2 },
      { slug: 'quadriceps', intensity: 1 },
    ],
    secondary: [
      { slug: 'trapezius', intensity: 1 },
      { slug: 'upper-back', intensity: 1 },
      { slug: 'forearm', intensity: 1 },
    ],
  },
  'Squat (Unilateral Leg Press)': {
    primary: [
      { slug: 'quadriceps', intensity: 2, side: 'left' },
      { slug: 'quadriceps', intensity: 2, side: 'right' },
      { slug: 'gluteal', intensity: 2 },
    ],
    secondary: [
      { slug: 'hamstring', intensity: 1 },
      { slug: 'calves', intensity: 1 },
    ],
  },
  'Dumbbell Curl': {
    primary: [
      { slug: 'biceps', intensity: 2 },
    ],
    secondary: [
      { slug: 'forearm', intensity: 1 },
    ],
  },
  'Incline Dumbbell Press': {
    primary: [
      { slug: 'chest', intensity: 2 },
      { slug: 'deltoids', intensity: 2 },
      { slug: 'triceps', intensity: 1 },
    ],
    secondary: [
      { slug: 'upper-back', intensity: 1 },
    ],
  },
  'Bent Over Row': {
    primary: [
      { slug: 'upper-back', intensity: 2 },
      { slug: 'hamstring', intensity: 1 },
      { slug: 'lower-back', intensity: 1 },
    ],
    secondary: [
      { slug: 'trapezius', intensity: 1 },
      { slug: 'biceps', intensity: 1 },
    ],
  },
  'Overhead Press': {
    primary: [
      { slug: 'deltoids', intensity: 2 },
      { slug: 'triceps', intensity: 1 },
      { slug: 'chest', intensity: 1 },
    ],
    secondary: [
      { slug: 'trapezius', intensity: 1 },
      { slug: 'upper-back', intensity: 1 },
    ],
  },
  'Leg Press': {
    primary: [
      { slug: 'quadriceps', intensity: 2 },
      { slug: 'gluteal', intensity: 2 },
      { slug: 'hamstring', intensity: 1 },
    ],
    secondary: [
      { slug: 'calves', intensity: 1 },
    ],
  },
  'Cable Chest Fly': {
    primary: [
      { slug: 'chest', intensity: 2 },
    ],
    secondary: [
      { slug: 'deltoids', intensity: 1 },
      { slug: 'biceps', intensity: 1 },
    ],
  },
  'Lat Pulldown': {
    primary: [
      { slug: 'upper-back', intensity: 2 },
      { slug: 'biceps', intensity: 2 },
    ],
    secondary: [
      { slug: 'deltoids', intensity: 1 },
      { slug: 'forearm', intensity: 1 },
    ],
  },
  'Pull-ups': {
    primary: [
      { slug: 'upper-back', intensity: 2 },
      { slug: 'biceps', intensity: 2 },
      { slug: 'deltoids', intensity: 1 },
    ],
    secondary: [
      { slug: 'forearm', intensity: 1 },
      { slug: 'chest', intensity: 1 },
    ],
  },
  'Leg Curl': {
    primary: [
      { slug: 'hamstring', intensity: 2 },
    ],
    secondary: [
      { slug: 'calves', intensity: 1 },
    ],
  },
  'Leg Extension': {
    primary: [
      { slug: 'quadriceps', intensity: 2 },
    ],
    secondary: [],
  },
  'Dumbbell Flye': {
    primary: [
      { slug: 'chest', intensity: 2 },
      { slug: 'deltoids', intensity: 1 },
    ],
    secondary: [
      { slug: 'biceps', intensity: 1 },
    ],
  },
  'Tricep Dips': {
    primary: [
      { slug: 'triceps', intensity: 2 },
      { slug: 'chest', intensity: 1 },
      { slug: 'deltoids', intensity: 1 },
    ],
    secondary: [
      { slug: 'upper-back', intensity: 1 },
    ],
  },
  'Barbell Curl': {
    primary: [
      { slug: 'biceps', intensity: 2 },
    ],
    secondary: [
      { slug: 'forearm', intensity: 1 },
    ],
  },
  'Tricep Extension': {
    primary: [
      { slug: 'triceps', intensity: 2 },
    ],
    secondary: [
      { slug: 'deltoids', intensity: 1 },
    ],
  },
  'Bulgarian Split Squat': {
    primary: [
      { slug: 'quadriceps', intensity: 2 },
      { slug: 'gluteal', intensity: 2 },
      { slug: 'hamstring', intensity: 1 },
    ],
    secondary: [
      { slug: 'calves', intensity: 1 },
      { slug: 'adductors', intensity: 1 },
    ],
  },
  'Hack Squat': {
    primary: [
      { slug: 'quadriceps', intensity: 2 },
      { slug: 'gluteal', intensity: 1 },
    ],
    secondary: [
      { slug: 'calves', intensity: 1 },
    ],
  },
  'Face Pull': {
    primary: [
      { slug: 'deltoids', intensity: 2 },
      { slug: 'upper-back', intensity: 2 },
    ],
    secondary: [
      { slug: 'trapezius', intensity: 1 },
    ],
  },
  'Diamond Push Ups': {
    primary: [
      { slug: 'chest', intensity: 2 },
    ],
    secondary: [
      { slug: 'triceps', intensity: 1 },
      { slug: 'deltoids', intensity: 1 },
      { slug: 'abs', intensity: 1 },
    ],
  },
  'V Pushup': {
    primary: [
      { slug: 'deltoids', intensity: 2 },
      { slug: 'triceps', intensity: 2 },
      { slug: 'chest', intensity: 1 },
    ],
    secondary: [
      { slug: 'abs', intensity: 1 },
      { slug: 'forearm', intensity: 1 },
    ],
  },
};

/**
 * Get muscle data for a specific exercise
 */
export function getMuscleDataForExercise(exerciseName: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const normalizedExerciseName = normalize(exerciseName);

  const mapping =
    exerciseMuscleMap[exerciseName] ||
    Object.entries(exerciseMuscleMap).find(([name]) => normalize(name) === normalizedExerciseName)?.[1];
  
  if (!mapping) {
    // Default fallback for custom exercises - return core stabilizer muscles
    return [
      { slug: 'abs', intensity: 1 },
      { slug: 'lower-back', intensity: 1 },
      { slug: 'trapezius', intensity: 1 },
    ];
  }

  // Combine primary (intensity 2) and secondary (intensity 1) muscles
  return [
    ...mapping.primary,
    ...mapping.secondary,
  ];
}
