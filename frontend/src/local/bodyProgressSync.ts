import { createProgressEntry, updateProgressEntry } from '@/api/progressApi';
import {
  getPendingBodyProgressByUser,
  markBodyProgressSynced,
  markBodyProgressSyncFailed,
} from '@/local/repositories/bodyProgressRepository';
import type { LocalBodyProgress } from '@/local/schema';

const LOG_PREFIX = '[GEMI_BODY_PROGRESS_SYNC]';
const inFlightBodyProgressIds = new Set<string>();
const retryingBodyProgressUsers = new Set<string>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function assertSameUser(userId: string, localRow: LocalBodyProgress) {
  if (localRow.user_id !== userId) {
    throw new Error('Skipping body-progress sync for a different authenticated user.');
  }
}

function shortId(id: string | null | undefined) {
  return id ? id.slice(0, 8) : null;
}

function logSync(
  action: string,
  localRow: LocalBodyProgress,
  result: 'success' | 'failure' | 'skipped',
  remoteId = localRow.remote_id
) {
  console.log(LOG_PREFIX, {
    action,
    localId: shortId(localRow.id),
    remoteId: shortId(remoteId),
    date: localRow.recorded_date,
    status: localRow.sync_status,
    result,
    source: 'local',
  });
}

export async function syncBodyProgressToRemote(
  userId: string,
  localRow: LocalBodyProgress
): Promise<LocalBodyProgress | null> {
  assertSameUser(userId, localRow);

  if (localRow.deleted_at) {
    return localRow;
  }

  if (inFlightBodyProgressIds.has(localRow.id)) {
    logSync('sync_skip_in_flight', localRow, 'skipped');
    return null;
  }

  inFlightBodyProgressIds.add(localRow.id);
  try {
    const payload = {
      weight_kg: localRow.weight_kg,
      recorded_at: localRow.recorded_at,
      recorded_date: localRow.recorded_date,
    };
    const remoteRow = localRow.remote_id
      ? await updateProgressEntry(localRow.remote_id, payload)
      : await createProgressEntry(payload);

    const synced = await markBodyProgressSynced(userId, localRow.id, remoteRow.id);
    logSync(localRow.remote_id ? 'sync_update_remote' : 'sync_create_remote', synced, 'success', remoteRow.id);
    return synced;
  } catch (error) {
    console.warn(LOG_PREFIX, {
      action: localRow.remote_id ? 'sync_update_remote' : 'sync_create_remote',
      localId: shortId(localRow.id),
      remoteId: shortId(localRow.remote_id),
      date: localRow.recorded_date,
      status: localRow.sync_status,
      result: 'failure',
      source: 'local',
      error: getErrorMessage(error),
    });
    try {
      await markBodyProgressSyncFailed(userId, localRow.id);
    } catch (markError) {
      console.error(
        `${LOG_PREFIX} mark_failed_status_error`,
        getErrorMessage(markError)
      );
    }
    return null;
  } finally {
    inFlightBodyProgressIds.delete(localRow.id);
  }
}

export const syncBodyProgressCreateToRemote = syncBodyProgressToRemote;

export async function retryPendingBodyProgressCreates(userId: string): Promise<number> {
  if (retryingBodyProgressUsers.has(userId)) {
    console.log(LOG_PREFIX, {
      action: 'retry_skip_in_flight',
      status: 'pending',
      result: 'skipped',
      source: 'local',
    });
    return 0;
  }

  retryingBodyProgressUsers.add(userId);
  try {
    const unsyncedRows = await getPendingBodyProgressByUser(userId);
    let syncedCount = 0;

    for (const localRow of unsyncedRows) {
      const synced = await syncBodyProgressToRemote(userId, localRow);
      if (synced?.remote_id) {
        syncedCount += 1;
      }
    }

    return syncedCount;
  } finally {
    retryingBodyProgressUsers.delete(userId);
  }
}
