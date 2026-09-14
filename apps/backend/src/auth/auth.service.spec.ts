import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import type { UsersService, UserRow } from '../users/users.service';
import type { Env } from '../config/env';

const APP_SECRET = 'shared-app-secret-1234567890';
const TEST_ROUNDS = 4; // más rápido para tests — AuthService usa su propia constante para el hash real

function makeUsersService(initialUsers: UserRow[] = []): UsersService {
  const users = [...initialUsers];
  return {
    findByEmail: jest.fn(
      (email: string) => users.find((u) => u.email === email) ?? null,
    ),
    findById: jest.fn((id: string) => users.find((u) => u.id === id) ?? null),
    create: jest.fn((input: { email: string; passwordHash: string }) => {
      const row: UserRow = {
        id: `user-${users.length + 1}`,
        tokenVersion: 0,
        createdAt: new Date(),
        ...input,
      };
      users.push(row);
      return row;
    }),
    updatePassword: jest.fn((id: string, passwordHash: string) => {
      const row = users.find((u) => u.id === id);
      if (!row) throw new Error('user not found in test double');
      row.passwordHash = passwordHash;
      row.tokenVersion += 1;
      return row;
    }),
  } as unknown as UsersService;
}

function makeConfigService(): ConfigService<Env, true> {
  return {
    get: jest.fn().mockReturnValue(APP_SECRET),
  } as unknown as ConfigService<Env, true>;
}

function makeJwtService(): JwtService {
  return {
    signAsync: jest.fn().mockResolvedValue('signed-jwt'),
  } as unknown as JwtService;
}

describe('AuthService', () => {
  describe('register', () => {
    it('rejects a missing client secret (no header at all)', async () => {
      const service = new AuthService(
        makeUsersService(),
        makeJwtService(),
        makeConfigService(),
      );
      await expect(
        service.register(undefined, {
          email: 'a@example.com',
          password: 'correcthorse9',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an incorrect client secret', async () => {
      const service = new AuthService(
        makeUsersService(),
        makeJwtService(),
        makeConfigService(),
      );
      await expect(
        service.register('wrong-secret', {
          email: 'a@example.com',
          password: 'correcthorse9',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a duplicate email', async () => {
      const existingHash = await bcrypt.hash('whatever123', TEST_ROUNDS);
      const users = makeUsersService([
        {
          id: 'u1',
          email: 'a@example.com',
          passwordHash: existingHash,
          tokenVersion: 0,
          createdAt: new Date(),
        },
      ]);
      const service = new AuthService(
        users,
        makeJwtService(),
        makeConfigService(),
      );
      await expect(
        service.register(APP_SECRET, {
          email: 'a@example.com',
          password: 'correcthorse9',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the user (email normalizado) y devuelve un token con tokenVersion 0', async () => {
      const jwt = makeJwtService();
      const service = new AuthService(
        makeUsersService(),
        jwt,
        makeConfigService(),
      );
      const result = await service.register(APP_SECRET, {
        email: '  New@Example.com  ',
        password: 'correcthorse9',
      });
      expect(result).toEqual({ token: 'signed-jwt', email: 'new@example.com' });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any() es del tipo `any` de jest
      const expectedPayload = { sub: expect.any(String), tv: 0 };
      // eslint-disable-next-line @typescript-eslint/unbound-method -- jwt.signAsync es un jest.fn(), no un método real con `this`
      expect(jwt.signAsync).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('login', () => {
    it('rejects a nonexistent email', async () => {
      const service = new AuthService(
        makeUsersService(),
        makeJwtService(),
        makeConfigService(),
      );
      await expect(
        service.login({ email: 'nope@example.com', password: 'whatever123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects the wrong password', async () => {
      const hash = await bcrypt.hash('correcthorse9', TEST_ROUNDS);
      const users = makeUsersService([
        {
          id: 'u1',
          email: 'a@example.com',
          passwordHash: hash,
          tokenVersion: 0,
          createdAt: new Date(),
        },
      ]);
      const service = new AuthService(
        users,
        makeJwtService(),
        makeConfigService(),
      );
      await expect(
        service.login({ email: 'a@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns a token on success', async () => {
      const hash = await bcrypt.hash('correcthorse9', TEST_ROUNDS);
      const users = makeUsersService([
        {
          id: 'u1',
          email: 'a@example.com',
          passwordHash: hash,
          tokenVersion: 0,
          createdAt: new Date(),
        },
      ]);
      const jwt = makeJwtService();
      const service = new AuthService(users, jwt, makeConfigService());
      const result = await service.login({
        email: 'a@example.com',
        password: 'correcthorse9',
      });
      expect(result).toEqual({ token: 'signed-jwt', email: 'a@example.com' });
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password', async () => {
      const hash = await bcrypt.hash('correcthorse9', TEST_ROUNDS);
      const users = makeUsersService([
        {
          id: 'u1',
          email: 'a@example.com',
          passwordHash: hash,
          tokenVersion: 0,
          createdAt: new Date(),
        },
      ]);
      const service = new AuthService(
        users,
        makeJwtService(),
        makeConfigService(),
      );
      await expect(
        service.changePassword('u1', {
          currentPassword: 'wrong-one',
          newPassword: 'brandnewpass9',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates the hash, bumps tokenVersion, and returns a fresh token', async () => {
      const hash = await bcrypt.hash('correcthorse9', TEST_ROUNDS);
      const users = makeUsersService([
        {
          id: 'u1',
          email: 'a@example.com',
          passwordHash: hash,
          tokenVersion: 0,
          createdAt: new Date(),
        },
      ]);
      const jwt = makeJwtService();
      const service = new AuthService(users, jwt, makeConfigService());

      const result = await service.changePassword('u1', {
        currentPassword: 'correcthorse9',
        newPassword: 'brandnewpass9',
      });

      expect(result).toEqual({ token: 'signed-jwt', email: 'a@example.com' });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- jwt.signAsync es un jest.fn(), no un método real con `this`
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', tv: 1 });

      // el login con la contraseña vieja ya no debería andar
      await expect(
        service.login({ email: 'a@example.com', password: 'correcthorse9' }),
      ).rejects.toThrow(UnauthorizedException);
      // y con la nueva sí
      await expect(
        service.login({ email: 'a@example.com', password: 'brandnewpass9' }),
      ).resolves.toEqual({
        token: 'signed-jwt',
        email: 'a@example.com',
      });
    });
  });
});
