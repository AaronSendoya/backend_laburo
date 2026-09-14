import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { UsersService, UserRow } from '../users/users.service';

interface MockRequest {
  header: (name: string) => string | undefined;
  user?: { userId: string };
}

function makeContext(authHeader: string | undefined): {
  context: ExecutionContext;
  request: MockRequest;
} {
  const request: MockRequest = {
    header: (name: string) =>
      name === 'authorization' ? authHeader : undefined,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeUsersService(user: UserRow | null): UsersService {
  return {
    findById: jest.fn().mockResolvedValue(user),
  } as unknown as UsersService;
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let jwtService: JwtService;
  let users: UsersService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
    users = makeUsersService(null);
    guard = new JwtAuthGuard(reflector, jwtService, users);
  });

  it('allows @Public() routes without checking the token at all', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
    const { context } = makeContext(undefined);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects requests with no Authorization header', async () => {
    const { context } = makeContext(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a header that is not a Bearer token', async () => {
    const { context } = makeContext('Basic abc123');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an invalid or expired token', async () => {
    jwtService.verifyAsync = jest
      .fn()
      .mockRejectedValue(new Error('jwt expired'));
    const { context } = makeContext('Bearer bad-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token whose account no longer exists', async () => {
    jwtService.verifyAsync = jest
      .fn()
      .mockResolvedValue({ sub: 'ghost-user', tv: 0 });
    guard = new JwtAuthGuard(reflector, jwtService, makeUsersService(null));
    const { context } = makeContext('Bearer some-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token whose tokenVersion was revoked by a password change', async () => {
    jwtService.verifyAsync = jest
      .fn()
      .mockResolvedValue({ sub: 'user-123', tv: 0 });
    const staleUser: UserRow = {
      id: 'user-123',
      email: 'a@example.com',
      passwordHash: 'x',
      tokenVersion: 1,
      createdAt: new Date(),
    };
    guard = new JwtAuthGuard(
      reflector,
      jwtService,
      makeUsersService(staleUser),
    );
    const { context } = makeContext('Bearer old-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows a valid, current token and attaches request.user.userId from the "sub" claim', async () => {
    jwtService.verifyAsync = jest
      .fn()
      .mockResolvedValue({ sub: 'user-123', tv: 0 });
    const currentUser: UserRow = {
      id: 'user-123',
      email: 'a@example.com',
      passwordHash: 'x',
      tokenVersion: 0,
      createdAt: new Date(),
    };
    guard = new JwtAuthGuard(
      reflector,
      jwtService,
      makeUsersService(currentUser),
    );
    const { context, request } = makeContext('Bearer good-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ userId: 'user-123' });
  });
});
