import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { runLocalMigrations } from '@/local/migrations';
import { GEMI_USER_DATABASE_NAME } from '@/local/schema';

let databasePromise: Promise<SQLiteDatabase> | null = null;
let initializationPromise: Promise<SQLiteDatabase> | null = null;

async function openUserDatabase() {
  const db = await SQLite.openDatabaseAsync(GEMI_USER_DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON');
  return db;
}

export async function getUserDatabase() {
  if (!databasePromise) {
    databasePromise = openUserDatabase();
  }

  return databasePromise;
}

export async function initializeLocalDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getUserDatabase();
      await db.execAsync('PRAGMA foreign_keys = ON');
      await runLocalMigrations(db);
      return db;
    })();
  }

  return initializationPromise;
}
