import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/../drizzle/sqlite/schema';

// Create SQLite database connection
export function createDrizzleClient(databasePath: string) {
  const sqlite = new Database(databasePath);

  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');

  return drizzle(sqlite, { schema });
}

// Type export for the database client
export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
