import {
  fetchDailyLogs,
  upsertDailyLog as upsertRemoteDailyLog,
  type DailyLog,
  type DailyLogUpsertInput,
} from '@/api/dailyApi';
import {
  getUnsyncedDailyLogsByUser,
  markDailyLogSyncFailed,
  markDailyLogSynced,
  upsertRemoteDailyLogForUser,
} from '@/local/repositories/dailyLogsRepository';
import type { LocalDailyLog } from '@/local/schema';

const inFlightUserIds = new Set<string>();

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const responseError = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
    if (responseError) return responseError;

    const message = (error as { message?: string }).message;
    if (message) return message;
  }

  return 'Unknown error';
}

function localDailyLogToRemoteInput(log: LocalDailyLog): DailyLogUpsertInput {
  return {
    date: log.date,
    bedtime: log.bedtime,
    waketime: log.waketime,
    sleep_hours: log.sleep_hours,
    water_ml: log.water_ml,
    water_goal_ml: log.water_goal_ml ?? 2000,
    updated_at: log.updated_at,
    deleted_at: log.deleted_at,
  };
}

function remoteDailyLogToLocalInput(log: DailyLog) {
  return {
    id: log.id,
    date: log.date,
    bedtime: log.bedtime,
    waketime: log.waketime,
    sleep_hours: log.sleep_hours,
    water_ml: log.water_ml,
    water_goal_ml: log.water_goal_ml ?? 2000,
    created_at: log.created_at,
    updated_at: log.updated_at,
    deleted_at: log.deleted_at,
  };
}

export async function pushPendingDailyLogs(userId: string) {
  const pendingLogs = await getUnsyncedDailyLogsByUser(userId);
  let syncedCount = 0;

  for (const localLog of pendingLogs) {
    try {
      const remoteLog = await upsertRemoteDailyLog(localDailyLogToRemoteInput(localLog));
      await markDailyLogSynced(userId, localLog.id, remoteLog.id, remoteLog.updated_at);
      syncedCount += 1;
    } catch (error) {
      console.log(`[DailyLogsSync] Daily-log push failed for ${localLog.date}: ${getErrorMessage(error)}`);
      await markDailyLogSyncFailed(userId, localLog.id).catch((markError) => {
        console.log(`[DailyLogsSync] Could not mark daily log failed: ${getErrorMessage(markError)}`);
      });
    }
  }

  return syncedCount;
}

export async function pullRemoteDailyLogs(userId: string) {
  const remoteLogs = await fetchDailyLogs();
  await Promise.all(
    remoteLogs.map((log) => upsertRemoteDailyLogForUser(userId, remoteDailyLogToLocalInput(log)))
  );
  return remoteLogs.length;
}

export async function syncDailyLogsForUser(userId: string) {
  if (!userId.trim()) return { pushed: 0, pulled: 0, skipped: true };
  if (inFlightUserIds.has(userId)) return { pushed: 0, pulled: 0, skipped: true };

  inFlightUserIds.add(userId);
  try {
    const pushed = await pushPendingDailyLogs(userId);
    const pulled = await pullRemoteDailyLogs(userId);
    return { pushed, pulled, skipped: false };
  } catch (error) {
    console.log(`[DailyLogsSync] Daily-log sync failed: ${getErrorMessage(error)}`);
    return { pushed: 0, pulled: 0, skipped: false };
  } finally {
    inFlightUserIds.delete(userId);
  }
}
