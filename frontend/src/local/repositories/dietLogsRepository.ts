import { initializeLocalDatabase } from '@/local/db';
import {
  LOCAL_TABLES,
  type CreateLocalDietLogInput,
  type LocalDietLog,
  type UpdateLocalDietLogInput,
} from '@/local/schema';
import type { MealId } from '@/screens/dashboard/types';

export interface RemoteDietLogInput {
  id: string;
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string;
  created_at?: string;
}

const DIET_LOG_COLUMNS = [
  'id',
  'user_id',
  'remote_id',
  'meal_id',
  'meal_name',
  'calories',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'sodium_mg',
  'potassium_mg',
  'calcium_mg',
  'iron_mg',
  'vitamin_c_mg',
  'folate_mcg',
  'serving_size',
  'serving_unit',
  'source_food_id',
  'logged_at',
  'created_at',
  'updated_at',
  'deleted_at',
  'sync_status',
  'last_synced_at',
].join(', ');

function createLocalUuid() {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (typeof randomUuid === 'function') {
    return randomUuid.call(globalThis.crypto);
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = char === 'x' ? value : (value & 0x3) | 0x8;
    return nibble.toString(16);
  });
}

function assertUserId(userId: string) {
  if (!userId.trim()) {
    throw new Error('Local diet log operation requires a Supabase user ID.');
  }
}

function assertRemoteId(remoteId: string) {
  if (!remoteId.trim()) {
    throw new Error('Local diet log sync operation requires a backend diet-log ID.');
  }
}

function normalizeNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeMealId(value: string | null | undefined): MealId {
  return value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack'
    ? value
    : 'snack';
}

function wrapDietLogError(action: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Local diet log ${action} failed: ${message}`);
}

export async function createDietLog(input: CreateLocalDietLogInput): Promise<LocalDietLog> {
  try {
    assertUserId(input.user_id);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const id = input.id ?? createLocalUuid();

    await db.runAsync(
      `INSERT INTO ${LOCAL_TABLES.dietLogs} (
        id,
        user_id,
        remote_id,
        meal_id,
        meal_name,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        sodium_mg,
        potassium_mg,
        calcium_mg,
        iron_mg,
        vitamin_c_mg,
        folate_mcg,
        serving_size,
        serving_unit,
        source_food_id,
        logged_at,
        created_at,
        updated_at,
        deleted_at,
        sync_status,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
      id,
      input.user_id,
      normalizeNullableText(input.remote_id),
      normalizeMealId(input.meal_id),
      input.meal_name.trim(),
      normalizeNullableNumber(input.calories),
      normalizeNullableNumber(input.protein_g),
      normalizeNullableNumber(input.carbs_g),
      normalizeNullableNumber(input.fat_g),
      normalizeNullableNumber(input.fiber_g),
      normalizeNullableNumber(input.sodium_mg),
      normalizeNullableNumber(input.potassium_mg),
      normalizeNullableNumber(input.calcium_mg),
      normalizeNullableNumber(input.iron_mg),
      normalizeNullableNumber(input.vitamin_c_mg),
      normalizeNullableNumber(input.folate_mcg),
      normalizeNullableNumber(input.serving_size),
      normalizeNullableText(input.serving_unit),
      normalizeNullableText(input.source_food_id),
      input.logged_at,
      now,
      now
    );

    const created = await getDietLogByUserAndId(input.user_id, id);

    if (!created) {
      throw new Error('Inserted diet log could not be read back.');
    }

    return created;
  } catch (error) {
    wrapDietLogError('create', error);
  }
}

export async function getDietLogByUserAndId(
  userId: string,
  id: string,
  options?: { includeDeleted?: boolean }
): Promise<LocalDietLog | null> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const deletedFilter = options?.includeDeleted ? '' : 'AND deleted_at IS NULL';
    return await db.getFirstAsync<LocalDietLog>(
      `SELECT ${DIET_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dietLogs}
       WHERE id = ? AND user_id = ? ${deletedFilter}`,
      id,
      userId
    );
  } catch (error) {
    wrapDietLogError('read by id', error);
  }
}

export async function getDietLogsByUser(userId: string): Promise<LocalDietLog[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalDietLog>(
      `SELECT ${DIET_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dietLogs}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY logged_at DESC`,
      userId
    );
  } catch (error) {
    wrapDietLogError('read by user', error);
  }
}

