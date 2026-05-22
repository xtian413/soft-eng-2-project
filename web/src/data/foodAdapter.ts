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
        return n.nutrient?.unitName?.toLowerCase() === unit.toLowerCase() || 
               (unit === "µg" && n.nutrient?.unitName === "µg") ||
               (unit === "µg" && n.nutrient?.unitName === "mcg");
      }
      return true;
    });
    return nut ? Number(nut.amount || 0) : 0;
  };

  // Extract calories specifically in kcal
  const calories = findNutrient("Energy", "kcal") || 
                   (findNutrient("Energy", "kJ") / 4.184) || 0;

  const protein = findNutrient("Protein", "g");
  const carbs = findNutrient("Carbohydrate", "g");
  const fat = findNutrient("Total lipid", "g");
  const fiber = findNutrient("Fiber", "g");
  const sodium = findNutrient("Sodium", "mg");
  const potassium = findNutrient("Potassium", "mg");
  const calcium = findNutrient("Calcium", "mg");
  const iron = findNutrient("Iron", "mg");
  const vitaminC = findNutrient("Vitamin C", "mg");
  const folate = findNutrient("Folate", "µg") || findNutrient("Folate", "mcg");

  // Parse portions
  const portions = (fdcFood.foodPortions || []).map((p: any) => ({
    name: p.measureUnit?.name || p.modifier || "portion",
    gramWeight: Number(p.gramWeight || 100),
    amount: Number(p.amount || 1)
  }));

  // Ensure there's at least a 100g portion
  if (portions.length === 0) {
    portions.push({
      name: "100g",
      gramWeight: 100,
      amount: 1
    });
  }

  return {
    id: String(fdcFood.fdcId || fdcFood.ndbNumber || Math.random()),
    name: fdcFood.description || "Unknown Food Item",
    category: fdcFood.foodCategory?.description || "General",
    calories: Math.round(calories),
    protein: Number(protein.toFixed(1)),
    carbs: Number(carbs.toFixed(1)),
    fat: Number(fat.toFixed(1)),
    fiber: Number(fiber.toFixed(1)),
    sodium: Math.round(sodium),
    potassium: Math.round(potassium),
    calcium: Math.round(calcium),
    iron: Number(iron.toFixed(2)),
    vitaminC: Number(vitaminC.toFixed(1)),
    folate: Math.round(folate),
    defaultServingUnit: portions[0].name,
    defaultServingSize: portions[0].gramWeight,
    portions
  };
}

export async function fetchLocalFoodDatabase(): Promise<GemiFoodItem[]> {
  try {
    // Dynamic import to support on-demand code splitting in Vite
    const rawData = await import("./Food Database/FoodData_Central_foundation_food_json_2026-04-30.json");
    const data = (rawData as any).default || rawData;
    if (data && data.FoundationFoods) {
      return data.FoundationFoods
        .filter((f: any) => f && f.description)
        .map(mapFdcToGemiFoodItem);
    }
    return [];
  } catch (error) {
    console.error("Failed to load local USDA food database:", error);
    return [];
  }
}
