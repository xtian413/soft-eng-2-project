import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { runLocalMigrations } from '@/local/migrations';
import { GEMI_USER_DATABASE_NAME } from '@/local/schema';

declare global {
  // eslint-disable-next-line no-var
  var __gemiUserDbPromise: Promise<SQLiteDatabase> | undefined;
  // eslint-disable-next-line no-var
  var __gemiUserDbInitPromise: Promise<SQLiteDatabase> | undefined;
}

async function openUserDatabase() {
  const db = await SQLite.openDatabaseAsync(GEMI_USER_DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON');
  return db;
}

export async function getUserDatabase() {
  if (!globalThis.__gemiUserDbPromise) {
    globalThis.__gemiUserDbPromise = openUserDatabase();
  }

  return globalThis.__gemiUserDbPromise;
}

export async function initializeLocalDatabase() {
  if (!globalThis.__gemiUserDbInitPromise) {
    globalThis.__gemiUserDbInitPromise = (async () => {
      const db = await getUserDatabase();
      await db.execAsync('PRAGMA foreign_keys = ON');
      await runLocalMigrations(db);
      return db;
    })();
  }

  return globalThis.__gemiUserDbInitPromise;
}