export async function getDietLogsByUserAndDateRange(
  userId: string,
  startIso: string,
  endIso: string
): Promise<LocalDietLog[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalDietLog>(
      `SELECT ${DIET_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dietLogs}
       WHERE user_id = ?
         AND logged_at >= ?
         AND logged_at <= ?
         AND deleted_at IS NULL
       ORDER BY logged_at DESC`,
      userId,
      startIso,
      endIso
    );
  } catch (error) {
    wrapDietLogError('read by date range', error);
  }
}

export async function getUnsyncedNewDietLogsByUser(userId: string): Promise<LocalDietLog[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalDietLog>(
      `SELECT ${DIET_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dietLogs}
       WHERE user_id = ?
         AND deleted_at IS NULL
         AND sync_status IN ('pending', 'failed')
         AND remote_id IS NULL
       ORDER BY updated_at ASC, created_at ASC`,
      userId
    );
  } catch (error) {
    wrapDietLogError('read unsynced new', error);
  }
}

export async function updateDietLog(
  userId: string,
  id: string,
  input: UpdateLocalDietLogInput
): Promise<LocalDietLog> {
  try {
    assertUserId(userId);

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    const addUpdate = (column: string, value: string | number | null) => {
      updates.push(`${column} = ?`);
      values.push(value);
    };

    if (input.meal_name !== undefined) addUpdate('meal_name', input.meal_name.trim());
    if (input.meal_id !== undefined) addUpdate('meal_id', normalizeMealId(input.meal_id));
    if (input.calories !== undefined) addUpdate('calories', normalizeNullableNumber(input.calories));
    if (input.protein_g !== undefined) addUpdate('protein_g', normalizeNullableNumber(input.protein_g));
    if (input.carbs_g !== undefined) addUpdate('carbs_g', normalizeNullableNumber(input.carbs_g));
    if (input.fat_g !== undefined) addUpdate('fat_g', normalizeNullableNumber(input.fat_g));
    if (input.fiber_g !== undefined) addUpdate('fiber_g', normalizeNullableNumber(input.fiber_g));
    if (input.sodium_mg !== undefined) addUpdate('sodium_mg', normalizeNullableNumber(input.sodium_mg));
    if (input.potassium_mg !== undefined) addUpdate('potassium_mg', normalizeNullableNumber(input.potassium_mg));
    if (input.calcium_mg !== undefined) addUpdate('calcium_mg', normalizeNullableNumber(input.calcium_mg));
    if (input.iron_mg !== undefined) addUpdate('iron_mg', normalizeNullableNumber(input.iron_mg));
    if (input.vitamin_c_mg !== undefined) addUpdate('vitamin_c_mg', normalizeNullableNumber(input.vitamin_c_mg));
    if (input.folate_mcg !== undefined) addUpdate('folate_mcg', normalizeNullableNumber(input.folate_mcg));
    if (input.serving_size !== undefined) addUpdate('serving_size', normalizeNullableNumber(input.serving_size));
    if (input.serving_unit !== undefined) addUpdate('serving_unit', normalizeNullableText(input.serving_unit));
    if (input.source_food_id !== undefined) addUpdate('source_food_id', normalizeNullableText(input.source_food_id));
    if (input.logged_at !== undefined) addUpdate('logged_at', input.logged_at);

    if (updates.length === 0) {
      throw new Error('No diet log fields were provided for update.');
    }

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    values.push(now, id, userId);

    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.dietLogs}
       SET ${updates.join(', ')},
           updated_at = ?,
           sync_status = 'pending',
           last_synced_at = NULL
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      values
    );

    if (result.changes === 0) {
      throw new Error('Diet log was not found for the supplied user.');
    }

    const updated = await getDietLogByUserAndId(userId, id);

    if (!updated) {
      throw new Error('Updated diet log could not be read back.');
    }

    return updated;
  } catch (error) {
    wrapDietLogError('update', error);
  }
}

export async function softDeleteDietLog(userId: string, id: string): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.dietLogs}
       SET deleted_at = ?,
           updated_at = ?,
           sync_status = 'pending',
           last_synced_at = NULL
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      now,
      now,
      id,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Diet log was not found for the supplied user.');
    }
  } catch (error) {
    wrapDietLogError('soft delete', error);
  }
}

