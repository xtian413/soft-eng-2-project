/* eslint-disable @typescript-eslint/no-explicit-any */
export interface GemiFoodItem {
  id: string;
  name: string;
  category: string;
  calories: number;       // kcal per 100g
  protein: number;        // g per 100g
  carbs: number;          // g per 100g
  fat: number;            // g per 100g
  fiber: number;          // g per 100g
  sodium: number;         // mg per 100g
  potassium: number;      // mg per 100g
  calcium: number;        // mg per 100g
  iron: number;           // mg per 100g
  vitaminC: number;       // mg per 100g
  folate: number;         // µg per 100g
  defaultServingUnit: string;
  defaultServingSize: number; // in grams
  portions: Array<{
    name: string;
    gramWeight: number;
    amount: number;
  }>;
}

export function mapFdcToGemiFoodItem(fdcFood: any): GemiFoodItem {
  const findNutrient = (name: string, unit?: string) => {
    const nut = fdcFood.foodNutrients?.find((n: any) => {
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

  const calories =
    findNutrient('Energy', 'kcal') || findNutrient('Energy', 'kJ') / 4.184 || 0;

  const portions = (fdcFood.foodPortions || []).map((p: any) => ({
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

let _cachedDb: GemiFoodItem[] | null = null;

export async function fetchLocalFoodDatabase(): Promise<GemiFoodItem[]> {
  if (_cachedDb) return _cachedDb;
  try {
    // React Native / Metro — require() is synchronous for bundled JSON assets
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rawData = require('../data/FoodDatabase/FoodData_Central.json');
    const data = (rawData as any).default || rawData;
    if (data?.FoundationFoods) {
      const mapped = data.FoundationFoods
        .filter((f: any) => f && f.description)
        .map(mapFdcToGemiFoodItem);
      _cachedDb = mapped;
      return mapped;
    }
    return [];
  } catch (error) {
    console.error('[Gemi] Failed to load USDA food database:', error);
    return [];
  }
}
