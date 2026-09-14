import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database/database.constants';
import * as schema from '../database/schema';

type Db = PostgresJsDatabase<typeof schema>;
export type UserRow = typeof schema.users.$inferSelect;

/** Dueño único de la persistencia de `users` — usado solo por AuthService. */
@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));
    return row ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    return row ?? null;
  }

  async create(input: {
    email: string;
    passwordHash: string;
  }): Promise<UserRow> {
    const [row] = await this.db.insert(schema.users).values(input).returning();
    return row;
  }

  /** Sube tokenVersion junto con el hash nuevo — invalida de una todos los JWT ya emitidos (ver JwtAuthGuard). */
  async updatePassword(id: string, passwordHash: string): Promise<UserRow> {
    const [row] = await this.db
      .update(schema.users)
      .set({
        passwordHash,
        tokenVersion: sql`${schema.users.tokenVersion} + 1`,
      })
      .where(eq(schema.users.id, id))
      .returning();
    return row;
  }
}
