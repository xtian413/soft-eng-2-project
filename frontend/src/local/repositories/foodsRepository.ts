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
  portions_json: string | null;
};

type GemiFoodPortion = GemiFoodItem['portions'][number];

const REMOTE_FOOD_SOURCE = 'supabase_usda';
const REMOTE_FOOD_CACHE_SOURCE = 'supabase_usda_cache';
const REMOTE_FOOD_ID_PREFIX = `${REMOTE_FOOD_SOURCE}:`;

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
  'portions_json',
].join(', ');

function normalizeLimit(limit?: number) {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    return 25;
  }

  return Math.min(Math.floor(limit), 100);
}

function getRemoteFoodId(id: string) {
  return id.startsWith(REMOTE_FOOD_ID_PREFIX) ? id.slice(REMOTE_FOOD_ID_PREFIX.length) : id;
}

function getCachedRemoteFoodLocalId(id: string) {
  const remoteId = getRemoteFoodId(id.trim());
  return remoteId ? `${REMOTE_FOOD_ID_PREFIX}${remoteId}` : '';
}

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseFoodPortions(portionsJson: string | null): GemiFoodPortion[] {
  if (!portionsJson) return [];

  try {
    const parsed = JSON.parse(portionsJson);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((portion): GemiFoodPortion | null => {
        if (!portion || typeof portion !== 'object') return null;

        const candidate = portion as Partial<GemiFoodPortion>;
        if (
          typeof candidate.name !== 'string' ||
          typeof candidate.gramWeight !== 'number' ||
          !Number.isFinite(candidate.gramWeight) ||
          typeof candidate.amount !== 'number' ||
          !Number.isFinite(candidate.amount)
        ) {
          return null;
        }

        return {
          name: candidate.name,
          gramWeight: candidate.gramWeight,
          amount: candidate.amount,
        };
      })
      .filter((portion): portion is GemiFoodPortion => portion !== null);
  } catch {
    return [];
  }
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
    portions: parseFoodPortions(row.portions_json),
  };
}

export async function cacheRemoteFoodItems(items: GemiFoodItem[]) {
  if (items.length === 0) return;

  const db = await initializeFoodDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const remoteId = getRemoteFoodId(item.id);
      const localId = getCachedRemoteFoodLocalId(item.id);
      if (!remoteId || !localId) continue;

      await db.runAsync(
        `INSERT INTO ${FOOD_TABLES.items} (
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
          updated_at,
          remote_source,
          remote_id,
          cached_at,
          last_used_at,
          remote_updated_at,
          barcode,
          portions_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          category = excluded.category,
          calories_per_100g = excluded.calories_per_100g,
          protein_per_100g = excluded.protein_per_100g,
          carbs_per_100g = excluded.carbs_per_100g,
          fat_per_100g = excluded.fat_per_100g,
          fiber_per_100g = excluded.fiber_per_100g,
          sodium_mg_per_100g = excluded.sodium_mg_per_100g,
          potassium_mg_per_100g = excluded.potassium_mg_per_100g,
          calcium_mg_per_100g = excluded.calcium_mg_per_100g,
          iron_mg_per_100g = excluded.iron_mg_per_100g,
          vitamin_c_mg_per_100g = excluded.vitamin_c_mg_per_100g,
          folate_mcg_per_100g = excluded.folate_mcg_per_100g,
          default_serving_unit = excluded.default_serving_unit,
          default_serving_size = excluded.default_serving_size,
          source = excluded.source,
          updated_at = excluded.updated_at,
          remote_source = excluded.remote_source,
          remote_id = excluded.remote_id,
          cached_at = excluded.cached_at,
          remote_updated_at = excluded.remote_updated_at,
          barcode = excluded.barcode,
          portions_json = excluded.portions_json
        WHERE ${FOOD_TABLES.items}.source = ?`,
        localId,
        item.name,
        item.category,
        normalizeNumber(item.calories),
        normalizeNumber(item.protein),
        normalizeNumber(item.carbs),
        normalizeNumber(item.fat),
        normalizeNumber(item.fiber),
        normalizeNumber(item.sodium),
        normalizeNumber(item.potassium),
        normalizeNumber(item.calcium),
        normalizeNumber(item.iron),
        normalizeNumber(item.vitaminC),
        normalizeNumber(item.folate),
        normalizeNullableText(item.defaultServingUnit) ?? '100g',
        normalizeNumber(item.defaultServingSize, 100),
        REMOTE_FOOD_CACHE_SOURCE,
        now,
        now,
        REMOTE_FOOD_SOURCE,
        remoteId,
        now,
        normalizeNullableText(item.remoteUpdatedAt),
        normalizeNullableText(item.barcode),
        JSON.stringify(item.portions ?? []),
        REMOTE_FOOD_CACHE_SOURCE
      );
    }
  });
}

export async function cacheRemoteFoodItem(item: GemiFoodItem) {
  await cacheRemoteFoodItems([item]);
}

export async function markFoodLastUsed(id: string) {
  const localId = getCachedRemoteFoodLocalId(id);
  if (!localId) return;

  const db = await initializeFoodDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE ${FOOD_TABLES.items}
     SET last_used_at = ?,
         updated_at = ?
     WHERE id = ?
       AND source = ?`,
    now,
    now,
    localId,
    REMOTE_FOOD_CACHE_SOURCE
  );
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
