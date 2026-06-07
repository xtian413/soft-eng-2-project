import { initializeLocalDatabase } from '@/local/db';
import {
  LOCAL_TABLES,
  type CreateLocalRoutineInput,
  type LocalRoutine,
  type LocalRoutineExercise,
  type LocalRoutineWithExercises,
} from '@/local/schema';

const ROUTINE_COLUMNS = [
  'id',
  'user_id',
  'remote_id',
  'remote_template_workout_id',
  'routine_name',
  'created_at',
  'updated_at',
  'deleted_at',
  'sync_status',
  'last_synced_at',
].join(', ');

const ROUTINE_EXERCISE_COLUMNS = [
  'id',
  'user_id',
  'remote_id',
  'routine_id',
  'exercise_name',
  'muscle_group',
  'sort_order',
  'sets',
  'reps',
  'weight_kg',
  'created_at',
  'updated_at',
  'deleted_at',
  'sync_status',
  'last_synced_at',
].join(', ');

export interface RoutineExerciseRemoteMatch {
  localExerciseId: string;
  remoteExerciseId: string;
}

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
    throw new Error('Local routine operation requires a Supabase user ID.');
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

function wrapRoutineError(action: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Local routine ${action} failed: ${message}`);
}

function validateRoutineInput(input: CreateLocalRoutineInput) {
  const routineName = input.routineName.trim();
  if (!routineName) {
    throw new Error('Routine name is required.');
  }

  const exercises = input.exercises.filter((exercise) => exercise.exerciseName.trim().length > 0);
  if (exercises.length === 0) {
    throw new Error('At least one routine exercise is required.');
  }

  return { routineName, exercises };
}

async function getExercisesForRoutine(
  userId: string,
  routineId: string,
  options?: { includeDeleted?: boolean }
): Promise<LocalRoutineExercise[]> {
  const db = await initializeLocalDatabase();
  const deletedFilter = options?.includeDeleted ? '' : 'AND deleted_at IS NULL';
  return await db.getAllAsync<LocalRoutineExercise>(
    `SELECT ${ROUTINE_EXERCISE_COLUMNS}
     FROM ${LOCAL_TABLES.routineExercises}
     WHERE user_id = ? AND routine_id = ? ${deletedFilter}
     ORDER BY sort_order ASC, created_at ASC`,
    userId,
    routineId
  );
}

async function attachExercises(
  userId: string,
  routines: LocalRoutine[]
): Promise<LocalRoutineWithExercises[]> {
  return await Promise.all(
    routines.map(async (routine) => ({
      ...routine,
      exercises: await getExercisesForRoutine(userId, routine.id),
    }))
  );
}

async function insertRoutineExercises(
  userId: string,
  routineId: string,
  exercises: CreateLocalRoutineInput['exercises'],
  now: string,
  syncStatus: 'pending' | 'synced'
) {
  const db = await initializeLocalDatabase();

  for (const exercise of exercises) {
    await db.runAsync(
      `INSERT INTO ${LOCAL_TABLES.routineExercises} (
        id,
        user_id,
        remote_id,
        routine_id,
        exercise_name,
        muscle_group,
        sort_order,
        sets,
        reps,
        weight_kg,
        created_at,
        updated_at,
        deleted_at,
        sync_status,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      exercise.id ?? createLocalUuid(),
      userId,
      normalizeNullableText(exercise.remoteId),
      routineId,
      exercise.exerciseName.trim(),
      normalizeNullableText(exercise.muscleGroup),
      Math.max(0, Math.trunc(exercise.sortOrder)),
      normalizeNullableInteger(exercise.sets),
      normalizeNullableInteger(exercise.reps),
      normalizeNullableNumber(exercise.weightKg),
      now,
      now,
      syncStatus,
      syncStatus === 'synced' ? now : null
    );
  }
}

