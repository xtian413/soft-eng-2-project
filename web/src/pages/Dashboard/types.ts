import type { GemiFoodItem } from '../../data/foodAdapter';

export type TabType = 'dashboard' | 'food' | 'lift' | 'chat' | 'profile';

export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type ModalTab = 'search' | 'custom' | 'barcode';

export type { GemiFoodItem };

export interface CustomFoodForm {
  name: string;
  servingSize: string;
  servingUnit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sodium: string;
}

export interface FoodLogEntry {
  id: string;
  name: string;
  mealId: MealId;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  folate: number;
  servingSize: number;
  servingUnit: string;
}
