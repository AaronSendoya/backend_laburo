import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const sqliteDb = SQLite.openDatabaseSync('app_laburo.db');

/**
 * El driver drizzle-orm/expo-sqlite es SÍNCRONO por dentro (openDatabaseSync +
 * prepareSync/executeSync) — por eso db.transaction() debe recibir un
 * callback NO async (ver timeEntries.repository.ts). Eso es justamente lo que
 * nos da la garantía ACID local: al ser síncrono, ningún otro código JS puede
 * intercalarse a mitad de una transacción.
 */
export const db = drizzle(sqliteDb, { schema });
