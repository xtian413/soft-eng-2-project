import { initializeLocalDatabase } from '@/local/db';
import {
  LOCAL_TABLES,
  type LocalDailyLog,
} from '@/local/schema';

export interface UpsertDailyLogInput {
  bedtime?: string | null;
  waketime?: string | null;
  sleep_hours?: number | null;
  water_ml?: number | null;
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

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Local daily log operation requires a valid YYYY-MM-DD date.');
  }
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
  yearMonth: string // e.g. '2026-06'
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
      `SELECT id, bedtime, waketime, sleep_hours, water_ml
       FROM ${LOCAL_TABLES.dailyLogs}
       WHERE user_id = ? AND date = ?`,
      userId,
      date
    );

    const now = new Date().toISOString();

    if (existing) {
      const bedtime = input.bedtime !== undefined ? input.bedtime : existing.bedtime;
      const waketime = input.waketime !== undefined ? input.waketime : existing.waketime;
      const sleep_hours = input.sleep_hours !== undefined ? input.sleep_hours : existing.sleep_hours;
      const water_ml = input.water_ml !== undefined ? input.water_ml : existing.water_ml;

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.dailyLogs}
         SET bedtime = ?,
             waketime = ?,
             sleep_hours = ?,
             water_ml = ?,
             updated_at = ?,
             deleted_at = NULL,
             sync_status = 'pending',
             last_synced_at = NULL
         WHERE id = ?`,
        bedtime,
        waketime,
        sleep_hours,
        water_ml,
        now,
        existing.id
      );
    } else {
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
          created_at,
          updated_at,
          deleted_at,
          sync_status,
          last_synced_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
        id,
        userId,
        date,
        input.bedtime ?? null,
        input.waketime ?? null,
        input.sleep_hours ?? null,
        input.water_ml ?? null,
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
