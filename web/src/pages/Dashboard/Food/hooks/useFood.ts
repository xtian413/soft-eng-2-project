import { useState } from 'react';

export const useFood = () => {
  // Nutrient carousel slide
  const [nutrientSlide, setNutrientSlide] = useState<'energy' | 'macros' | 'micros'>('energy');

  // Hydration state
  const [waterGlassStates, setWaterGlassStates] = useState<boolean[]>(Array(8).fill(false));
  const [hydrationGoalMl, setHydrationGoalMl] = useState(2000);
  const [isEditingHydrationGoal, setIsEditingHydrationGoal] = useState(false);
  const [hydrationGoalInput, setHydrationGoalInput] = useState('2000');

  const waterConsumedMl = waterGlassStates.filter(Boolean).length * 250;
  const waterGlassCount = Math.min(12, Math.ceil(hydrationGoalMl / 250));

  const handleWaterGlassToggle = (idx: number) => {
    setWaterGlassStates(prev => {
      const next = [...prev];
      if (idx < next.length) {
        next[idx] = !next[idx];
      }
      return next;
    });
  };

  // Sleep state
  const [bedtime, setBedtime] = useState('23:00');
  const [waketime, setWaketime] = useState('06:30');

  const getSleepHours = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH + endM / 60) - (startH + startM / 60);
    if (diff < 0) diff += 24; // overnight sleep
    return Number(diff.toFixed(1));
  };

  const sleepHours = getSleepHours(bedtime, waketime);
  
  // Sleep Quality calculations
  let sleepQuality = 'Optimal';
  let sleepQualityColor = '#10b981'; // emerald
  if (sleepHours < 6) {
    sleepQuality = 'Poor';
    sleepQualityColor = '#ef4444'; // red
  } else if (sleepHours < 7.5) {
    sleepQuality = 'Fair';
    sleepQualityColor = '#f59e0b'; // amber
  }

  // Quick Log input
  const [foodQuickLogInput, setFoodQuickLogInput] = useState('');

  // Modal open states
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [activeLoggingMealId, setActiveLoggingMealId] = useState<string>('breakfast');

  return {
    nutrientSlide,
    setNutrientSlide,
    
    // Hydration
    waterGlassStates,
    setWaterGlassStates,
    hydrationGoalMl,
    setHydrationGoalMl,
    isEditingHydrationGoal,
    setIsEditingHydrationGoal,
    hydrationGoalInput,
    setHydrationGoalInput,
    waterConsumedMl,
    waterGlassCount,
    handleWaterGlassToggle,

    // Sleep
    bedtime,
    setBedtime,
    waketime,
    setWaketime,
    sleepHours,
    sleepQuality,
    sleepQualityColor,

    // Food Input & Modals
    foodQuickLogInput,
    setFoodQuickLogInput,
    isOptionsModalOpen,
    setIsOptionsModalOpen,
    activeLoggingMealId,
    setActiveLoggingMealId,
  };
};
