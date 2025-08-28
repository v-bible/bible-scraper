import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './drizzle/sqlite/schema.ts',
  out: './drizzle/sqlite/migrations',
  dbCredentials: {
    url: process.env.DB_URL!,
  },
});