export async function markDietLogSynced(
  userId: string,
  id: string,
  remoteId: string
): Promise<LocalDietLog> {
  try {
    assertUserId(userId);
    assertRemoteId(remoteId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.dietLogs}
       SET remote_id = ?,
           sync_status = 'synced',
           updated_at = ?,
           last_synced_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      remoteId,
      now,
      now,
      id,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Diet log was not found for the supplied user.');
    }

    const synced = await getDietLogByUserAndId(userId, id);
    if (!synced) {
      throw new Error('Synced diet log could not be read back.');
    }

    return synced;
  } catch (error) {
    wrapDietLogError('mark synced', error);
  }
}

export async function markDietLogSyncFailed(userId: string, id: string): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.dietLogs}
       SET sync_status = 'failed',
           updated_at = ?,
           last_synced_at = NULL
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      now,
      id,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Diet log was not found for the supplied user.');
    }
  } catch (error) {
    wrapDietLogError('mark sync failed', error);
  }
}

export async function markDietLogDeleteSynced(userId: string, id: string): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.dietLogs}
       SET sync_status = 'synced',
           updated_at = ?,
           last_synced_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL`,
      now,
      now,
      id,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Deleted diet log was not found for the supplied user.');
    }
  } catch (error) {
    wrapDietLogError('mark delete synced', error);
  }
}

export async function upsertRemoteDietLogForUser(
  userId: string,
  remoteLog: RemoteDietLogInput
): Promise<LocalDietLog> {
  try {
    assertUserId(userId);
    assertRemoteId(remoteLog.id);

    const db = await initializeLocalDatabase();
    const existing = await db.getFirstAsync<LocalDietLog>(
      `SELECT ${DIET_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dietLogs}
       WHERE user_id = ? AND remote_id = ?
       LIMIT 1`,
      userId,
      remoteLog.id
    );

    if (existing) {
      if (existing.deleted_at || existing.sync_status !== 'synced') {
        return existing;
      }

      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.dietLogs}
         SET meal_name = ?,
             meal_id = COALESCE(meal_id, 'snack'),
             calories = ?,
             protein_g = ?,
             carbs_g = ?,
             fat_g = ?,
             logged_at = ?,
             updated_at = ?,
             sync_status = 'synced',
             last_synced_at = ?
         WHERE id = ? AND user_id = ? AND remote_id = ? AND deleted_at IS NULL AND sync_status = 'synced'`,
        remoteLog.meal_name.trim(),
        normalizeNullableNumber(remoteLog.calories),
        normalizeNullableNumber(remoteLog.protein_g),
        normalizeNullableNumber(remoteLog.carbs_g),
        normalizeNullableNumber(remoteLog.fat_g),
        remoteLog.logged_at,
        now,
        now,
        existing.id,
        userId,
        remoteLog.id
      );

      const updated = await getDietLogByUserAndId(userId, existing.id);
      if (!updated) {
        throw new Error('Updated remote diet log could not be read back.');
      }

      return updated;
    }

    const now = new Date().toISOString();
    const createdAt = remoteLog.created_at ?? now;
    const id = createLocalUuid();

    await db.runAsync(
      `INSERT INTO ${LOCAL_TABLES.dietLogs} (
        id,
        user_id,
        remote_id,
        meal_id,
        meal_name,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        sodium_mg,
        potassium_mg,
        calcium_mg,
        iron_mg,
        vitamin_c_mg,
        folate_mcg,
        serving_size,
        serving_unit,
        source_food_id,
        logged_at,
        created_at,
        updated_at,
        deleted_at,
        sync_status,
        last_synced_at
      ) VALUES (?, ?, ?, 'snack', ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'serving', NULL, ?, ?, ?, NULL, 'synced', ?)`,
      id,
      userId,
      remoteLog.id,
      remoteLog.meal_name.trim(),
      normalizeNullableNumber(remoteLog.calories),
      normalizeNullableNumber(remoteLog.protein_g),
      normalizeNullableNumber(remoteLog.carbs_g),
      normalizeNullableNumber(remoteLog.fat_g),
      remoteLog.logged_at,
      createdAt,
      now,
      now
    );

    const inserted = await getDietLogByUserAndId(userId, id);
    if (!inserted) {
      throw new Error('Inserted remote diet log could not be read back.');
    }

    return inserted;
  } catch (error) {
    wrapDietLogError('upsert remote', error);
  }
}
