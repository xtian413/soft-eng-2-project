import { initializeLocalDatabase } from '@/local/db';
import {
  LOCAL_TABLES,
  type LocalAiInsight,
} from '@/local/schema';

export interface SaveAiInsightLocalInput {
  user_id: string;
  title: string;
  summary: string;
  nutrition: string;
  training: string;
  next_step: string;
  confidence: string;
  payload_json?: string | null;
  data_snapshot_hash?: string | null;
  generated_at?: string;
}

const AI_INSIGHT_COLUMNS = [
  'id',
  'user_id',
  'title',
  'summary',
  'nutrition',
  'training',
  'next_step',
  'confidence',
  'payload_json',
  'data_snapshot_hash',
  'generated_at',
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
    throw new Error('Local AI insight operation requires a Supabase user ID.');
  }
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Local AI insight text fields must be non-empty.');
  }
  return trimmed;
}

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function wrapAiInsightError(action: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Local AI insight ${action} failed: ${message}`);
}

export async function saveAiInsightLocal(input: SaveAiInsightLocalInput): Promise<LocalAiInsight> {
  try {
    assertUserId(input.user_id);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    const generatedAt = input.generated_at ?? now;
    const id = createLocalUuid();

    await db.runAsync(
      `INSERT INTO ${LOCAL_TABLES.aiInsights} (
        id,
        user_id,
        title,
        summary,
        nutrition,
        training,
        next_step,
        confidence,
        payload_json,
        data_snapshot_hash,
        generated_at,
        created_at,
        updated_at,
        deleted_at,
        sync_status,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced', ?)`,
      id,
      input.user_id,
      normalizeText(input.title),
      normalizeText(input.summary),
      normalizeText(input.nutrition),
      normalizeText(input.training),
      normalizeText(input.next_step),
      normalizeText(input.confidence),
      normalizeNullableText(input.payload_json),
      normalizeNullableText(input.data_snapshot_hash),
      generatedAt,
      now,
      now,
      now
    );

    const created = await getAiInsightByUserAndId(input.user_id, id);
    if (!created) {
      throw new Error('Inserted AI insight row could not be read back.');
    }

    return created;
  } catch (error) {
    wrapAiInsightError('save', error);
  }
}

export async function getAiInsightByUserAndId(
  userId: string,
  id: string
): Promise<LocalAiInsight | null> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getFirstAsync<LocalAiInsight>(
      `SELECT ${AI_INSIGHT_COLUMNS}
       FROM ${LOCAL_TABLES.aiInsights}
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      id,
      userId
    );
  } catch (error) {
    wrapAiInsightError('read by id', error);
  }
}

export async function getLatestAiInsightByUser(userId: string): Promise<LocalAiInsight | null> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getFirstAsync<LocalAiInsight>(
      `SELECT ${AI_INSIGHT_COLUMNS}
       FROM ${LOCAL_TABLES.aiInsights}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY generated_at DESC, created_at DESC
       LIMIT 1`,
      userId
    );
  } catch (error) {
    wrapAiInsightError('read latest', error);
  }
}

export async function getRecentAiInsightsByUser(
  userId: string,
  limit = 10
): Promise<LocalAiInsight[]> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    return await db.getAllAsync<LocalAiInsight>(
      `SELECT ${AI_INSIGHT_COLUMNS}
       FROM ${LOCAL_TABLES.aiInsights}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY generated_at DESC, created_at DESC
       LIMIT ?`,
      userId,
      Math.max(1, Math.floor(limit))
    );
  } catch (error) {
    wrapAiInsightError('read recent', error);
  }
}

export async function deleteOldAiInsightsByUser(userId: string, keepLimit = 10): Promise<void> {
  try {
    assertUserId(userId);

    const db = await initializeLocalDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE ${LOCAL_TABLES.aiInsights}
       SET deleted_at = ?,
           updated_at = ?
       WHERE user_id = ?
         AND deleted_at IS NULL
         AND id NOT IN (
           SELECT id
           FROM ${LOCAL_TABLES.aiInsights}
           WHERE user_id = ? AND deleted_at IS NULL
           ORDER BY generated_at DESC, created_at DESC
           LIMIT ?
         )`,
      now,
      now,
      userId,
      userId,
      Math.max(1, Math.floor(keepLimit))
    );
  } catch (error) {
    wrapAiInsightError('delete old', error);
  }
}
