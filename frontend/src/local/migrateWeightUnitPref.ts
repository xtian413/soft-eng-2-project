import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_KEY = 'gemi_profile_volume_unit';
const NEW_KEY = 'gemi_weight_unit';

/**
 * One-time migration from the old AsyncStorage key used by StatsRow
 * to the unified key used by the new weightUnitStore.
 *
 * Reads the legacy value, writes it to the new key, then deletes the old key.
 * Safe to call repeatedly (no-op after first run).
 */
export async function migrateWeightUnitPref(): Promise<void> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      // Zustand's persist middleware expects a serialized object of the form:
      // {"state":{"isLbs":boolean},"version":0}
      const isLbsValue = legacy === 'lbs';
      const zustandState = JSON.stringify({
        state: { isLbs: isLbsValue },
        version: 0,
      });
      await AsyncStorage.setItem(NEW_KEY, zustandState);
      await AsyncStorage.removeItem(LEGACY_KEY);
      console.log('[migrateWeightUnitPref] Migrated legacy weight unit pref:', legacy, 'to Zustand state:', zustandState);
    }
  } catch (err) {
    console.warn('[migrateWeightUnitPref] Migration failed:', err);
  }
}
