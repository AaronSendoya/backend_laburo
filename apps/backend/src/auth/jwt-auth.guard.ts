import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

interface JwtPayload {
  sub: string;
  tv: number;
}

/**
 * Guard global: reemplaza a la clave compartida de antes por un JWT por
 * cuenta (`Authorization: Bearer <token>`), firmado en AuthService al
 * registrarse/iniciar sesión. Si es válido, adjunta `request.user.userId` —
 * de ahí en más todo el resto del pedido (time-entries, sync) sabe de quién
 * son los datos sin volver a tocar la base de `users`.
 *
 * Además de la firma, compara `tv` (tokenVersion) contra el valor actual en
 * la base — no es un chequeo puramente stateless. Es lo que permite que
 * cambiar la contraseña invalide tokens viejos (ver AuthService.changePassword):
 * sin esto, un JWT robado seguiría sirviendo hasta que expire solo, sin
 * importar cuántas veces cambiés la contraseña después.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.header('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Token was revoked');
    }

    request.user = { userId: payload.sub };
    return true;
  }
}
