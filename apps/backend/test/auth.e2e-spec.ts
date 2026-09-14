import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';

interface AuthResponseBody {
  token: string;
  email: string;
}

interface TimeEntryBody {
  id: string;
  isDeleted: boolean;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const appSecret = process.env.APP_CLIENT_SECRET ?? '';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function uniqueEmail(): string {
    return `e2e-${randomUUID()}@example.com`;
  }

  it('rejects registration with no x-app-secret header at all', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: uniqueEmail(), password: 'correcthorse-battery9' })
      .expect(401);
  });

  it('rejects registration with the wrong x-app-secret', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .set('x-app-secret', 'definitely-wrong')
      .send({ email: uniqueEmail(), password: 'correcthorse-battery9' })
      .expect(401);
  });

  it('rejects registration with a weak password before it ever reaches the secret check', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .set('x-app-secret', appSecret)
      .send({ email: uniqueEmail(), password: 'short1' })
      .expect(400);
  });

  it('registers, logs in, and allows an authenticated request with the returned token', async () => {
    const email = uniqueEmail();
    const password = 'correcthorse-battery9';

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-app-secret', appSecret)
      .send({ email, password })
      .expect(201);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any() es del tipo `any` de jest
    expect(registerRes.body).toEqual({ token: expect.any(String), email });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const { token } = loginRes.body as AuthResponseBody;

    await request(app.getHttpServer())
      .get('/time-entries')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }: { body: unknown[] }) => {
        expect(Array.isArray(body)).toBe(true);
      });
  });

  it('rejects a duplicate email and a wrong-password login', async () => {
    const email = uniqueEmail();
    const password = 'correcthorse-battery9';

    await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-app-secret', appSecret)
      .send({ email, password })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-app-secret', appSecret)
      .send({ email, password })
      .expect(409);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password-99' })
      .expect(401);
  });

  it('keeps data isolated between accounts: another user cannot see, read, or delete it', async () => {
    const userA = { email: uniqueEmail(), password: 'correcthorse-battery9' };
    const userB = { email: uniqueEmail(), password: 'correcthorse-battery9' };

    const registerA = await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-app-secret', appSecret)
      .send(userA)
      .expect(201);
    const registerB = await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-app-secret', appSecret)
      .send(userB)
      .expect(201);
    const { token: tokenA } = registerA.body as AuthResponseBody;
    const { token: tokenB } = registerB.body as AuthResponseBody;

    const entryId = randomUUID();
    const now = new Date().toISOString();
    await request(app.getHttpServer())
      .post('/time-entries')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        id: entryId,
        checkIn: now,
        checkOut: null,
        note: null,
        clientUpdatedAt: now,
      })
      .expect(201);

    // B no la ve en su propio listado...
    const listB = await request(app.getHttpServer())
      .get('/time-entries')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(
      (listB.body as TimeEntryBody[]).some((entry) => entry.id === entryId),
    ).toBe(false);

    // ...ni puede leerla directo por id...
    await request(app.getHttpServer())
      .get(`/time-entries/${entryId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    // ...ni "borrarla" (204 idempotente de todas formas, pero no debe tocar la fila real de A).
    await request(app.getHttpServer())
      .delete(`/time-entries/${entryId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(204);
    const stillThere = await request(app.getHttpServer())
      .get(`/time-entries/${entryId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect((stillThere.body as TimeEntryBody).isDeleted).toBe(false);
  });

  it('changing the password revokes the old token and re-authenticates with the new one', async () => {
    const email = uniqueEmail();
    const oldPassword = 'correcthorse-battery9';
    const newPassword = 'brandnewpassword9';

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-app-secret', appSecret)
      .send({ email, password: oldPassword })
      .expect(201);
    const { token: oldToken } = registerRes.body as AuthResponseBody;

    // la contraseña actual incorrecta no cambia nada
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: 'not-the-real-one', newPassword })
      .expect(401);

    const changeRes = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: oldPassword, newPassword })
      .expect(200);
    const { token: newToken } = changeRes.body as AuthResponseBody;

    // el token viejo (mismo dispositivo incluido) queda revocado — "cerrar todas las sesiones"
    await request(app.getHttpServer())
      .get('/time-entries')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(401);

    // el token nuevo, devuelto en la misma respuesta, sigue sirviendo
    await request(app.getHttpServer())
      .get('/time-entries')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    // login con la contraseña vieja ya no funciona, con la nueva sí
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: oldPassword })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
  });
});
