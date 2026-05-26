import type { FoodLogEntry, TabType } from '../types';

export interface HomeProps {
  fullName: string;
  goal: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  currentCalories: number;
  caloriesRemaining: number;
  proteinTotal: number;
  carbsTotal: number;
  fatsTotal: number;
  foodLogs: FoodLogEntry[];
  setFoodLogs: React.Dispatch<React.SetStateAction<FoodLogEntry[]>>;
  setToastMessage: (msg: string | null) => void;
  setActiveTab: (tab: TabType) => void;
}
