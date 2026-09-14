import { z } from 'zod';

/**
 * Validación de servidor — deliberadamente espejo de authValidation.ts
 * (misma longitud mínima, mismo requisito de letras+números). El cliente
 * valida para dar feedback instantáneo; el servidor nunca confía en eso y
 * repite la regla acá, porque un request puede llegar sin pasar por la UI.
 */
const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.')
  .refine((value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), 'La contraseña debe combinar letras y números.');

export const registerRequestSchema = z.object({
  email: z.string().email().max(255),
  password: passwordSchema,
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(72),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  email: z.string().email(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'La contraseña nueva debe ser distinta de la actual.',
    path: ['newPassword'],
  });
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
