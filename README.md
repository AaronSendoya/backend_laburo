# app_laburo — Laburo Time Tracker

App personal para registrar horas de pasantía: entrada/salida, calendario, reportes con gráficas y exportación PDF/CSV, y respaldo opcional en la nube con cuenta propia. Local-first: SQLite en el dispositivo es siempre la fuente de verdad — la app funciona 100% sin conexión y sin cuenta.

## Estructura del monorepo

```
apps/
  backend/    NestJS (monolito modular) — API + sync + auth. Drizzle ORM sobre Postgres (Neon).
  mobile/     Expo / React Native (TypeScript) — iOS, Expo Go. SQLite local + expo-router.
packages/
  shared/          Zod schemas y lógica pura compartida entre mobile y backend (validación, cálculo de reportes).
  config-typescript/, config-eslint/   Configuración compartida.
```

Gestión: **pnpm workspaces + Turborepo** en la raíz y en `packages/*` y `apps/backend`. `apps/mobile` queda **fuera** del workspace de pnpm (se instala con `npm` — pnpm tenía timeouts de red bajando binarios grandes de Expo/RN en este entorno) y consume `packages/shared` vía `file:../../packages/shared`.

## Arquitectura

- **Mobile, local-first real**: cada escritura (crear/editar/borrar una entrada) es una única transacción SQLite que guarda la entidad *y* encola una operación en una tabla `outbox`, atómicamente. La UI nunca espera a la red.
- **Sync por outbox + cursor**: el motor de sync (`apps/mobile/src/sync/syncEngine.ts`) drena el `outbox` hacia `POST /sync/push` (idempotente por `opId`) y trae cambios remotos con `GET /sync/pull?since=<cursor>`. Se dispara al abrir la app, al reconectar, y unos segundos después de cualquier escritura local.
- **Backend, mismo camino online y offline**: el móvil nunca llama a los endpoints REST de `time-entries` directamente — todo pasa por `/sync/push` y `/sync/pull`, incluso con conexión. Los endpoints REST existen solo para debug/curl.
- **Aislamiento por cuenta**: `time_entries` y `sync_operation_log` tienen `user_id`; toda query del backend filtra por el usuario del JWT — nunca por algo que mande el cliente en el body.

## Decisiones de diseño (y por qué)

