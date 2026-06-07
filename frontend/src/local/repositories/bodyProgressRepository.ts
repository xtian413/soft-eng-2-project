import { initializeLocalDatabase } from '@/local/db';
import {
  LOCAL_TABLES,
  type LocalBodyProgress,
} from '@/local/schema';

export interface CreateLocalBodyProgressInput {
  user_id: string;
  weight_kg: number;
  body_fat_pct?: number | null;
  recorded_at: string;
}

export interface RemoteBodyProgressInput {
  id: string;
  weight_kg: number;
  body_fat_pct?: number | null;
  recorded_at: string;
  created_at?: string;
}

const BODY_PROGRESS_COLUMNS = [
  'id',
  'user_id',
  'remote_id',
  'weight_kg',
  'body_fat_pct',
  'recorded_at',
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
    throw new Error('Local body-progress operation requires a Supabase user ID.');
  }
}

function assertRemoteId(remoteId: string) {
  if (!remoteId.trim()) {
    throw new Error('Local body-progress sync operation requires a backend progress ID.');
  }
}

function normalizeWeightKg(value: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error('Body-progress weight must be a positive number.');
  }

  return value;
}

function normalizeNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function wrapBodyProgressError(action: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Local body-progress ${action} failed: ${message}`);
}

export async function createBodyProgressLocal(
  input: CreateLocalBodyProgressInput
): Promise<LocalBodyProgress> {
  try {
    assertUserId(input.user_id);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const id = createLocalUuid();

    await db.runAsync(
      `INSERT INTO ${LOCAL_TABLES.bodyProgress} (
        id,
        user_id,
        remote_id,
        weight_kg,
        body_fat_pct,
        recorded_at,
        created_at,
        updated_at,
        deleted_at,
        sync_status,
        last_synced_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
      id,
      input.user_id,
      normalizeWeightKg(input.weight_kg),
      normalizeNullableNumber(input.body_fat_pct),
      input.recorded_at,
      now,
      now
    );

    const created = await getBodyProgressByUserAndId(input.user_id, id);
    if (!created) {
      throw new Error('Inserted body-progress row could not be read back.');
    }

    return created;
  } catch (error) {
    wrapBodyProgressError('create', error);
  }
}

export async function getBodyProgressByUserAndId(
  userId: string,
  id: string,
  options?: { includeDeleted?: boolean }
): Promise<LocalBodyProgress | null> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const deletedFilter = options?.includeDeleted ? '' : 'AND deleted_at IS NULL';
    return await db.getFirstAsync<LocalBodyProgress>(
      `SELECT ${BODY_PROGRESS_COLUMNS}
       FROM ${LOCAL_TABLES.bodyProgress}
       WHERE id = ? AND user_id = ? ${deletedFilter}`,
      id,
      userId
    );
  } catch (error) {
    wrapBodyProgressError('read by id', error);
  }
}

export async function getBodyProgressByUser(userId: string): Promise<LocalBodyProgress[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalBodyProgress>(
      `SELECT ${BODY_PROGRESS_COLUMNS}
       FROM ${LOCAL_TABLES.bodyProgress}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY recorded_at ASC`,
      userId
    );
  } catch (error) {
    wrapBodyProgressError('read by user', error);
  }
}

export async function getUnsyncedNewBodyProgressByUser(
  userId: string
): Promise<LocalBodyProgress[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalBodyProgress>(
      `SELECT ${BODY_PROGRESS_COLUMNS}
       FROM ${LOCAL_TABLES.bodyProgress}
       WHERE user_id = ?
         AND deleted_at IS NULL
         AND remote_id IS NULL
         AND sync_status IN ('pending', 'failed')
       ORDER BY updated_at ASC, created_at ASC`,
      userId
    );
  } catch (error) {
    wrapBodyProgressError('read unsynced new', error);
  }
}

export async function markBodyProgressSynced(
  userId: string,
  id: string,
  remoteId: string
): Promise<LocalBodyProgress> {
  try {
    assertUserId(userId);
    assertRemoteId(remoteId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.bodyProgress}
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
      throw new Error('Body-progress row was not found for the supplied user.');
    }

    const synced = await getBodyProgressByUserAndId(userId, id);
    if (!synced) {
      throw new Error('Synced body-progress row could not be read back.');
    }

    return synced;
  } catch (error) {
    wrapBodyProgressError('mark synced', error);
  }
}

