import type { GemiFoodItem } from '@/api/foodDatabaseApi';
import { initializeFoodDatabase } from '@/local/foodDb';
import { FOOD_TABLES } from '@/local/foodMigrations';

type LocalFoodRow = {
  id: string;
  name: string;
  category: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  potassium_mg_per_100g: number | null;
  calcium_mg_per_100g: number | null;
  iron_mg_per_100g: number | null;
  vitamin_c_mg_per_100g: number | null;
  folate_mcg_per_100g: number | null;
  default_serving_unit: string | null;
  default_serving_size: number | null;
  source: string;
};

const FOOD_SELECT_COLUMNS = [
  'id',
  'name',
  'category',
  'calories_per_100g',
  'protein_per_100g',
  'carbs_per_100g',
  'fat_per_100g',
  'fiber_per_100g',
  'sodium_mg_per_100g',
  'potassium_mg_per_100g',
  'calcium_mg_per_100g',
  'iron_mg_per_100g',
  'vitamin_c_mg_per_100g',
  'folate_mcg_per_100g',
  'default_serving_unit',
  'default_serving_size',
  'source',
].join(', ');

function normalizeLimit(limit?: number) {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    return 25;
  }

  return Math.min(Math.floor(limit), 100);
}

export function mapLocalFoodRowToGemiFoodItem(row: LocalFoodRow): GemiFoodItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? 'General',
    calories: row.calories_per_100g,
    protein: row.protein_per_100g,
    carbs: row.carbs_per_100g,
    fat: row.fat_per_100g,
    fiber: row.fiber_per_100g ?? 0,
    sodium: row.sodium_mg_per_100g ?? 0,
    potassium: row.potassium_mg_per_100g ?? 0,
    calcium: row.calcium_mg_per_100g ?? 0,
    iron: row.iron_mg_per_100g ?? 0,
    vitaminC: row.vitamin_c_mg_per_100g ?? 0,
    folate: row.folate_mcg_per_100g ?? 0,
    defaultServingUnit: row.default_serving_unit ?? '100g',
    defaultServingSize: row.default_serving_size ?? 100,
    portions: [],
  };
}

export async function searchLocalFoods(query: string, limit?: number): Promise<GemiFoodItem[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const db = await initializeFoodDatabase();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const containsQuery = `%${normalizedQuery}%`;
  const prefixQuery = `${normalizedQuery}%`;
  const maxResults = normalizeLimit(limit);

  const rows = await db.getAllAsync<LocalFoodRow>(
    `SELECT ${FOOD_SELECT_COLUMNS}
     FROM ${FOOD_TABLES.items}
     WHERE lower(name) LIKE ?
        OR lower(COALESCE(category, '')) LIKE ?
        OR id IN (
          SELECT food_id
          FROM ${FOOD_TABLES.aliases}
          WHERE lower(alias) LIKE ?
        )
     ORDER BY
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM ${FOOD_TABLES.aliases}
           WHERE food_id = ${FOOD_TABLES.items}.id
             AND lower(alias) = ?
         ) THEN 0
         WHEN lower(name) = ? THEN 1
         WHEN lower(name) LIKE ? THEN 2
         WHEN lower(name) LIKE ? THEN 3
         WHEN lower(COALESCE(category, '')) LIKE ? THEN 4
         ELSE 5
       END,
       CASE WHEN source = 'prototype_seed' THEN 0 ELSE 1 END,
       name COLLATE NOCASE ASC,
       id ASC
     LIMIT ?`,
    containsQuery,
    containsQuery,
    containsQuery,
    normalizedQuery,
    normalizedQuery,
    prefixQuery,
    containsQuery,
    containsQuery,
    maxResults
  );

  return rows.map(mapLocalFoodRowToGemiFoodItem);
}

export async function getFoodById(id: string): Promise<GemiFoodItem | null> {
  const trimmedId = id.trim();
  if (!trimmedId) return null;

  const db = await initializeFoodDatabase();
  const row = await db.getFirstAsync<LocalFoodRow>(
    `SELECT ${FOOD_SELECT_COLUMNS}
     FROM ${FOOD_TABLES.items}
     WHERE id = ?
     LIMIT 1`,
    trimmedId
  );

  return row ? mapLocalFoodRowToGemiFoodItem(row) : null;
}
