import { initializeLocalDatabase } from '@/local/db';
import {
  LOCAL_TABLES,
  type CompletedWorkoutInput,
  type LocalWorkout,
  type LocalWorkoutSet,
  type LocalWorkoutWithSets,
} from '@/local/schema';

export interface RemoteWorkoutSetInput {
  id?: string;
  exercise_name: string;
  muscle_group?: string | null;
  set_number: number;
  reps?: number | null;
  weight_kg?: number | null;
  duration_seconds?: number | null;
  rir?: number | null;
  est_1rm?: number | null;
}

export interface RemoteWorkoutInput {
  id: string;
  name: string;
  notes?: string | null;
  performed_at: string;
  created_at?: string;
  workout_sets?: RemoteWorkoutSetInput[];
}

export interface WorkoutSetRemoteMatch {
  localSetId: string;
  remoteSetId: string;
}

const WORKOUT_COLUMNS = [
  'id',
  'user_id',
  'remote_id',
  'name',
  'notes',
  'performed_at',
  'created_at',
  'updated_at',
  'deleted_at',
  'sync_status',
  'last_synced_at',
].join(', ');

const WORKOUT_SET_COLUMNS = [
  'id',
  'user_id',
  'remote_id',
  'workout_id',
  'exercise_name',
  'muscle_group',
  'set_number',
  'reps',
  'weight_kg',
  'duration_seconds',
  'rir',
  'est_1rm',
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
    throw new Error('Local workout operation requires a Supabase user ID.');
  }
}

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeNullableInteger(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function wrapWorkoutError(action: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Local workout ${action} failed: ${message}`);
}

async function getSetsForWorkout(userId: string, workoutId: string): Promise<LocalWorkoutSet[]> {
  const db = await initializeLocalDatabase();
  return await db.getAllAsync<LocalWorkoutSet>(
    `SELECT ${WORKOUT_SET_COLUMNS}
     FROM ${LOCAL_TABLES.workoutSets}
     WHERE user_id = ? AND workout_id = ? AND deleted_at IS NULL
     ORDER BY exercise_name ASC, set_number ASC, created_at ASC`,
    userId,
    workoutId
  );
}

async function attachSets(userId: string, workouts: LocalWorkout[]): Promise<LocalWorkoutWithSets[]> {
  return await Promise.all(
    workouts.map(async (workout) => ({
      ...workout,
      sets: await getSetsForWorkout(userId, workout.id),
    }))
  );
}

export async function createWorkoutWithSetsLocal(
  userId: string,
  input: CompletedWorkoutInput
): Promise<LocalWorkoutWithSets> {
  try {
    assertUserId(userId);

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('Workout name is required.');
    }

    const cleanedSets = input.sets.filter((set) => set.exerciseName.trim().length > 0);
    if (cleanedSets.length === 0) {
      throw new Error('At least one completed workout set is required.');
    }

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const workoutId = createLocalUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${LOCAL_TABLES.workouts} (
          id,
          user_id,
          remote_id,
          name,
          notes,
          performed_at,
          created_at,
          updated_at,
          deleted_at,
          sync_status,
          last_synced_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
        workoutId,
        userId,
        trimmedName,
        normalizeNullableText(input.notes),
        input.performedAt,
        now,
        now
      );

      for (const set of cleanedSets) {
        await db.runAsync(
          `INSERT INTO ${LOCAL_TABLES.workoutSets} (
            id,
            user_id,
            remote_id,
            workout_id,
            exercise_name,
            muscle_group,
            set_number,
            reps,
            weight_kg,
            duration_seconds,
            rir,
            est_1rm,
            created_at,
            updated_at,
            deleted_at,
            sync_status,
            last_synced_at
          ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
          createLocalUuid(),
          userId,
          workoutId,
          set.exerciseName.trim(),
          normalizeNullableText(set.muscleGroup),
          Math.max(1, Math.trunc(set.setNumber)),
          normalizeNullableInteger(set.reps),
          normalizeNullableNumber(set.weightKg),
          normalizeNullableInteger(set.durationSeconds),
          normalizeNullableInteger(set.rir),
          normalizeNullableNumber(set.estimated1rm),
          now,
          now
        );
      }
    });

    const created = await getWorkoutWithSetsByUserAndId(userId, workoutId);
    if (!created) {
      throw new Error('Inserted workout could not be read back.');
    }

    return created;
  } catch (error) {
    wrapWorkoutError('create', error);
  }
}

