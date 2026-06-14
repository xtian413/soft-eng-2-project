import { initializeLocalDatabase } from '@/local/db';
import {
  LOCAL_TABLES,
  type LocalDailyLog,
} from '@/local/schema';

const DEFAULT_WATER_GOAL_ML = 2000;

export interface UpsertDailyLogInput {
  bedtime?: string | null;
  waketime?: string | null;
  sleep_hours?: number | null;
  water_ml?: number | null;
  water_goal_ml?: number | null;
}

export interface RemoteDailyLogInput {
  id: string;
  date: string;
  bedtime?: string | null;
  waketime?: string | null;
  sleep_hours?: number | null;
  water_ml?: number | null;
  water_goal_ml?: number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

const DAILY_LOG_COLUMNS = [
  'id',
  'user_id',
  'remote_id',
  'date',
  'bedtime',
  'waketime',
  'sleep_hours',
  'water_ml',
  'water_goal_ml',
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
    throw new Error('Local daily log operation requires a Supabase user ID.');
  }
}

function assertRemoteId(remoteId: string) {
  if (!remoteId.trim()) {
    throw new Error('Local daily log sync operation requires a backend daily-log ID.');
  }
}

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Local daily log operation requires a valid YYYY-MM-DD date.');
  }
}

function normalizeNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeWaterGoal(value: number | null | undefined) {
  const normalized = normalizeNullableNumber(value);
  return normalized && normalized > 0 ? normalized : DEFAULT_WATER_GOAL_ML;
}

