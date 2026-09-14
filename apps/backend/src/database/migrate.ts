import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

/**
 * Corre las migraciones contra DIRECT_URL (conexión sin pooler). Prisma-style
 * migrate deploy, pero con drizzle-kit: nunca se ejecuta contra el endpoint
 * pooled de Neon porque PgBouncer en modo transacción puede interferir con DDL.
 */
async function main() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    throw new Error('DIRECT_URL no está configurada');
  }

  const client = postgres(directUrl, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: './drizzle' });
  await client.end();
}

main()
  .then(() => {
    console.log('Migraciones aplicadas correctamente');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('Fallo al migrar:', error);
    process.exit(1);
  });