export async function getWorkoutWithSetsByUserAndId(
  userId: string,
  workoutId: string,
  options?: { includeDeleted?: boolean }
): Promise<LocalWorkoutWithSets | null> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const deletedFilter = options?.includeDeleted ? '' : 'AND deleted_at IS NULL';
    const workout = await db.getFirstAsync<LocalWorkout>(
      `SELECT ${WORKOUT_COLUMNS}
       FROM ${LOCAL_TABLES.workouts}
       WHERE id = ? AND user_id = ? ${deletedFilter}`,
      workoutId,
      userId
    );

    if (!workout) return null;

    const sets = options?.includeDeleted
      ? await db.getAllAsync<LocalWorkoutSet>(
          `SELECT ${WORKOUT_SET_COLUMNS}
           FROM ${LOCAL_TABLES.workoutSets}
           WHERE user_id = ? AND workout_id = ?
           ORDER BY exercise_name ASC, set_number ASC, created_at ASC`,
          userId,
          workoutId
        )
      : await getSetsForWorkout(userId, workoutId);

    return { ...workout, sets };
  } catch (error) {
    wrapWorkoutError('read by id', error);
  }
}

export async function getWorkoutsByUser(userId: string): Promise<LocalWorkoutWithSets[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const workouts = await db.getAllAsync<LocalWorkout>(
      `SELECT ${WORKOUT_COLUMNS}
       FROM ${LOCAL_TABLES.workouts}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY performed_at DESC`,
      userId
    );

    return await attachSets(userId, workouts);
  } catch (error) {
    wrapWorkoutError('read by user', error);
  }
}

export async function getRecentWorkoutsByUser(
  userId: string,
  limit = 10
): Promise<LocalWorkoutWithSets[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const workouts = await db.getAllAsync<LocalWorkout>(
      `SELECT ${WORKOUT_COLUMNS}
       FROM ${LOCAL_TABLES.workouts}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY performed_at DESC
       LIMIT ?`,
      userId,
      Math.max(1, Math.trunc(limit))
    );

    return await attachSets(userId, workouts);
  } catch (error) {
    wrapWorkoutError('read recent', error);
  }
}

export async function getWorkoutsByUserSince(
  userId: string,
  sinceDate: string
): Promise<LocalWorkoutWithSets[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const workouts = await db.getAllAsync<LocalWorkout>(
      `SELECT ${WORKOUT_COLUMNS}
       FROM ${LOCAL_TABLES.workouts}
       WHERE user_id = ? AND performed_at >= ? AND deleted_at IS NULL
       ORDER BY performed_at DESC`,
      userId,
      sinceDate
    );

    return await attachSets(userId, workouts);
  } catch (error) {
    wrapWorkoutError('read workouts since', error);
  }
}

export async function getUnsyncedNewWorkoutsByUser(userId: string): Promise<LocalWorkoutWithSets[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const workouts = await db.getAllAsync<LocalWorkout>(
      `SELECT ${WORKOUT_COLUMNS}
       FROM ${LOCAL_TABLES.workouts}
       WHERE user_id = ?
         AND deleted_at IS NULL
         AND remote_id IS NULL
         AND sync_status IN ('pending', 'failed')
       ORDER BY updated_at ASC, created_at ASC`,
      userId
    );

    return await attachSets(userId, workouts);
  } catch (error) {
    wrapWorkoutError('read unsynced new', error);
  }
}

export async function softDeleteWorkout(userId: string, workoutId: string): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const workoutResult = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.workouts}
         SET deleted_at = ?,
             updated_at = ?,
             sync_status = 'pending',
             last_synced_at = NULL
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        now,
        workoutId,
        userId
      );

      if (workoutResult.changes === 0) {
        throw new Error('Workout was not found for the supplied user.');
      }

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.workoutSets}
         SET deleted_at = ?,
             updated_at = ?,
             sync_status = 'pending',
             last_synced_at = NULL
         WHERE workout_id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        now,
        workoutId,
        userId
      );
    });
  } catch (error) {
    wrapWorkoutError('soft delete', error);
  }
}

export async function markWorkoutSyncFailed(userId: string, workoutId: string): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const workoutResult = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.workouts}
         SET sync_status = 'failed',
             updated_at = ?,
             last_synced_at = NULL
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        workoutId,
        userId
      );

      if (workoutResult.changes === 0) {
        throw new Error('Workout was not found for the supplied user.');
      }

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.workoutSets}
         SET sync_status = 'failed',
             updated_at = ?,
             last_synced_at = NULL
         WHERE workout_id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        workoutId,
        userId
      );
    });
  } catch (error) {
    wrapWorkoutError('mark sync failed', error);
  }
}

export async function markWorkoutRemoteCreateIncomplete(
  userId: string,
  workoutId: string,
  remoteWorkoutId: string
): Promise<void> {
  try {
    assertUserId(userId);
    if (!remoteWorkoutId.trim()) {
      throw new Error('Remote workout ID is required.');
    }

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const workoutResult = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.workouts}
         SET remote_id = ?,
             sync_status = 'failed',
             updated_at = ?,
             last_synced_at = NULL
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        remoteWorkoutId,
        now,
        workoutId,
        userId
      );

      if (workoutResult.changes === 0) {
        throw new Error('Workout was not found for the supplied user.');
      }

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.workoutSets}
         SET sync_status = 'failed',
             updated_at = ?,
             last_synced_at = NULL
         WHERE workout_id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        workoutId,
        userId
      );
    });
  } catch (error) {
    wrapWorkoutError('mark remote create incomplete', error);
  }
}

