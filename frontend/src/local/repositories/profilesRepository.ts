import { initializeLocalDatabase } from '@/local/db';
import {
  LOCAL_TABLES,
  type LocalProfile,
} from '@/local/schema';

type ProfileGender = LocalProfile['gender'];
type ProfileGoal = LocalProfile['goal'];

export interface UpsertLocalProfileInput {
  user_id: string;
  full_name?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  gender?: ProfileGender;
  goal?: ProfileGoal;
}

export interface RemoteProfileInput {
  full_name?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  gender?: ProfileGender;
  goal?: ProfileGoal;
  created_at?: string;
}

const PROFILE_COLUMNS = [
  'id',
  'user_id',
  'full_name',
  'height_cm',
  'weight_kg',
  'gender',
  'goal',
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
    throw new Error('Local profile operation requires a Supabase user ID.');
  }
}

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeGender(value: ProfileGender | undefined) {
  return value === 'male' || value === 'female' ? value : null;
}

function normalizeGoal(value: ProfileGoal | undefined) {
  return value === 'lose_weight' || value === 'build_muscle' || value === 'maintain'
    ? value
    : null;
}

function resolveText(value: string | null | undefined, fallback: string | null) {
  return value === undefined ? fallback : normalizeNullableText(value);
}

function resolveNumber(value: number | null | undefined, fallback: number | null) {
  return value === undefined ? fallback : normalizeNullableNumber(value);
}

function resolveGender(value: ProfileGender | undefined, fallback: ProfileGender) {
  return value === undefined ? fallback : normalizeGender(value);
}

function resolveGoal(value: ProfileGoal | undefined, fallback: ProfileGoal) {
  return value === undefined ? fallback : normalizeGoal(value);
}

function wrapProfileError(action: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Local profile ${action} failed: ${message}`);
}

async function getProfileByUserIncludingDeleted(userId: string): Promise<LocalProfile | null> {
  const db = await initializeLocalDatabase();
  return await db.getFirstAsync<LocalProfile>(
    `SELECT ${PROFILE_COLUMNS}
     FROM ${LOCAL_TABLES.profiles}
     WHERE user_id = ?
     LIMIT 1`,
    userId
  );
}

export async function getProfileByUser(userId: string): Promise<LocalProfile | null> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getFirstAsync<LocalProfile>(
      `SELECT ${PROFILE_COLUMNS}
       FROM ${LOCAL_TABLES.profiles}
       WHERE user_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      userId
    );
  } catch (error) {
    wrapProfileError('read by user', error);
  }
}

export async function upsertLocalProfile(input: UpsertLocalProfileInput): Promise<LocalProfile> {
  try {
    assertUserId(input.user_id);

    const db = await initializeLocalDatabase();
    const existing = await getProfileByUserIncludingDeleted(input.user_id);
    const now = new Date().toISOString();

    if (existing) {
      const result = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.profiles}
         SET full_name = ?,
             height_cm = ?,
             weight_kg = ?,
             gender = ?,
             goal = ?,
             updated_at = ?,
             deleted_at = NULL,
             sync_status = 'pending',
             last_synced_at = NULL
         WHERE user_id = ?`,
        resolveText(input.full_name, existing.full_name),
        resolveNumber(input.height_cm, existing.height_cm),
        resolveNumber(input.weight_kg, existing.weight_kg),
        resolveGender(input.gender, existing.gender),
        resolveGoal(input.goal, existing.goal),
        now,
        input.user_id
      );

      if (result.changes === 0) {
        throw new Error('Profile row was not found for the supplied user.');
      }
    } else {
      await db.runAsync(
        `INSERT INTO ${LOCAL_TABLES.profiles} (
          id,
          user_id,
          full_name,
          height_cm,
          weight_kg,
          gender,
          goal,
          created_at,
          updated_at,
          deleted_at,
          sync_status,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
        createLocalUuid(),
        input.user_id,
        resolveText(input.full_name, null),
        resolveNumber(input.height_cm, null),
        resolveNumber(input.weight_kg, null),
        resolveGender(input.gender, null),
        resolveGoal(input.goal, null),
        now,
        now
      );
    }

    const upserted = await getProfileByUser(input.user_id);
    if (!upserted) {
      throw new Error('Upserted profile row could not be read back.');
    }

    return upserted;
  } catch (error) {
    wrapProfileError('upsert local', error);
  }
}

