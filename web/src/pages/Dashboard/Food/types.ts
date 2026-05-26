import type { FoodLogEntry, GemiFoodItem, MealId } from '../types';

export interface FoodProps {
  foodLogs: FoodLogEntry[];
  setFoodLogs: React.Dispatch<React.SetStateAction<FoodLogEntry[]>>;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  proteinTotal: number;
  carbsTotal: number;
  fatsTotal: number;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
}

export interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLoggingMealId: MealId;
  setActiveLoggingMealId: (mealId: MealId) => void;
  fullFoodDatabase: GemiFoodItem[];
  isLoadingDb: boolean;
  dbLoadError: boolean;
  onLoadDatabase: () => void;
  setFoodLogs: React.Dispatch<React.SetStateAction<FoodLogEntry[]>>;
  setToastMessage: (msg: string | null) => void;
}