function wrapDailyLogError(action: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Local daily log ${action} failed: ${message}`);
}

export async function getDailyLogByDate(
  userId: string,
  date: string
): Promise<LocalDailyLog | null> {
  try {
    assertUserId(userId);
    assertDate(date);

    const db = await initializeLocalDatabase();
    return await db.getFirstAsync<LocalDailyLog>(
      `SELECT ${DAILY_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE user_id = ? AND date = ? AND deleted_at IS NULL
       LIMIT 1`,
      userId,
      date
    );
  } catch (error) {
    wrapDailyLogError('read by date', error);
  }
}

export async function getDailyLogsByMonth(
  userId: string,
  yearMonth: string
): Promise<LocalDailyLog[]> {
  try {
    assertUserId(userId);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new Error('Local daily log monthly read requires a valid YYYY-MM date.');
    }

    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalDailyLog>(
      `SELECT ${DAILY_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE user_id = ? AND date LIKE ? AND deleted_at IS NULL
       ORDER BY date ASC`,
      userId,
      `${yearMonth}-%`
    );
  } catch (error) {
    wrapDailyLogError('read by month', error);
  }
}

export async function getDailyLogsByUser(
  userId: string
): Promise<LocalDailyLog[]> {
  try {
    assertUserId(userId);
    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalDailyLog>(
      `SELECT ${DAILY_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY date DESC`,
      userId
    );
  } catch (error) {
    wrapDailyLogError('read by user', error);
  }
}

export async function getUnsyncedDailyLogsByUser(userId: string): Promise<LocalDailyLog[]> {
  try {
    assertUserId(userId);
    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalDailyLog>(
      `SELECT ${DAILY_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE user_id = ?
         AND sync_status IN ('pending', 'failed')
       ORDER BY updated_at ASC, created_at ASC`,
      userId
    );
  } catch (error) {
    wrapDailyLogError('read unsynced', error);
  }
}

export async function upsertDailyLog(
  userId: string,
  date: string,
  input: UpsertDailyLogInput
): Promise<LocalDailyLog> {
  try {
    assertUserId(userId);
    assertDate(date);

    const db = await initializeLocalDatabase();
    const existing = await db.getFirstAsync<LocalDailyLog>(
      `SELECT ${DAILY_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE user_id = ? AND date = ? AND deleted_at IS NULL
       LIMIT 1`,
      userId,
      date
    );

    const now = new Date().toISOString();

    if (existing) {
      const bedtime = input.bedtime !== undefined ? input.bedtime : existing.bedtime;
      const waketime = input.waketime !== undefined ? input.waketime : existing.waketime;
      const sleep_hours = input.sleep_hours !== undefined ? input.sleep_hours : existing.sleep_hours;
      const water_ml = input.water_ml !== undefined ? input.water_ml : existing.water_ml;
      const water_goal_ml =
        input.water_goal_ml !== undefined
          ? normalizeWaterGoal(input.water_goal_ml)
          : normalizeWaterGoal(existing.water_goal_ml);

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.dailyLogs}
         SET bedtime = ?,
             waketime = ?,
             sleep_hours = ?,
             water_ml = ?,
             water_goal_ml = ?,
             updated_at = ?,
             sync_status = 'pending',
             last_synced_at = NULL
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        bedtime,
        waketime,
        normalizeNullableNumber(sleep_hours),
        normalizeNullableNumber(water_ml),
        water_goal_ml,
        now,
        existing.id,
        userId
      );
    } else {
      const deletedDuplicate = await db.getFirstAsync<{ id: string }>(
        `SELECT id
         FROM ${LOCAL_TABLES.dailyLogs}
         WHERE user_id = ? AND date = ? AND deleted_at IS NOT NULL
         LIMIT 1`,
        userId,
        date
      );
      if (deletedDuplicate) {
        throw new Error('A deleted daily log already exists for this date.');
      }

      const id = createLocalUuid();
      await db.runAsync(
        `INSERT INTO ${LOCAL_TABLES.dailyLogs} (
          id,
          user_id,
          remote_id,
          date,
          bedtime,
          waketime,
          sleep_hours,
          water_ml,
          water_goal_ml,
          created_at,
          updated_at,
          deleted_at,
          sync_status,
          last_synced_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
        id,
        userId,
        date,
        input.bedtime ?? null,
        input.waketime ?? null,
        normalizeNullableNumber(input.sleep_hours),
        normalizeNullableNumber(input.water_ml),
        normalizeWaterGoal(input.water_goal_ml),
        now,
        now
      );
    }

    const updated = await getDailyLogByDate(userId, date);
    if (!updated) {
      throw new Error('Upserted daily log row could not be read back.');
    }

    return updated;
  } catch (error) {
    wrapDailyLogError('upsert', error);
  }
}

export async function softDeleteDailyLog(userId: string, date: string): Promise<void> {
  try {
    assertUserId(userId);
    assertDate(date);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.dailyLogs}
       SET deleted_at = ?,
           updated_at = ?,
           sync_status = 'pending',
           last_synced_at = NULL
       WHERE user_id = ? AND date = ? AND deleted_at IS NULL`,
      now,
      now,
      userId,
      date
    );

    if (result.changes === 0) {
      throw new Error('Daily log was not found for the supplied user and date.');
    }
  } catch (error) {
    wrapDailyLogError('soft delete', error);
  }
}

export async function markDailyLogSynced(
  userId: string,
  id: string,
  remoteId: string,
  remoteUpdatedAt?: string
): Promise<LocalDailyLog> {
  try {
    assertUserId(userId);
    assertRemoteId(remoteId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const syncedUpdatedAt = remoteUpdatedAt ?? now;
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.dailyLogs}
       SET remote_id = ?,
           sync_status = 'synced',
           updated_at = ?,
           last_synced_at = ?
       WHERE id = ? AND user_id = ?`,
      remoteId,
      syncedUpdatedAt,
      now,
      id,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Daily log was not found for the supplied user.');
    }

    const synced = await db.getFirstAsync<LocalDailyLog>(
      `SELECT ${DAILY_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      id,
      userId
    );
    if (!synced) {
      throw new Error('Synced daily log could not be read back.');
    }

    return synced;
  } catch (error) {
    wrapDailyLogError('mark synced', error);
  }
}

export async function markDailyLogSyncFailed(userId: string, id: string): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.dailyLogs}
       SET sync_status = 'failed',
           last_synced_at = NULL
       WHERE id = ? AND user_id = ?`,
      id,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Daily log was not found for the supplied user.');
    }
  } catch (error) {
    wrapDailyLogError('mark sync failed', error);
  }
}

export async function upsertRemoteDailyLogForUser(
  userId: string,
  remoteLog: RemoteDailyLogInput
): Promise<LocalDailyLog> {
  try {
    assertUserId(userId);
    assertRemoteId(remoteLog.id);
    assertDate(remoteLog.date);

    const db = await initializeLocalDatabase();
    const existing = await db.getFirstAsync<LocalDailyLog>(
      `SELECT ${DAILY_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE user_id = ? AND (remote_id = ? OR date = ?)
       ORDER BY CASE WHEN remote_id = ? THEN 0 ELSE 1 END
       LIMIT 1`,
      userId,
      remoteLog.id,
      remoteLog.date,
      remoteLog.id
    );

    const now = new Date().toISOString();
    const remoteUpdatedAt = remoteLog.updated_at ?? remoteLog.created_at ?? now;
    const remoteDeletedAt = remoteLog.deleted_at ?? null;

    if (existing) {
      // Conflict rule: keep unsynced local edits/deletes; only apply cloud rows over clean synced rows.
      if (existing.sync_status !== 'synced') {
        return existing;
      }

      if (existing.updated_at && remoteUpdatedAt < existing.updated_at) {
        return existing;
      }

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.dailyLogs}
         SET remote_id = ?,
             bedtime = ?,
             waketime = ?,
             sleep_hours = ?,
             water_ml = ?,
             water_goal_ml = ?,
             updated_at = ?,
             deleted_at = ?,
             sync_status = 'synced',
             last_synced_at = ?
         WHERE id = ? AND user_id = ? AND sync_status = 'synced'`,
        remoteLog.id,
        remoteLog.bedtime ?? null,
        remoteLog.waketime ?? null,
        normalizeNullableNumber(remoteLog.sleep_hours),
        normalizeNullableNumber(remoteLog.water_ml),
        normalizeWaterGoal(remoteLog.water_goal_ml),
        remoteUpdatedAt,
        remoteDeletedAt,
        now,
        existing.id,
        userId
      );

      const updated = await db.getFirstAsync<LocalDailyLog>(
        `SELECT ${DAILY_LOG_COLUMNS}
         FROM ${LOCAL_TABLES.dailyLogs}
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        existing.id,
        userId
      );
      if (!updated) {
        throw new Error('Updated remote daily log could not be read back.');
      }

      return updated;
    }

    const id = createLocalUuid();
    const createdAt = remoteLog.created_at ?? now;
    await db.runAsync(
      `INSERT INTO ${LOCAL_TABLES.dailyLogs} (
        id,
        user_id,
        remote_id,
        date,
        bedtime,
        waketime,
        sleep_hours,
        water_ml,
        water_goal_ml,
        created_at,
        updated_at,
        deleted_at,
        sync_status,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
      id,
      userId,
      remoteLog.id,
      remoteLog.date,
      remoteLog.bedtime ?? null,
      remoteLog.waketime ?? null,
      normalizeNullableNumber(remoteLog.sleep_hours),
      normalizeNullableNumber(remoteLog.water_ml),
      normalizeWaterGoal(remoteLog.water_goal_ml),
      createdAt,
      remoteUpdatedAt,
      remoteDeletedAt,
      now
    );

    const inserted = await db.getFirstAsync<LocalDailyLog>(
      `SELECT ${DAILY_LOG_COLUMNS}
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      id,
      userId
    );
    if (!inserted) {
      throw new Error('Inserted remote daily log could not be read back.');
    }

    return inserted;
  } catch (error) {
    wrapDailyLogError('upsert remote', error);
  }
}