export async function createRoutineWithExercisesLocal(
  userId: string,
  input: CreateLocalRoutineInput
): Promise<LocalRoutineWithExercises> {
  try {
    assertUserId(userId);
    const { routineName, exercises } = validateRoutineInput(input);
    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const routineId = createLocalUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${LOCAL_TABLES.routines} (
          id,
          user_id,
          remote_id,
          remote_template_workout_id,
          routine_name,
          created_at,
          updated_at,
          deleted_at,
          sync_status,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
        routineId,
        userId,
        normalizeNullableText(input.remoteId),
        normalizeNullableText(input.remoteTemplateWorkoutId),
        routineName,
        now,
        now
      );

      await insertRoutineExercises(userId, routineId, exercises, now, 'pending');
    });

    const created = await getRoutineWithExercisesByUserAndId(userId, routineId);
    if (!created) {
      throw new Error('Inserted routine could not be read back.');
    }

    return created;
  } catch (error) {
    wrapRoutineError('create', error);
  }
}

export async function updateRoutineWithExercisesLocal(
  userId: string,
  routineId: string,
  input: CreateLocalRoutineInput
): Promise<LocalRoutineWithExercises> {
  try {
    assertUserId(userId);
    const { routineName, exercises } = validateRoutineInput(input);
    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.routines}
         SET routine_name = ?,
             remote_id = COALESCE(?, remote_id),
             remote_template_workout_id = COALESCE(?, remote_template_workout_id),
             updated_at = ?,
             sync_status = 'pending',
             last_synced_at = NULL
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        routineName,
        normalizeNullableText(input.remoteId),
        normalizeNullableText(input.remoteTemplateWorkoutId),
        now,
        routineId,
        userId
      );

      if (result.changes === 0) {
        throw new Error('Routine was not found for the supplied user.');
      }

      await db.runAsync(
        `DELETE FROM ${LOCAL_TABLES.routineExercises}
         WHERE routine_id = ? AND user_id = ?`,
        routineId,
        userId
      );

      await insertRoutineExercises(userId, routineId, exercises, now, 'pending');
    });

    const updated = await getRoutineWithExercisesByUserAndId(userId, routineId);
    if (!updated) {
      throw new Error('Updated routine could not be read back.');
    }

    return updated;
  } catch (error) {
    wrapRoutineError('update', error);
  }
}

export async function getRoutineWithExercisesByUserAndId(
  userId: string,
  routineId: string,
  options?: { includeDeleted?: boolean }
): Promise<LocalRoutineWithExercises | null> {
  try {
    assertUserId(userId);
    const db = await initializeLocalDatabase();
    const deletedFilter = options?.includeDeleted ? '' : 'AND deleted_at IS NULL';
    const routine = await db.getFirstAsync<LocalRoutine>(
      `SELECT ${ROUTINE_COLUMNS}
       FROM ${LOCAL_TABLES.routines}
       WHERE id = ? AND user_id = ? ${deletedFilter}`,
      routineId,
      userId
    );

    if (!routine) return null;

    return {
      ...routine,
      exercises: await getExercisesForRoutine(userId, routine.id, options),
    };
  } catch (error) {
    wrapRoutineError('read by id', error);
  }
}

export async function getRoutinesByUser(userId: string): Promise<LocalRoutineWithExercises[]> {
  try {
    assertUserId(userId);
    const db = await initializeLocalDatabase();
    const routines = await db.getAllAsync<LocalRoutine>(
      `SELECT ${ROUTINE_COLUMNS}
       FROM ${LOCAL_TABLES.routines}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC, created_at DESC`,
      userId
    );

    return await attachExercises(userId, routines);
  } catch (error) {
    wrapRoutineError('read by user', error);
  }
}

export async function getUnsyncedRoutinesByUser(userId: string): Promise<LocalRoutineWithExercises[]> {
  try {
    assertUserId(userId);
    const db = await initializeLocalDatabase();
    const routines = await db.getAllAsync<LocalRoutine>(
      `SELECT ${ROUTINE_COLUMNS}
       FROM ${LOCAL_TABLES.routines}
       WHERE user_id = ?
         AND deleted_at IS NULL
         AND sync_status IN ('pending', 'failed')
       ORDER BY updated_at ASC, created_at ASC`,
      userId
    );

    return await attachExercises(userId, routines);
  } catch (error) {
    wrapRoutineError('read unsynced', error);
  }
}

