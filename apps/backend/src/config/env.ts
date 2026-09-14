import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Compartido con la app móvil (EXPO_PUBLIC_APP_CLIENT_SECRET, embebido en el
  // bundle) — filtra registros que no vengan de la app, sin que la persona
  // tenga que escribir nada. Ver auth.service.ts#register.
  APP_CLIENT_SECRET: z
    .string()
    .min(16, 'APP_CLIENT_SECRET must be at least 16 characters'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
