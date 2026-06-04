import type { SQLiteDatabase } from 'expo-sqlite';

export const FOOD_SCHEMA_VERSION = 1;

export const FOOD_TABLES = {
  schemaMigrations: 'food_schema_migrations',
  items: 'food_items',
  aliases: 'food_aliases',
} as const;

type FoodMigration = {
  version: number;
  apply: (db: SQLiteDatabase) => Promise<void>;
};

const FOOD_MIGRATIONS: FoodMigration[] = [
  {
    version: 1,
    apply: async (db) => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS ${FOOD_TABLES.items} (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          calories_per_100g REAL NOT NULL,
          protein_per_100g REAL NOT NULL,
          carbs_per_100g REAL NOT NULL,
          fat_per_100g REAL NOT NULL,
          fiber_per_100g REAL,
          sodium_mg_per_100g REAL,
          potassium_mg_per_100g REAL,
          calcium_mg_per_100g REAL,
          iron_mg_per_100g REAL,
          vitamin_c_mg_per_100g REAL,
          folate_mcg_per_100g REAL,
          default_serving_unit TEXT,
          default_serving_size REAL,
          source TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS ${FOOD_TABLES.aliases} (
          alias TEXT PRIMARY KEY NOT NULL,
          food_id TEXT NOT NULL,
          FOREIGN KEY (food_id) REFERENCES ${FOOD_TABLES.items}(id) ON DELETE CASCADE
        )`
      );

      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_food_items_name ON ${FOOD_TABLES.items}(name)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_food_items_category ON ${FOOD_TABLES.items}(category)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_food_aliases_alias ON ${FOOD_TABLES.aliases}(alias)`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_food_aliases_food_id ON ${FOOD_TABLES.aliases}(food_id)`
      );
    },
  },
];

type FoodSchemaMigrationRow = {
  version: number;
};

async function ensureFoodSchemaMigrationsTable(db: SQLiteDatabase) {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS ${FOOD_TABLES.schemaMigrations} (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    )`
  );
}

export async function runFoodMigrations(db: SQLiteDatabase) {
  await ensureFoodSchemaMigrationsTable(db);

  const appliedRows = await db.getAllAsync<FoodSchemaMigrationRow>(
    `SELECT version FROM ${FOOD_TABLES.schemaMigrations}`
  );
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  for (const migration of FOOD_MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    await db.withTransactionAsync(async () => {
      await migration.apply(db);
      await db.runAsync(
        `INSERT OR IGNORE INTO ${FOOD_TABLES.schemaMigrations} (version, applied_at)
         VALUES (?, ?)`,
        migration.version,
        new Date().toISOString()
      );
    });
  }
}

export function getFoodSchemaVersion() {
  return FOOD_SCHEMA_VERSION;
}
