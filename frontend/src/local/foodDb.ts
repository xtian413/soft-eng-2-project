import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { importFoundationFoodsIfNeeded } from '@/local/foodDatasetImporter';
import { FOOD_TABLES, runFoodMigrations } from '@/local/foodMigrations';
import { FOOD_SEED_SOURCE, SEED_FOOD_ALIASES, SEED_FOOD_ITEMS } from '@/local/foodSeedData';

export const GEMI_FOOD_DATABASE_NAME = 'gemi_food.db';

let foodDatabasePromise: Promise<SQLiteDatabase> | null = null;
let foodInitializationPromise: Promise<SQLiteDatabase> | null = null;

type CountRow = {
  count: number;
};

async function openFoodDatabase() {
  const db = await SQLite.openDatabaseAsync(GEMI_FOOD_DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON');
  console.log('[FoodDB] Opened gemi_food.db');
  return db;
}

export async function getFoodDatabase() {
  if (!foodDatabasePromise) {
    foodDatabasePromise = openFoodDatabase();
  }

  return foodDatabasePromise;
}

export async function seedFoodDatabaseIfNeeded(db: SQLiteDatabase) {
  const foodCount = await db.getFirstAsync<CountRow>(
    `SELECT COUNT(*) AS count FROM ${FOOD_TABLES.items} WHERE source = ?`,
    FOOD_SEED_SOURCE
  );
  const aliasCount = await db.getFirstAsync<CountRow>(
    `SELECT COUNT(*) AS count FROM ${FOOD_TABLES.aliases}`
  );

  if (
    (foodCount?.count ?? 0) >= SEED_FOOD_ITEMS.length &&
    (aliasCount?.count ?? 0) >= SEED_FOOD_ALIASES.length
  ) {
    return;
  }

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const item of SEED_FOOD_ITEMS) {
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
        FOOD_SEED_SOURCE,
        now,
        now
      );
    }

    for (const alias of SEED_FOOD_ALIASES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO ${FOOD_TABLES.aliases} (alias, food_id)
         VALUES (?, ?)`,
        alias.alias,
        alias.foodId
      );
    }
  });

  console.log('[FoodDB] Seed complete');
}

export async function initializeFoodDatabase() {
  if (!foodInitializationPromise) {
    foodInitializationPromise = (async () => {
      const db = await getFoodDatabase();
      await db.execAsync('PRAGMA foreign_keys = ON');
      await runFoodMigrations(db);
      await seedFoodDatabaseIfNeeded(db);
      await importFoundationFoodsIfNeeded(db);
      return db;
    })();
  }

  return foodInitializationPromise;
}
