import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { Env } from '../config/env';
import { DRIZZLE } from './database.constants';
import * as schema from './schema';

/**
 * Único punto del backend que abre una conexión a Postgres. Usa DATABASE_URL
 * (el endpoint *pooled* de Neon, PgBouncer) para el tráfico normal de la app —
 * las migraciones corren aparte, contra DIRECT_URL (ver src/database/migrate.ts).
 *
 * `max: 3` (no 10): en Vercel serverless cada instancia "tibia" reusa este
 * mismo pool (cacheado en api/index.ts), pero puede haber varias instancias
 * concurrentes, cada una con su propio pool — un `max` bajo por instancia,
 * sumado al pooler de Neon por delante, evita agotar las conexiones reales
 * de Postgres sin renunciar a transacciones reales (BEGIN/COMMIT) para el
 * outbox de sync, que si necesita esa garantía.
 */
@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const connectionString = config.get('DATABASE_URL', { infer: true });
        const client = postgres(connectionString, { max: 3 });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