export async function softDeleteRoutine(userId: string, routineId: string): Promise<void> {
  try {
    assertUserId(userId);
    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.routines}
         SET deleted_at = ?,
             updated_at = ?,
             sync_status = 'pending',
             last_synced_at = NULL
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        now,
        routineId,
        userId
      );

      if (result.changes === 0) {
        throw new Error('Routine was not found for the supplied user.');
      }

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.routineExercises}
         SET deleted_at = ?,
             updated_at = ?,
             sync_status = 'pending',
             last_synced_at = NULL
         WHERE routine_id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        now,
        routineId,
        userId
      );
    });
  } catch (error) {
    wrapRoutineError('soft delete', error);
  }
}

export async function markRoutineSyncFailed(userId: string, routineId: string): Promise<void> {
  try {
    assertUserId(userId);
    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.routines}
         SET sync_status = 'failed',
             updated_at = ?,
             last_synced_at = NULL
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        routineId,
        userId
      );

      if (result.changes === 0) {
        throw new Error('Routine was not found for the supplied user.');
      }

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.routineExercises}
         SET sync_status = 'failed',
             updated_at = ?,
             last_synced_at = NULL
         WHERE routine_id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        routineId,
        userId
      );
    });
  } catch (error) {
    wrapRoutineError('mark sync failed', error);
  }
}

export async function updateRoutineRemoteIds(
  userId: string,
  routineId: string,
  ids: {
    remoteId?: string | null;
    remoteTemplateWorkoutId?: string | null;
  }
): Promise<LocalRoutineWithExercises> {
  try {
    assertUserId(userId);
    const remoteId = normalizeNullableText(ids.remoteId);
    const remoteTemplateWorkoutId = normalizeNullableText(ids.remoteTemplateWorkoutId);

    if (!remoteId && !remoteTemplateWorkoutId) {
      throw new Error('At least one remote ID is required.');
    }

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `UPDATE ${LOCAL_TABLES.routines}
       SET remote_id = COALESCE(?, remote_id),
           remote_template_workout_id = COALESCE(?, remote_template_workout_id),
           updated_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      remoteId,
      remoteTemplateWorkoutId,
      now,
      routineId,
      userId
    );

    if (result.changes === 0) {
      throw new Error('Routine was not found for the supplied user.');
    }

    const updated = await getRoutineWithExercisesByUserAndId(userId, routineId);
    if (!updated) {
      throw new Error('Updated routine could not be read back.');
    }

    return updated;
  } catch (error) {
    wrapRoutineError('update remote ids', error);
  }
}

export async function markRoutineSynced(
  userId: string,
  routineId: string,
  remoteRoutineId: string,
  remoteTemplateWorkoutId: string,
  exerciseMatches: RoutineExerciseRemoteMatch[] = []
): Promise<LocalRoutineWithExercises> {
  try {
    assertUserId(userId);
    if (!remoteRoutineId.trim()) {
      throw new Error('Remote routine ID is required.');
    }
    if (!remoteTemplateWorkoutId.trim()) {
      throw new Error('Remote template workout ID is required.');
    }

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `UPDATE ${LOCAL_TABLES.routines}
         SET remote_id = ?,
             remote_template_workout_id = ?,
             sync_status = 'synced',
             updated_at = ?,
             last_synced_at = ?
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        remoteRoutineId,
        remoteTemplateWorkoutId,
        now,
        now,
        routineId,
        userId
      );

      if (result.changes === 0) {
        throw new Error('Routine was not found for the supplied user.');
      }

      await db.runAsync(
        `UPDATE ${LOCAL_TABLES.routineExercises}
         SET sync_status = 'synced',
             updated_at = ?,
             last_synced_at = ?
         WHERE routine_id = ? AND user_id = ? AND deleted_at IS NULL`,
        now,
        now,
        routineId,
        userId
      );

      for (const match of exerciseMatches) {
        await db.runAsync(
          `UPDATE ${LOCAL_TABLES.routineExercises}
           SET remote_id = ?,
               updated_at = ?,
               last_synced_at = ?
           WHERE id = ? AND routine_id = ? AND user_id = ? AND deleted_at IS NULL`,
          match.remoteExerciseId,
          now,
          now,
          match.localExerciseId,
          routineId,
          userId
        );
      }
    });

    const synced = await getRoutineWithExercisesByUserAndId(userId, routineId);
    if (!synced) {
      throw new Error('Synced routine could not be read back.');
    }

    return synced;
  } catch (error) {
    wrapRoutineError('mark synced', error);
  }
}