export async function getUnsyncedProfileByUser(userId: string): Promise<LocalProfile | null> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getFirstAsync<LocalProfile>(
      `SELECT ${PROFILE_COLUMNS}
       FROM ${LOCAL_TABLES.profiles}
       WHERE user_id = ?
         AND deleted_at IS NULL
         AND sync_status IN ('pending', 'failed')
       LIMIT 1`,
      userId
    );
  } catch (error) {
    wrapProfileError('read unsynced', error);
  }
}

export async function markProfileSynced(userId: string): Promise<LocalProfile> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.profiles}
       SET sync_status = 'synced',
           updated_at = ?,
           last_synced_at = ?
       WHERE user_id = ? AND deleted_at IS NULL`,
      now,
      now,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Profile row was not found for the supplied user.');
    }

    const synced = await getProfileByUser(userId);
    if (!synced) {
      throw new Error('Synced profile row could not be read back.');
    }

    return synced;
  } catch (error) {
    wrapProfileError('mark synced', error);
  }
}

export async function markProfileSyncFailed(userId: string): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.profiles}
       SET sync_status = 'failed',
           updated_at = ?,
           last_synced_at = NULL
       WHERE user_id = ? AND deleted_at IS NULL`,
      now,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Profile row was not found for the supplied user.');
    }
  } catch (error) {
    wrapProfileError('mark sync failed', error);
  }
}

export async function upsertRemoteProfileForUser(
  userId: string,
  remoteProfile: RemoteProfileInput
): Promise<LocalProfile> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const existing = await getProfileByUserIncludingDeleted(userId);
    const now = new Date().toISOString();

    if (existing) {
      if (existing.deleted_at || existing.sync_status !== 'synced') {
        return existing;
      }

      const result = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.profiles}
         SET full_name = ?,
             height_cm = ?,
             weight_kg = ?,
             gender = ?,
             goal = ?,
             updated_at = ?,
             sync_status = 'synced',
             last_synced_at = ?
         WHERE user_id = ? AND deleted_at IS NULL AND sync_status = 'synced'`,
        resolveText(remoteProfile.full_name, existing.full_name),
        resolveNumber(remoteProfile.height_cm, existing.height_cm),
        resolveNumber(remoteProfile.weight_kg, existing.weight_kg),
        resolveGender(remoteProfile.gender, existing.gender),
        resolveGoal(remoteProfile.goal, existing.goal),
        now,
        now,
        userId
      );

      if (result.changes === 0) {
        throw new Error('Profile row was not found for the supplied user.');
      }

      const updated = await getProfileByUser(userId);
      if (!updated) {
        throw new Error('Updated remote profile row could not be read back.');
      }

      return updated;
    }

    const createdAt = remoteProfile.created_at ?? now;
    await db.runAsync(
      `INSERT INTO ${LOCAL_TABLES.profiles} (
        id,
        user_id,
        full_name,
        height_cm,
        weight_kg,
        gender,
        goal,
        created_at,
        updated_at,
        deleted_at,
        sync_status,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced', ?)`,
      createLocalUuid(),
      userId,
      resolveText(remoteProfile.full_name, null),
      resolveNumber(remoteProfile.height_cm, null),
      resolveNumber(remoteProfile.weight_kg, null),
      resolveGender(remoteProfile.gender, null),
      resolveGoal(remoteProfile.goal, null),
      createdAt,
      now,
      now
    );

    const inserted = await getProfileByUser(userId);
    if (!inserted) {
      throw new Error('Inserted remote profile row could not be read back.');
    }

    return inserted;
  } catch (error) {
    wrapProfileError('upsert remote', error);
  }
}
