import { createZodDto } from 'nestjs-zod';
import {
  registerRequestSchema,
  loginRequestSchema,
  authResponseSchema,
  changePasswordRequestSchema,
} from '@app-laburo/shared';

export class RegisterRequestDto extends createZodDto(registerRequestSchema) {}
export class LoginRequestDto extends createZodDto(loginRequestSchema) {}
export class AuthResponseDto extends createZodDto(authResponseSchema) {}
export class ChangePasswordRequestDto extends createZodDto(
  changePasswordRequestSchema,
) {}
