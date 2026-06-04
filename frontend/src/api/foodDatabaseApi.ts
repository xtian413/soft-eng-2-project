import { apiClient } from '@/lib/api';

export interface GemiFoodItem {
  id: string;
  name: string;
  category: string;
  calories: number; // kcal per 100g
  protein: number; // g per 100g
  carbs: number; // g per 100g
  fat: number; // g per 100g
  fiber: number; // g per 100g
  sodium: number; // mg per 100g
  potassium: number; // mg per 100g
  calcium: number; // mg per 100g
  iron: number; // mg per 100g
  vitaminC: number; // mg per 100g
  folate: number; // mcg per 100g
  defaultServingUnit: string;
  defaultServingSize: number; // in grams
  portions: Array<{
    name: string;
    gramWeight: number;
    amount: number;
  }>;
  barcode?: string;
  remoteUpdatedAt?: string;
}

type FoodSearchParams = {
  query?: string;
  limit?: number;
};

/** Searches the backend USDA food database. */
export async function searchFoodDatabase(params: FoodSearchParams = {}) {
  const response = await apiClient.get<{ data: GemiFoodItem[] }>('/api/foods', {
    params: {
      q: params.query || undefined,
      limit: typeof params.limit === 'number' ? params.limit : undefined,
    },
  });
  return response.data.data;
}
