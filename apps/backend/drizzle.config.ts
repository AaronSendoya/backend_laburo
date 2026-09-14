import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  throw new Error('DIRECT_URL no está configurada (necesaria para drizzle-kit)');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: directUrl,
  },
});
