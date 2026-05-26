import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface FoodDatabaseItem {
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
}

type FoundationFood = {
  fdcId?: number | string;
  ndbNumber?: number | string;
  description?: string;
  foodCategory?: { description?: string };
  foodNutrients?: Array<{
    amount?: number;
    nutrient?: { name?: string; unitName?: string };
  }>;
  foodPortions?: Array<{
    measureUnit?: { name?: string };
    modifier?: string;
    gramWeight?: number;
    amount?: number;
  }>;
};

const FOOD_DATABASE_PATH = path.resolve(
  process.cwd(),
  'data',
  'FoodDatabase',
  'FoodData_Central.json'
);

let cachedFoodDatabase: FoodDatabaseItem[] | null = null;

function mapFdcToFoodItem(fdcFood: FoundationFood): FoodDatabaseItem {
  const findNutrient = (name: string, unit?: string) => {
    const nut = fdcFood.foodNutrients?.find((n) => {
      const matchName = n.nutrient?.name?.toLowerCase().includes(name.toLowerCase());
      if (!matchName) return false;
      if (unit) {
        return (
          n.nutrient?.unitName?.toLowerCase() === unit.toLowerCase() ||
          (unit === 'µg' && n.nutrient?.unitName === 'µg') ||
          (unit === 'µg' && n.nutrient?.unitName === 'mcg')
        );
      }
      return true;
    });
    return nut ? Number(nut.amount || 0) : 0;
  };

  const calories = findNutrient('Energy', 'kcal') || findNutrient('Energy', 'kJ') / 4.184 || 0;

  const portions = (fdcFood.foodPortions || []).map((p) => ({
    name: p.measureUnit?.name || p.modifier || 'portion',
    gramWeight: Number(p.gramWeight || 100),
    amount: Number(p.amount || 1),
  }));

  if (portions.length === 0) {
    portions.push({ name: '100g', gramWeight: 100, amount: 1 });
  }

  return {
    id: String(fdcFood.fdcId || fdcFood.ndbNumber || Math.random()),
    name: fdcFood.description || 'Unknown Food Item',
    category: fdcFood.foodCategory?.description || 'General',
    calories: Math.round(calories),
    protein: Number(findNutrient('Protein', 'g').toFixed(1)),
    carbs: Number(findNutrient('Carbohydrate', 'g').toFixed(1)),
    fat: Number(findNutrient('Total lipid', 'g').toFixed(1)),
    fiber: Number(findNutrient('Fiber', 'g').toFixed(1)),
    sodium: Math.round(findNutrient('Sodium', 'mg')),
    potassium: Math.round(findNutrient('Potassium', 'mg')),
    calcium: Math.round(findNutrient('Calcium', 'mg')),
    iron: Number(findNutrient('Iron', 'mg').toFixed(2)),
    vitaminC: Number(findNutrient('Vitamin C', 'mg').toFixed(1)),
    folate:
      Math.round(findNutrient('Folate', 'µg')) ||
      Math.round(findNutrient('Folate', 'mcg')),
    defaultServingUnit: portions[0].name,
    defaultServingSize: portions[0].gramWeight,
    portions,
  };
}

async function loadFoodDatabase(): Promise<FoodDatabaseItem[]> {
  if (cachedFoodDatabase) return cachedFoodDatabase;
  const raw = await readFile(FOOD_DATABASE_PATH, 'utf-8');
  const data = JSON.parse(raw) as { FoundationFoods?: FoundationFood[] };
  if (!data.FoundationFoods) {
    throw { statusCode: 500, message: 'Food database is empty' };
  }
  cachedFoodDatabase = data.FoundationFoods
    .filter((f) => f && f.description)
    .map(mapFdcToFoodItem);
  return cachedFoodDatabase;
}

export async function searchFoodDatabase(query?: string, limit?: number) {
  const list = await loadFoodDatabase();
  const normalizedQuery = query?.trim().toLowerCase();
  let results = list;
  if (normalizedQuery) {
    results = list.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery)
    );
  }
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    results = results.slice(0, limit);
  }
  return results;
}