export async function markBodyProgressSyncFailed(userId: string, id: string): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.bodyProgress}
       SET sync_status = 'failed',
           updated_at = ?,
           last_synced_at = NULL
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      now,
      id,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Body-progress row was not found for the supplied user.');
    }
  } catch (error) {
    wrapBodyProgressError('mark sync failed', error);
  }
}

export async function upsertRemoteBodyProgressForUser(
  userId: string,
  remoteRows: RemoteBodyProgressInput[]
): Promise<LocalBodyProgress[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const upsertedRows: LocalBodyProgress[] = [];

    for (const remoteRow of remoteRows) {
      assertRemoteId(remoteRow.id);

      const existing = await db.getFirstAsync<LocalBodyProgress>(
        `SELECT ${BODY_PROGRESS_COLUMNS}
         FROM ${LOCAL_TABLES.bodyProgress}
         WHERE user_id = ? AND remote_id = ?
         LIMIT 1`,
        userId,
        remoteRow.id
      );

      if (existing) {
        if (existing.deleted_at || existing.sync_status !== 'synced') {
          upsertedRows.push(existing);
          continue;
        }

        const now = new Date().toISOString();
        await db.runAsync(
          `UPDATE ${LOCAL_TABLES.bodyProgress}
           SET weight_kg = ?,
               body_fat_pct = ?,
               recorded_at = ?,
               updated_at = ?,
               sync_status = 'synced',
               last_synced_at = ?
           WHERE id = ?
             AND user_id = ?
             AND remote_id = ?
             AND deleted_at IS NULL
             AND sync_status = 'synced'`,
          normalizeWeightKg(remoteRow.weight_kg),
          normalizeNullableNumber(remoteRow.body_fat_pct),
          remoteRow.recorded_at,
          now,
          now,
          existing.id,
          userId,
          remoteRow.id
        );

        const updated = await getBodyProgressByUserAndId(userId, existing.id);
        if (!updated) {
          throw new Error('Updated remote body-progress row could not be read back.');
        }

        upsertedRows.push(updated);
        continue;
      }

      const now = new Date().toISOString();
      const createdAt = remoteRow.created_at ?? now;
      const id = createLocalUuid();

      await db.runAsync(
        `INSERT INTO ${LOCAL_TABLES.bodyProgress} (
          id,
          user_id,
          remote_id,
          weight_kg,
          body_fat_pct,
          recorded_at,
          created_at,
          updated_at,
          deleted_at,
          sync_status,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced', ?)`,
        id,
        userId,
        remoteRow.id,
        normalizeWeightKg(remoteRow.weight_kg),
        normalizeNullableNumber(remoteRow.body_fat_pct),
        remoteRow.recorded_at,
        createdAt,
        now,
        now
      );

      const inserted = await getBodyProgressByUserAndId(userId, id);
      if (!inserted) {
        throw new Error('Inserted remote body-progress row could not be read back.');
      }

      upsertedRows.push(inserted);
    }

    return upsertedRows;
  } catch (error) {
    wrapBodyProgressError('upsert remote', error);
  }
}

export async function updateBodyProgressLocal(
  userId: string,
  id: string,
  input: { weight_kg: number; body_fat_pct?: number | null; recorded_at?: string }
): Promise<LocalBodyProgress> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE ${LOCAL_TABLES.bodyProgress}
       SET weight_kg = ?,
           body_fat_pct = ?,
           recorded_at = ?,
           updated_at = ?,
           sync_status = 'pending'
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      normalizeWeightKg(input.weight_kg),
      normalizeNullableNumber(input.body_fat_pct),
      input.recorded_at ?? now,
      now,
      id,
      userId
    );

    const updated = await getBodyProgressByUserAndId(userId, id);
    if (!updated) {
      throw new Error('Updated body-progress row could not be read back.');
    }

    return updated;
  } catch (error) {
    wrapBodyProgressError('update', error);
  }
}
