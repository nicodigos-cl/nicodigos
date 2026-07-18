import { z } from "zod";

import { AUTH_OTP_LENGTH } from "@/lib/auth/otp";

export const authEmailSchema = z
  .email({ error: "Ingresa un correo válido" })
  .transform((value) => value.trim().toLowerCase());

export const authPasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres");

export const loginFormSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Ingresa tu contraseña"),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Ingresa tu nombre")
      .max(80, "El nombre es demasiado largo"),
    email: authEmailSchema,
    password: authPasswordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const forgotPasswordFormSchema = z.object({
  email: authEmailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export const otpFormSchema = z.object({
  otp: z
    .string()
    .regex(new RegExp(`^\\d{${AUTH_OTP_LENGTH}}$`), "Ingresa el código completo"),
});

export type OtpFormValues = z.infer<typeof otpFormSchema>;

export const resetPasswordFormSchema = z
  .object({
    password: authPasswordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