export async function upsertRemoteRoutineForUser(
  userId: string,
  input: CreateLocalRoutineInput & {
    remoteId: string;
    remoteTemplateWorkoutId: string;
  }
): Promise<LocalRoutineWithExercises> {
  try {
    assertUserId(userId);
    if (!input.remoteId.trim()) {
      throw new Error('Remote routine ID is required.');
    }
    if (!input.remoteTemplateWorkoutId.trim()) {
      throw new Error('Remote template workout ID is required.');
    }

    const { routineName, exercises } = validateRoutineInput(input);
    const db = await initializeLocalDatabase();
    const existing = await db.getFirstAsync<LocalRoutine>(
      `SELECT ${ROUTINE_COLUMNS}
       FROM ${LOCAL_TABLES.routines}
       WHERE user_id = ? AND remote_id = ?
       LIMIT 1`,
      userId,
      input.remoteId
    );

    if (existing) {
      if (existing.deleted_at || existing.sync_status !== 'synced') {
        const existingWithExercises = await getRoutineWithExercisesByUserAndId(userId, existing.id, {
          includeDeleted: true,
        });
        if (!existingWithExercises) throw new Error('Existing remote routine could not be read back.');
        return existingWithExercises;
      }

      const now = new Date().toISOString();
      const existingExercises = await getExercisesForRoutine(userId, existing.id);
      const usedExistingExerciseIds = new Set<string>();
      const exercisesWithStableIds = exercises.map((exercise) => {
        const matchingExisting = existingExercises.find(
          (existingExercise) =>
            !usedExistingExerciseIds.has(existingExercise.id) &&
            existingExercise.exercise_name.trim().toLowerCase() ===
              exercise.exerciseName.trim().toLowerCase()
        );

        if (matchingExisting) {
          usedExistingExerciseIds.add(matchingExisting.id);
          return { ...exercise, id: matchingExisting.id };
        }

        return exercise;
      });

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE ${LOCAL_TABLES.routines}
           SET remote_template_workout_id = ?,
               routine_name = ?,
               updated_at = ?,
               sync_status = 'synced',
               last_synced_at = ?
           WHERE id = ? AND user_id = ? AND remote_id = ? AND deleted_at IS NULL AND sync_status = 'synced'`,
          input.remoteTemplateWorkoutId,
          routineName,
          now,
          now,
          existing.id,
          userId,
          input.remoteId
        );

        await db.runAsync(
          `DELETE FROM ${LOCAL_TABLES.routineExercises}
           WHERE routine_id = ? AND user_id = ?`,
          existing.id,
          userId
        );

        await insertRoutineExercises(userId, existing.id, exercisesWithStableIds, now, 'synced');
      });

      const updated = await getRoutineWithExercisesByUserAndId(userId, existing.id);
      if (!updated) throw new Error('Updated remote routine could not be read back.');
      return updated;
    }

    const now = new Date().toISOString();
    const routineId = createLocalUuid();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${LOCAL_TABLES.routines} (
          id,
          user_id,
          remote_id,
          remote_template_workout_id,
          routine_name,
          created_at,
          updated_at,
          deleted_at,
          sync_status,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'synced', ?)`,
        routineId,
        userId,
        input.remoteId,
        input.remoteTemplateWorkoutId,
        routineName,
        now,
        now,
        now
      );

      await insertRoutineExercises(userId, routineId, exercises, now, 'synced');
    });

    const inserted = await getRoutineWithExercisesByUserAndId(userId, routineId);
    if (!inserted) throw new Error('Inserted remote routine could not be read back.');
    return inserted;
  } catch (error) {
    wrapRoutineError('upsert remote', error);
  }
}
