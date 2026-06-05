import { createProgressEntry } from '@/api/progressApi';
import {
  getUnsyncedNewBodyProgressByUser,
  markBodyProgressSynced,
  markBodyProgressSyncFailed,
} from '@/local/repositories/bodyProgressRepository';
import type { LocalBodyProgress } from '@/local/schema';

const inFlightBodyProgressCreateIds = new Set<string>();
const retryingBodyProgressUsers = new Set<string>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function assertSameUser(userId: string, localRow: LocalBodyProgress) {
  if (localRow.user_id !== userId) {
    throw new Error('Skipping body-progress sync for a different authenticated user.');
  }
}

export async function syncBodyProgressCreateToRemote(
  userId: string,
  localRow: LocalBodyProgress
): Promise<LocalBodyProgress | null> {
  assertSameUser(userId, localRow);

  if (localRow.remote_id || localRow.deleted_at) {
    return localRow;
  }

  if (inFlightBodyProgressCreateIds.has(localRow.id)) {
    console.log('[BodyProgressSync] Create sync skipped: already in-flight', {
      localId: localRow.id,
    });
    return null;
  }

  inFlightBodyProgressCreateIds.add(localRow.id);
  try {
    const remoteRow = await createProgressEntry({
      weight_kg: localRow.weight_kg,
      recorded_at: localRow.recorded_at,
    });

    return await markBodyProgressSynced(userId, localRow.id, remoteRow.id);
  } catch (error) {
    console.warn('[BodyProgressSync] Failed to create remote body-progress row:', getErrorMessage(error));
    try {
      await markBodyProgressSyncFailed(userId, localRow.id);
    } catch (markError) {
      console.error(
        '[BodyProgressSync] Failed to mark body-progress sync failed:',
        getErrorMessage(markError)
      );
    }
    return null;
  } finally {
    inFlightBodyProgressCreateIds.delete(localRow.id);
  }
}

export async function retryPendingBodyProgressCreates(userId: string): Promise<number> {
  if (retryingBodyProgressUsers.has(userId)) {
    console.log('[BodyProgressSync] Create retry skipped: already running');
    return 0;
  }

  retryingBodyProgressUsers.add(userId);
  try {
    const unsyncedRows = await getUnsyncedNewBodyProgressByUser(userId);
    let syncedCount = 0;

    for (const localRow of unsyncedRows) {
      const synced = await syncBodyProgressCreateToRemote(userId, localRow);
      if (synced?.remote_id) {
        syncedCount += 1;
      }
    }

    return syncedCount;
  } finally {
    retryingBodyProgressUsers.delete(userId);
  }
}
