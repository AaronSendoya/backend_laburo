import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import serverless from 'serverless-http';
import { AppModule } from '../src/app.module';

/**
 * Entrypoint de Vercel (serverless). `main.ts` sigue siendo el que se usa en
 * desarrollo local (`pnpm dev`/`start`) — este archivo es aparte y no lo
 * toca. Vercel trata cualquier archivo bajo /api como una función; `vercel.json`
 * reescribe TODO el tráfico acá.
 *
 * El bootstrap de Nest (`NestFactory.create`) se cachea en una promesa a
 * nivel de módulo: en una invocación "tibia" (el mismo contenedor sigue vivo
 * entre requests) se reusa la misma app — mismo pool de Postgres incluido —
 * en vez de reconstruir todo el grafo de módulos en cada request.
 */
let cachedHandler: ReturnType<typeof serverless> | null = null;

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler;
  }

  const app = await NestFactory.create(AppModule);
  await app.init();

  const expressInstance = app.getHttpAdapter().getInstance();
  cachedHandler = serverless(expressInstance);
  return cachedHandler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const nestHandler = await getHandler();
  return nestHandler(req, res);
}
