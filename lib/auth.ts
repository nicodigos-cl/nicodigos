import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import {
  getTurnstileSecretKey,
  isTurnstileServerConfigured,
} from "@/lib/turnstile";
import { captcha, magicLink } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN"],
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        const greeting = user.name ? `Hola ${user.name},` : "Hola,";
        await getResend().emails.send({
          from: process.env.EMAIL_FROM ?? "Auth <onboarding@resend.dev>",
          to: user.email,
          subject: "Confirma el cambio de correo — nicodigos",
          html: `
            <p>${greeting}</p>
            <p>Recibimos una solicitud para cambiar el correo de tu cuenta a <strong>${newEmail}</strong>.</p>
            <p>Si fuiste tú, confirma el cambio:</p>
            <p><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#c2410c;color:#fff;text-decoration:none;font-weight:600;">Confirmar cambio de correo</a></p>
            <p style="color:#666;font-size:14px;">Si no solicitaste esto, ignora este mensaje. Tu correo actual no cambiará.</p>
          `,
        });
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    nextCookies(),
    ...(isTurnstileServerConfigured()
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: getTurnstileSecretKey(),
            endpoints: [
              "/sign-up/email",
              "/sign-in/email",
              "/sign-in/magic-link",
              "/request-password-reset",
              "/send-verification-email",
            ],
          }),
        ]
      : []),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await getResend().emails.send({
          from: process.env.EMAIL_FROM ?? "Auth <onboarding@resend.dev>",
          to: email,
          subject: "Tu enlace de acceso — nicodigos",
          html: `
            <p>Hola,</p>
            <p>Haz clic en el botón para acceder a tu cuenta en nicodigos. El enlace caduca en 5 minutos.</p>
            <p><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#c2410c;color:#fff;text-decoration:none;font-weight:600;">Acceder a nicodigos</a></p>
            <p style="color:#666;font-size:14px;">Si no solicitaste este correo, puedes ignorarlo.</p>
          `,
        });
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url }) => {
      const greeting = user.name ? `Hola ${user.name},` : "Hola,";
      await getResend().emails.send({
        from: process.env.EMAIL_FROM ?? "Auth <onboarding@resend.dev>",
        to: user.email,
        subject: "Restablece tu contraseña — nicodigos",
        html: `
          <p>${greeting}</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en nicodigos.</p>
          <p><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#c2410c;color:#fff;text-decoration:none;font-weight:600;">Restablecer contraseña</a></p>
          <p style="color:#666;font-size:14px;">Si no solicitaste este cambio, puedes ignorar este correo. El enlace caduca en una hora.</p>
        `,
      });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const greeting = user.name ? `Hola ${user.name},` : "Hola,";
      const isChangeEmail = url.includes("change-email");
      await getResend().emails.send({
        from: process.env.EMAIL_FROM ?? "Auth <onboarding@resend.dev>",
        to: user.email,
        subject: isChangeEmail
          ? "Confirma tu nuevo correo — nicodigos"
          : "Verifica tu correo — nicodigos",
        html: isChangeEmail
          ? `
            <p>${greeting}</p>
            <p>Confirma tu nuevo correo para completar el cambio en nicodigos:</p>
            <p><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#c2410c;color:#fff;text-decoration:none;font-weight:600;">Confirmar nuevo correo</a></p>
            <p style="color:#666;font-size:14px;">Si no solicitaste este cambio, ignora este mensaje.</p>
          `
          : `
            <p>${greeting}</p>
            <p>Gracias por registrarte en nicodigos. Confirma tu correo para activar tu cuenta:</p>
            <p><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#c2410c;color:#fff;text-decoration:none;font-weight:600;">Verificar correo</a></p>
            <p style="color:#666;font-size:14px;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
          `,
      });
    },
  },
});
