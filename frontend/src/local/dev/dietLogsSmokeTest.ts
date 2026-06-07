import { initializeLocalDatabase } from '@/local/db';
import {
  createDietLog,
  getDietLogsByUser,
  softDeleteDietLog,
} from '@/local/repositories/dietLogsRepository';
import { LOCAL_TABLES } from '@/local/schema';

export type DietLogsSmokeTestResult = {
  insertedId: string;
  userAVisibleCount: number;
  userBVisibleCount: number;
  userAVisibleAfterSoftDeleteCount: number;
  cleanedUp: boolean;
};

const SMOKE_TEST_USER_A = 'smoke-test-user-a';
const SMOKE_TEST_USER_B = 'smoke-test-user-b';
const SMOKE_TEST_MEAL_NAME = '__gemi_smoke_test_diet_log__';

function assertSmokeTestStep(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Gemi local DB smoke test] ${message}`);
  }
}

/**
 * Development-only hard cleanup for the smoke-test row. Do not use this in production code.
 */
export async function permanentlyCleanupDietLogsSmokeTestRecord(userId: string, id: string) {
  const db = await initializeLocalDatabase();
  await db.runAsync(
    `DELETE FROM ${LOCAL_TABLES.dietLogs}
     WHERE id = ? AND user_id = ? AND meal_name = ?`,
    id,
    userId,
    SMOKE_TEST_MEAL_NAME
  );
}

/**
 * Development-only smoke test for the dormant local diet-log repository.
 *
 * This helper is intentionally not imported by production screens. To run it later,
 * temporarily call it from an Expo runtime context, such as a guarded useEffect in App.tsx,
 * then remove the temporary call after reading the console output.
 */
export async function runDietLogsSmokeTest(): Promise<DietLogsSmokeTestResult> {
  let insertedId: string | null = null;

  try {
    await initializeLocalDatabase();

    const created = await createDietLog({
      user_id: SMOKE_TEST_USER_A,
      meal_name: SMOKE_TEST_MEAL_NAME,
      calories: 123,
      protein_g: 12,
      carbs_g: 18,
      fat_g: 4,
      logged_at: new Date().toISOString(),
    });
    insertedId = created.id;

    const userAVisible = await getDietLogsByUser(SMOKE_TEST_USER_A);
    const userBVisible = await getDietLogsByUser(SMOKE_TEST_USER_B);

    assertSmokeTestStep(
      userAVisible.some((log) => log.id === created.id),
      'Test user A could not read the inserted diet log.'
    );
    assertSmokeTestStep(
      !userBVisible.some((log) => log.id === created.id),
      'Test user B could read test user A diet log.'
    );

    await softDeleteDietLog(SMOKE_TEST_USER_A, created.id);

    const userAAfterSoftDelete = await getDietLogsByUser(SMOKE_TEST_USER_A);
    assertSmokeTestStep(
      !userAAfterSoftDelete.some((log) => log.id === created.id),
      'Soft-deleted diet log was returned by the normal read query.'
    );

    await permanentlyCleanupDietLogsSmokeTestRecord(SMOKE_TEST_USER_A, created.id);

    return {
      insertedId: created.id,
      userAVisibleCount: userAVisible.length,
      userBVisibleCount: userBVisible.length,
      userAVisibleAfterSoftDeleteCount: userAAfterSoftDelete.length,
      cleanedUp: true,
    };
  } catch (error) {
    if (insertedId) {
      await permanentlyCleanupDietLogsSmokeTestRecord(SMOKE_TEST_USER_A, insertedId).catch(() => undefined);
    }
    throw error;
  }
}
