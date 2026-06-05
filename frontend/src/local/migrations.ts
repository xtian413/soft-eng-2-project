import type { SQLiteDatabase } from 'expo-sqlite';
import { LOCAL_SCHEMA_VERSION, LOCAL_TABLES } from '@/local/schema';

type Migration = {
  version: number;
  name: string;
  statements?: string[];
  apply?: (db: SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_phase_1_local_user_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.profiles} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        full_name TEXT,
        height_cm REAL,
        weight_kg REAL,
        gender TEXT,
        goal TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        last_synced_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.workouts} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        notes TEXT,
        performed_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        last_synced_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.workoutSets} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workout_id TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        muscle_group TEXT,
        set_number INTEGER NOT NULL,
        reps INTEGER,
        weight_kg REAL,
        duration_seconds INTEGER,
        rir INTEGER,
        est_1rm REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        last_synced_at TEXT,
        FOREIGN KEY (workout_id) REFERENCES ${LOCAL_TABLES.workouts}(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.routines} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        routine_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        last_synced_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.routineExercises} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        routine_id TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        muscle_group TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        sets INTEGER,
        reps INTEGER,
        weight_kg REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        last_synced_at TEXT,
        FOREIGN KEY (routine_id) REFERENCES ${LOCAL_TABLES.routines}(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.dietLogs} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        meal_id TEXT NOT NULL DEFAULT 'snack',
        meal_name TEXT NOT NULL,
        calories REAL,
        protein_g REAL,
        carbs_g REAL,
        fat_g REAL,
        fiber_g REAL,
        sodium_mg REAL,
        potassium_mg REAL,
        calcium_mg REAL,
        iron_mg REAL,
        vitamin_c_mg REAL,
        folate_mcg REAL,
        serving_size REAL,
        serving_unit TEXT,
        source_food_id TEXT,
        logged_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        last_synced_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.bodyProgress} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        body_fat_pct REAL,
        recorded_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        last_synced_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.aiInsights} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        summary TEXT,
        nutrition TEXT,
        training TEXT,
        next_step TEXT,
        confidence TEXT,
        payload_json TEXT,
        generated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        last_synced_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.syncQueue} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
        payload_json TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_attempted_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON ${LOCAL_TABLES.profiles}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_profiles_sync_status ON ${LOCAL_TABLES.profiles}(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON ${LOCAL_TABLES.profiles}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON ${LOCAL_TABLES.profiles}(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON ${LOCAL_TABLES.workouts}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_performed_at ON ${LOCAL_TABLES.workouts}(performed_at)`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_sync_status ON ${LOCAL_TABLES.workouts}(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_updated_at ON ${LOCAL_TABLES.workouts}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_deleted_at ON ${LOCAL_TABLES.workouts}(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sets_user_id ON ${LOCAL_TABLES.workoutSets}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON ${LOCAL_TABLES.workoutSets}(workout_id)`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sets_sync_status ON ${LOCAL_TABLES.workoutSets}(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sets_updated_at ON ${LOCAL_TABLES.workoutSets}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sets_deleted_at ON ${LOCAL_TABLES.workoutSets}(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_routines_user_id ON ${LOCAL_TABLES.routines}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_routines_sync_status ON ${LOCAL_TABLES.routines}(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_routines_updated_at ON ${LOCAL_TABLES.routines}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_routines_deleted_at ON ${LOCAL_TABLES.routines}(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_routine_exercises_user_id ON ${LOCAL_TABLES.routineExercises}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON ${LOCAL_TABLES.routineExercises}(routine_id)`,
      `CREATE INDEX IF NOT EXISTS idx_routine_exercises_sync_status ON ${LOCAL_TABLES.routineExercises}(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_routine_exercises_updated_at ON ${LOCAL_TABLES.routineExercises}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_routine_exercises_deleted_at ON ${LOCAL_TABLES.routineExercises}(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_diet_logs_user_id ON ${LOCAL_TABLES.dietLogs}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_diet_logs_logged_at ON ${LOCAL_TABLES.dietLogs}(logged_at)`,
      `CREATE INDEX IF NOT EXISTS idx_diet_logs_user_logged_at ON ${LOCAL_TABLES.dietLogs}(user_id, logged_at)`,
      `CREATE INDEX IF NOT EXISTS idx_diet_logs_sync_status ON ${LOCAL_TABLES.dietLogs}(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_diet_logs_updated_at ON ${LOCAL_TABLES.dietLogs}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_diet_logs_deleted_at ON ${LOCAL_TABLES.dietLogs}(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_body_progress_user_id ON ${LOCAL_TABLES.bodyProgress}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_body_progress_recorded_at ON ${LOCAL_TABLES.bodyProgress}(recorded_at)`,
      `CREATE INDEX IF NOT EXISTS idx_body_progress_sync_status ON ${LOCAL_TABLES.bodyProgress}(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_body_progress_updated_at ON ${LOCAL_TABLES.bodyProgress}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_body_progress_deleted_at ON ${LOCAL_TABLES.bodyProgress}(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ${LOCAL_TABLES.aiInsights}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_insights_generated_at ON ${LOCAL_TABLES.aiInsights}(generated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_insights_sync_status ON ${LOCAL_TABLES.aiInsights}(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_insights_updated_at ON ${LOCAL_TABLES.aiInsights}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_insights_deleted_at ON ${LOCAL_TABLES.aiInsights}(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON ${LOCAL_TABLES.syncQueue}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON ${LOCAL_TABLES.syncQueue}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_updated_at ON ${LOCAL_TABLES.syncQueue}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_record ON ${LOCAL_TABLES.syncQueue}(table_name, record_id)`,
    ],
  },
  {
    version: 2,
    name: 'add_remote_id_to_diet_logs',
    apply: async (db) => {
      const columns = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${LOCAL_TABLES.dietLogs})`
      );
      const hasRemoteId = columns.some((column) => column.name === 'remote_id');

      if (!hasRemoteId) {
        await db.execAsync(`ALTER TABLE ${LOCAL_TABLES.dietLogs} ADD COLUMN remote_id TEXT`);
      }

      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_diet_logs_remote_id ON ${LOCAL_TABLES.dietLogs}(remote_id)`
      );
    },
  },
  {
    version: 3,
    name: 'add_remote_ids_to_workouts',
    apply: async (db) => {
      const ensureColumn = async (tableName: string, columnName: string, definition: string) => {
        const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
        const hasColumn = columns.some((column) => column.name === columnName);
        if (!hasColumn) {
          await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
        }
      };

      await ensureColumn(LOCAL_TABLES.workouts, 'remote_id', 'TEXT');
      await ensureColumn(LOCAL_TABLES.workoutSets, 'remote_id', 'TEXT');

      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_workouts_remote_id ON ${LOCAL_TABLES.workouts}(remote_id)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_workout_sets_remote_id ON ${LOCAL_TABLES.workoutSets}(remote_id)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_workout_sets_user_workout_id ON ${LOCAL_TABLES.workoutSets}(user_id, workout_id)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_workouts_user_performed_at ON ${LOCAL_TABLES.workouts}(user_id, performed_at)`
      );
    },
  },
  {
    version: 4,
    name: 'add_remote_ids_to_routines',
    apply: async (db) => {
      const ensureColumn = async (tableName: string, columnName: string, definition: string) => {
        const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
        const hasColumn = columns.some((column) => column.name === columnName);
        if (!hasColumn) {
          await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
        }
      };

      await ensureColumn(LOCAL_TABLES.routines, 'remote_id', 'TEXT');
      await ensureColumn(LOCAL_TABLES.routines, 'remote_template_workout_id', 'TEXT');
      await ensureColumn(LOCAL_TABLES.routineExercises, 'remote_id', 'TEXT');

      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_routines_remote_id ON ${LOCAL_TABLES.routines}(remote_id)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_routines_remote_template_workout_id ON ${LOCAL_TABLES.routines}(remote_template_workout_id)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_routine_exercises_remote_id ON ${LOCAL_TABLES.routineExercises}(remote_id)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_routine_exercises_user_routine_id ON ${LOCAL_TABLES.routineExercises}(user_id, routine_id)`
      );
    },
  },
  {
    version: 5,
    name: 'add_meal_id_to_diet_logs',
    apply: async (db) => {
      const columns = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${LOCAL_TABLES.dietLogs})`
      );
      const hasMealId = columns.some((column) => column.name === 'meal_id');

      if (!hasMealId) {
        await db.execAsync(
          `ALTER TABLE ${LOCAL_TABLES.dietLogs} ADD COLUMN meal_id TEXT NOT NULL DEFAULT 'snack'`
        );
      }
    },
  },
  {
    version: 6,
    name: 'add_remote_id_to_body_progress',
    apply: async (db) => {
      const columns = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${LOCAL_TABLES.bodyProgress})`
      );
      const hasRemoteId = columns.some((column) => column.name === 'remote_id');

      if (!hasRemoteId) {
        await db.execAsync(`ALTER TABLE ${LOCAL_TABLES.bodyProgress} ADD COLUMN remote_id TEXT`);
      }

      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_body_progress_remote_id ON ${LOCAL_TABLES.bodyProgress}(remote_id)`
      );
    },
  },
];

type SchemaMigrationRow = {
  version: number;
};

export async function ensureSchemaMigrationsTable(db: SQLiteDatabase) {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS ${LOCAL_TABLES.schemaMigrations} (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`
  );
}

export async function runLocalMigrations(db: SQLiteDatabase) {
  await ensureSchemaMigrationsTable(db);

  const appliedRows = await db.getAllAsync<SchemaMigrationRow>(
    `SELECT version FROM ${LOCAL_TABLES.schemaMigrations}`
  );
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements ?? []) {
        await db.execAsync(statement);
      }

      if (migration.apply) {
        await migration.apply(db);
      }

      await db.runAsync(
        `INSERT OR IGNORE INTO ${LOCAL_TABLES.schemaMigrations}
          (version, name, applied_at)
         VALUES (?, ?, ?)`,
        migration.version,
        migration.name,
        new Date().toISOString()
      );
    });
  }
}

export function getLocalSchemaVersion() {
  return LOCAL_SCHEMA_VERSION;
}