export async function markWorkoutSynced(
  userId: string,
  workoutId: string,
  remoteWorkoutId: string,
  setMatches: WorkoutSetRemoteMatch[] = []
): Promise<LocalWorkoutWithSets> {
  try {
    assertUserId(userId);
    if (!remoteWorkoutId.trim()) {
      throw new Error('Remote workout ID is required.');
    }

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      const workoutResult = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.workouts}
         SET remote_id = ?,
             sync_status = 'synced',
             updated_at = ?,
             last_synced_at = ?
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        remoteWorkoutId,
        now,
        now,
        workoutId,
        userId
      );

      if (workoutResult.changes === 0) {
        throw new Error('Workout was not found for the supplied user.');
      }

      for (const match of setMatches) {
        await db.runAsync(
          `UPDATE ${LOCAL_TABLES.workoutSets}
           SET remote_id = ?,
               sync_status = 'synced',
               updated_at = ?,
               last_synced_at = ?
           WHERE id = ? AND workout_id = ? AND user_id = ? AND deleted_at IS NULL`,
          match.remoteSetId,
          now,
          now,
          match.localSetId,
          workoutId,
          userId
        );
      }
    });

    const synced = await getWorkoutWithSetsByUserAndId(userId, workoutId);
    if (!synced) {
      throw new Error('Synced workout could not be read back.');
    }

    return synced;
  } catch (error) {
    wrapWorkoutError('mark synced', error);
  }
}

export async function upsertRemoteWorkoutForUser(
  userId: string,
  remoteWorkout: RemoteWorkoutInput
): Promise<LocalWorkoutWithSets> {
  try {
    assertUserId(userId);
    if (!remoteWorkout.id.trim()) {
      throw new Error('Remote workout ID is required.');
    }

    const db = await initializeLocalDatabase();
    const existing = await db.getFirstAsync<LocalWorkout>(
      `SELECT ${WORKOUT_COLUMNS}
       FROM ${LOCAL_TABLES.workouts}
       WHERE user_id = ? AND remote_id = ?
       LIMIT 1`,
      userId,
      remoteWorkout.id
    );

    if (existing) {
      if (existing.deleted_at || existing.sync_status !== 'synced') {
        const existingWithSets = await getWorkoutWithSetsByUserAndId(userId, existing.id, {
          includeDeleted: true,
        });
        if (!existingWithSets) throw new Error('Existing remote workout could not be read back.');
        return existingWithSets;
      }

      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.workouts}
         SET name = ?,
             notes = ?,
             performed_at = ?,
             updated_at = ?,
             sync_status = 'synced',
             last_synced_at = ?
         WHERE id = ? AND user_id = ? AND remote_id = ? AND deleted_at IS NULL AND sync_status = 'synced'`,
        remoteWorkout.name.trim(),
        normalizeNullableText(remoteWorkout.notes),
        remoteWorkout.performed_at,
        now,
        now,
        existing.id,
        userId,
        remoteWorkout.id
      );

      const updated = await getWorkoutWithSetsByUserAndId(userId, existing.id);
      if (!updated) throw new Error('Updated remote workout could not be read back.');
      return updated;
    }

    const now = new Date().toISOString();
    const createdAt = remoteWorkout.created_at ?? now;
    const workoutId = createLocalUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${LOCAL_TABLES.workouts} (
          id,
          user_id,
          remote_id,
          name,
          notes,
          performed_at,
          created_at,
          updated_at,
          deleted_at,
          sync_status,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced', ?)`,
        workoutId,
        userId,
        remoteWorkout.id,
        remoteWorkout.name.trim(),
        normalizeNullableText(remoteWorkout.notes),
        remoteWorkout.performed_at,
        createdAt,
        now,
        now
      );

      for (const set of remoteWorkout.workout_sets ?? []) {
        await db.runAsync(
          `INSERT INTO ${LOCAL_TABLES.workoutSets} (
            id,
            user_id,
            remote_id,
            workout_id,
            exercise_name,
            muscle_group,
            set_number,
            reps,
            weight_kg,
            duration_seconds,
            rir,
            est_1rm,
            created_at,
            updated_at,
            deleted_at,
            sync_status,
            last_synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced', ?)`,
          createLocalUuid(),
          userId,
          normalizeNullableText(set.id),
          workoutId,
          set.exercise_name.trim(),
          normalizeNullableText(set.muscle_group),
          Math.max(1, Math.trunc(set.set_number)),
          normalizeNullableInteger(set.reps),
          normalizeNullableNumber(set.weight_kg),
          normalizeNullableInteger(set.duration_seconds),
          normalizeNullableInteger(set.rir),
          normalizeNullableNumber(set.est_1rm),
          createdAt,
          now,
          now
        );
      }
    });

    const inserted = await getWorkoutWithSetsByUserAndId(userId, workoutId);
    if (!inserted) throw new Error('Inserted remote workout could not be read back.');
    return inserted;
  } catch (error) {
    wrapWorkoutError('upsert remote', error);
  }
}
