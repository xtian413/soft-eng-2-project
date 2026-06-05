import { supabase } from '@/lib/supabase';
import {
  getUnsyncedProfileByUser,
  markProfileSynced,
  markProfileSyncFailed,
} from '@/local/repositories/profilesRepository';

const inFlightProfileSyncUserIds = new Set<string>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function syncProfileToRemote(userId: string): Promise<boolean> {
  if (inFlightProfileSyncUserIds.has(userId)) {
    console.log('[Profile] Profile sync skipped: already in-flight');
    return false;
  }

  inFlightProfileSyncUserIds.add(userId);
  try {
    console.log('[Profile] Profile sync begin');
    const localProfile = await getUnsyncedProfileByUser(userId);
    if (!localProfile) {
      return false;
    }

    console.log('[Profile] Unsynced local profile found');
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: localProfile.full_name,
        height_cm: localProfile.height_cm,
        goal: localProfile.goal,
        gender: localProfile.gender,
      })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message);
    }

    await markProfileSynced(userId);
    console.log('[Profile] Profile sync complete');
    return true;
  } catch (error) {
    console.warn(`[Profile] Profile sync failed: ${getErrorMessage(error)}`);
    try {
      await markProfileSyncFailed(userId);
    } catch (markError) {
      console.warn(`[Profile] Profile sync failed status update failed: ${getErrorMessage(markError)}`);
    }
    return false;
  } finally {
    inFlightProfileSyncUserIds.delete(userId);
  }
}

export async function retryPendingProfileSync(userId: string): Promise<boolean> {
  return await syncProfileToRemote(userId);
}
