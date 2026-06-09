import { retryPendingBodyProgressCreates } from '@/local/bodyProgressSync';
import { retryPendingProfileSync } from '@/local/profileSync';
import {
  createBodyProgressLocal,
  getBodyProgressByUserAndDate,
  normalizeRecordedDate,
  updateBodyProgressLocal,
} from '@/local/repositories/bodyProgressRepository';
import { upsertLocalProfile } from '@/local/repositories/profilesRepository';
import type { LocalBodyProgress } from '@/local/schema';

const LOG_PREFIX = '[GEMI_BODY_PROGRESS_SYNC]';

function shortId(id: string | null | undefined) {
  return id ? id.slice(0, 8) : null;
}

function logWeightRecord(action: string, row: LocalBodyProgress, source: 'local' | 'cloud' = 'local') {
  console.log(LOG_PREFIX, {
    action,
    localId: shortId(row.id),
    remoteId: shortId(row.remote_id),
    date: row.recorded_date,
    status: row.sync_status,
    source,
  });
}

export interface RecordWeightLocalFirstInput {
  userId: string;
  weightKg: number;
  recordedAt?: string;
  updateProfileCache?: boolean;
  triggerSync?: boolean;
}

export async function recordWeightLocalFirst({
  userId,
  weightKg,
  recordedAt = new Date().toISOString(),
  updateProfileCache = true,
  triggerSync = true,
}: RecordWeightLocalFirstInput): Promise<LocalBodyProgress> {
  const recordedDate = normalizeRecordedDate(recordedAt);
  const existing = await getBodyProgressByUserAndDate(userId, recordedDate);

  const row = existing
    ? await updateBodyProgressLocal(userId, existing.id, {
        weight_kg: weightKg,
        recorded_at: recordedAt,
        recorded_date: recordedDate,
      })
    : await createBodyProgressLocal({
        user_id: userId,
        weight_kg: weightKg,
        recorded_at: recordedAt,
        recorded_date: recordedDate,
      });

  // profiles.weight_kg is only the latest-value cache; body_progress owns dated history.
  if (updateProfileCache) {
    await upsertLocalProfile({
      user_id: userId,
      weight_kg: weightKg,
    });
  }

  logWeightRecord(existing ? 'record_update_local' : 'record_create_local', row);

  if (triggerSync) {
    void retryPendingBodyProgressCreates(userId);
    if (updateProfileCache) {
      void retryPendingProfileSync(userId);
    }
  }

  return row;
}
