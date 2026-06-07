import type { SQLiteDatabase } from 'expo-sqlite';
import foundationDataset from '../../assets/data/foodDataCentral.compact.json';
import { FOOD_TABLES } from '@/local/foodMigrations';

export const FOUNDATION_FOOD_SOURCE = 'fdc_foundation_snapshot_v1';

type CompactFoundationFood = {
  id: string;
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sodiumMgPer100g: number;
  potassiumMgPer100g: number;
  calciumMgPer100g: number;
  ironMgPer100g: number;
  vitaminCMgPer100g: number;
  folateMcgPer100g: number;
  defaultServingUnit: string;
  defaultServingSize: number;
  source: string;
};

type CompactFoundationDataset = {
  source: string;
  expectedCount: number;
  foods: CompactFoundationFood[];
};

type CountRow = {
  count: number;
};

const compactFoundationDataset = foundationDataset as CompactFoundationDataset;
const EXPECTED_FOUNDATION_FOOD_COUNT = compactFoundationDataset.expectedCount;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function importFoundationFoodsIfNeeded(db: SQLiteDatabase) {
  try {
    const importedCount = await db.getFirstAsync<CountRow>(
      `SELECT COUNT(*) AS count FROM ${FOOD_TABLES.items} WHERE source = ?`,
      FOUNDATION_FOOD_SOURCE
    );

    if ((importedCount?.count ?? 0) >= EXPECTED_FOUNDATION_FOOD_COUNT) {
      console.log('[FoodDB] Foundation dataset already imported');
      return;
    }

    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      for (const item of compactFoundationDataset.foods) {
        await db.runAsync(
          `INSERT OR IGNORE INTO ${FOOD_TABLES.items} (
            id,
            name,
            category,
            calories_per_100g,
            protein_per_100g,
            carbs_per_100g,
            fat_per_100g,
            fiber_per_100g,
            sodium_mg_per_100g,
            potassium_mg_per_100g,
            calcium_mg_per_100g,
            iron_mg_per_100g,
            vitamin_c_mg_per_100g,
            folate_mcg_per_100g,
            default_serving_unit,
            default_serving_size,
            source,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          item.id,
          item.name,
          item.category,
          item.caloriesPer100g,
          item.proteinPer100g,
          item.carbsPer100g,
          item.fatPer100g,
          item.fiberPer100g,
          item.sodiumMgPer100g,
          item.potassiumMgPer100g,
          item.calciumMgPer100g,
          item.ironMgPer100g,
          item.vitaminCMgPer100g,
          item.folateMcgPer100g,
          item.defaultServingUnit,
          item.defaultServingSize,
          item.source,
          now,
          now
        );
      }
    });

    console.log(`[FoodDB] Foundation dataset import complete: ${EXPECTED_FOUNDATION_FOOD_COUNT}`);
  } catch (error) {
    console.error('[FoodDB] Foundation dataset import failed:', getErrorMessage(error));
  }
}