| Decisión | Por qué |
|---|---|
| Drizzle ORM, no Prisma | Prisma resolvía a un release candidate con ~940 paquetes y SDKs no pedidos (Cloudflare, AWS). Drizzle es liviano y es el mismo ORM en mobile (SQLite) y backend (Postgres). |
| NestJS v11, no v12 | v12 trae un cambio de toolchain grande (ESM/Vitest/oxlint) todavía inestable al momento de empezar. |
| JWT largo (180 días), sin refresh token | App personal de un usuario real — el costo de un flujo de refresh no se justifica. Si vence, se vuelve a iniciar sesión; el modo local sigue andando mientras tanto. |
| `tokenVersion` por cuenta | Cambiar la contraseña invalida todos los JWT ya emitidos (no solo el de ese dispositivo) — es lo que hace que "cambiar contraseña" funcione también como "cerrar todas las sesiones". |
| Registro sin código visible | El registro exige un header `x-app-secret` que la app manda sola (embebido en el bundle) — filtra pedidos que no vengan de la app real, sin pedirle nada a la persona. Ver [Autenticación](#autenticación-y-cuentas). |
| Driver TCP (`postgres-js`) en Vercel, no el driver HTTP de Neon | El driver HTTP tiene un modelo de transacciones distinto (batching, no `BEGIN/COMMIT` real). La atomicidad "aplico la operación + registro el `opId`" en el sync es la garantía ACID que importa acá — se prioriza sobre la optimización de conexión, que a este volumen de tráfico es un problema teórico. |
| "Total" agrupa por año, no por mes/día | Escala con años de uso (una barra por año) en vez de con horas acumuladas — 2000 horas en 5 años son 5 barras, nunca cientos. |
| Índices SQLite (`is_deleted, check_in` / `status, created_at`) | El patrón de acceso dominante (calendario, reportes, sync) siempre filtra por esas columnas — sin índice, cada pantalla escanea la tabla completa. |

## Autenticación y cuentas

Cuentas reales (email + contraseña, `bcryptjs`), opcionales — sin cuenta, la app es 100% local. Endpoints en `apps/backend/src/auth/`:

- `POST /auth/register` — público, pero exige el header `x-app-secret` (ver tabla de variables de entorno). Sin ese header, o si no coincide, 401 — nunca llega a tocar la base.
- `POST /auth/login` — público.
- `POST /auth/change-password` — autenticado (JWT). Verifica la contraseña actual, sube `tokenVersion` (invalida cualquier otro token ya emitido) y devuelve un token nuevo para el dispositivo que pidió el cambio.

El JWT lleva `sub` (userId) y `tv` (tokenVersion). `JwtAuthGuard` verifica la firma *y* que `tv` coincida con el valor actual en la base — no es puramente stateless, a propósito (es lo que permite revocar tokens sin una blocklist aparte).

## Variables de entorno

### Backend (`apps/backend/.env`, ver `.env.example`)

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Endpoint **pooled** de Neon (PgBouncer) — usado en runtime. |
| `DIRECT_URL` | Endpoint **directo** de Neon (sin pooler) — usado solo por `drizzle-kit` / el script de migraciones. |
| `JWT_SECRET` | Firma los JWT de sesión. Mín. 32 caracteres, aleatorio (`openssl rand -hex 32`). |
| `APP_CLIENT_SECRET` | Filtra `/auth/register`. Mín. 16 caracteres. **Tiene que ser idéntico** al `EXPO_PUBLIC_APP_CLIENT_SECRET` del móvil. |
| `PORT` | Puerto local (default `3000`). No aplica en Vercel. |
| `NODE_ENV` | `development` / `production` / `test`. |

### Mobile (`apps/mobile/.env`, ver `.env.example`)

| Variable | Qué es |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | URL del backend. Sin definir, cae a `http://localhost:3000` (solo sirve en simulador/web, no desde un iPhone físico). |
| `EXPO_PUBLIC_APP_CLIENT_SECRET` | Mismo valor que `APP_CLIENT_SECRET` del backend. |

Los `EXPO_PUBLIC_*` se embeben en el bundle en tiempo de build — **no son secretos de servidor**, son configuración de cliente. Cambiar su valor exige reconstruir/redesplegar la app (no alcanza con reiniciar el server de desarrollo si ya se generó un build).

## Desarrollo local

```bash
pnpm install

pnpm dev:backend    # API en http://localhost:3000 (necesita Postgres real, ver DATABASE_URL/DIRECT_URL)
pnpm dev:mobile     # Expo Dev Server — escanear el QR con Expo Go

pnpm lint / pnpm typecheck / pnpm test / pnpm build   # corren en todos los paquetes vía Turborepo
```

Para probar en un iPhone físico: misma red Wi-Fi que la laptop, firewall permitiendo el puerto de Metro, y sesión iniciada en Expo Go con la misma cuenta que la CLI.

## Base de datos y migraciones

Schema en `apps/backend/src/database/schema.ts` (tablas: `users`, `time_entries`, `sync_operation_log`). Migraciones versionadas en `apps/backend/drizzle/`.

```bash
pnpm --filter @app-laburo/backend db:generate   # genera una migración a partir de schema.ts
pnpm --filter @app-laburo/backend db:migrate    # la aplica contra DIRECT_URL (nunca el pooler)
pnpm --filter @app-laburo/backend db:studio     # explorador visual de la base
```

## Desplegar a producción (Neon + Vercel)

1. Crear un proyecto en [Neon](https://neon.tech) → copiar el connection string **pooled** (`?pgbouncer=true`) y el **directo**.
2. Crear un proyecto en [Vercel](https://vercel.com) apuntando a `apps/backend` (ya tiene `vercel.json` + `api/index.ts` como entrypoint serverless).
3. Configurar las 4 variables de entorno del backend (tabla de arriba) en Vercel.
4. Correr `pnpm --filter @app-laburo/backend db:migrate` contra la base de Neon real.
5. Desplegar.
6. En `apps/mobile/.env`, poner `EXPO_PUBLIC_API_BASE_URL` a la URL real de Vercel y `EXPO_PUBLIC_APP_CLIENT_SECRET` al mismo valor que se configuró en el paso 3.

## Referencia de la API

| Método | Ruta | Auth | Uso |
|---|---|---|---|
| GET | `/health` | pública | ping / despertar el backend |
| POST | `/auth/register` | header `x-app-secret` | crear cuenta |
| POST | `/auth/login` | pública | iniciar sesión |
| POST | `/auth/change-password` | JWT | cambiar contraseña (revoca otras sesiones) |
| POST | `/sync/push` | JWT | el móvil sube el outbox local |
| GET | `/sync/pull` | JWT | el móvil trae cambios remotos desde un cursor |
| GET/POST/PUT/DELETE | `/time-entries*` | JWT | CRUD REST de debug — el móvil no lo usa, siempre pasa por `/sync/*` |

## Testing

- **Backend**: `pnpm --filter @app-laburo/backend test` (unitarios, mocks a mano, sin DB) y `test:e2e` (necesita `DATABASE_URL`/`DIRECT_URL` apuntando a una Postgres real alcanzable).
- **Mobile**: no hay framework de tests instalado — la verificación es `npx tsc --noEmit`, `npm run lint` (`expo lint`) y `npx expo export --platform ios` (bundle de producción completo) dentro de `apps/mobile`.

## Funciones implementadas

Registro de entrada/salida (con hora pasada, para cargar días olvidados) · confirmación antes de marcar · calendario tipo mapa de calor · reportes con gráfica (día/semana/mes/año/total, agrupamiento adaptativo) · comparación contra el período anterior · meta de horas con barra de progreso · exportación PDF y CSV (reportes y mes actual desde Inicio) · buscador rápido de entradas · racha de días trabajados (opcional) · recordatorio local de entrada sin cerrar (umbral configurable) · nombre de empresa configurable · tema claro/oscuro/sistema · cuenta opcional con respaldo en la nube, cambio de contraseña y cierre de todas las sesiones.
