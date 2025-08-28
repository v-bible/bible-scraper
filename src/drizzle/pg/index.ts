import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/../drizzle/pg/schema';

// Create PostgreSQL database connection using node-postgres
export function createDrizzleClient(connectionString: string) {
  const pool = new Pool({
    connectionString,
  });

  return drizzle(pool, { schema });
}

// Alternative connection using connection config
export function createDrizzleClientWithConfig(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) {
  const pool = new Pool(config);

  return drizzle(pool, { schema });
}

// Type export for the database client
export type DrizzleClient = ReturnType<typeof createDrizzleClient>;

// Export all schema components
export * from '../../../drizzle/pg/schema';
