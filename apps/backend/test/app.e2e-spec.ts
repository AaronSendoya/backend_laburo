import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET) is public and does not require an API key', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }: { body: { ok: boolean } }) => {
        expect(body.ok).toBe(true);
      });
  });

  it('/time-entries (GET) rejects requests without a bearer token', () => {
    return request(app.getHttpServer()).get('/time-entries').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
