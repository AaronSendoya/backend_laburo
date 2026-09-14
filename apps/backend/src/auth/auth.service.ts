import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '@app-laburo/shared';
import type { Env } from '../config/env';
import { UsersService, type UserRow } from '../users/users.service';

/**
 * ~250ms de costo por hash en hardware típico — suficiente para que un
 * ataque de fuerza bruta offline sea caro, imperceptible en un login humano.
 */
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * `appSecret` viaja en un header (x-app-secret), nunca en el body ni en
   * ningún campo que la persona vea o escriba — lo manda la app sola, tomado
   * de una variable de entorno embebida en el bundle (ver apps/mobile/src/config).
   * Filtra registros que no vengan de la app real sin pedirle nada a nadie.
   * No es a prueba de un atacante que decompile el bundle, pero cierra la
   * puerta a cualquiera que solo encuentre la URL pública — que es el riesgo
   * real acá (proyecto personal, no un servicio con usuarios de verdad).
   */
  async register(
    appSecret: string | undefined,
    input: RegisterRequest,
  ): Promise<AuthResponse> {
    const expectedSecret = this.config.get('APP_CLIENT_SECRET', {
      infer: true,
    });
    if (!appSecret || !constantTimeStringsEqual(appSecret, expectedSecret)) {
      throw new UnauthorizedException('Invalid client');
    }

    const email = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.users.create({ email, passwordHash });
    return this.issueToken(user);
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const email = normalizeEmail(input.email);
    const user = await this.users.findByEmail(email);

    // Mismo mensaje tanto si el email no existe como si la contraseña es
    // incorrecta — no hay que revelar si una dirección está registrada.
    // bcrypt.compare contra un hash real cuando el user no existe evita que
    // el tiempo de respuesta delate cuál de los dos casos fue.
    const passwordHash =
      user?.passwordHash ?? (await bcrypt.hash('', BCRYPT_ROUNDS));
    const passwordOk = await bcrypt.compare(input.password, passwordHash);
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueToken(user);
  }

  /**
   * Cambia la contraseña y de paso invalida cualquier otro token ya emitido
   * (ver tokenVersion en el schema y la verificación en JwtAuthGuard) — es lo
   * que hace que esto también funcione como "cerrar todas las sesiones". El
   * único token que sigue sirviendo es el nuevo que devolvemos acá, para que
   * el dispositivo que pidió el cambio no quede deslogueado de su propia acción.
   */
  async changePassword(
    userId: string,
    input: ChangePasswordRequest,
  ): Promise<AuthResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }

    const currentOk = await bcrypt.compare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    const updated = await this.users.updatePassword(user.id, newHash);
    return this.issueToken(updated);
  }

  private async issueToken(user: UserRow): Promise<AuthResponse> {
    const token = await this.jwtService.signAsync({
      sub: user.id,
      tv: user.tokenVersion,
    });
    return { token, email: user.email };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function constantTimeStringsEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
