import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
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
 *
 * Vercel invoca este handler con objetos reales de Node (`IncomingMessage`/
 * `ServerResponse`), no con el formato de evento de AWS Lambda — por eso se
 * le pasa la instancia de Express directamente como request listener. Usar
 * `serverless-http` acá (como hacía antes) rearma un evento Lambda sintético
 * a partir de esos objetos reales; como a un `IncomingMessage` le faltan los
 * campos que esa librería espera (`event.path`, `event.httpMethod`, etc.),
 * termina tratando CUALQUIER ruta como `GET /` y la respuesta nunca se
 * escribe en el `res` real — cada endpoint quedaba colgado hasta el timeout.
 */
let cachedApp: Promise<(req: IncomingMessage, res: ServerResponse) => void> | null = null;

async function getApp() {
  if (!cachedApp) {
    cachedApp = NestFactory.create(AppModule).then(async (app) => {
      await app.init();
      return app.getHttpAdapter().getInstance();
    });
  }
  return cachedApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expressInstance = await getApp();
  expressInstance(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

