import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { ResetPasswordEmail } from "@/emails/reset-password-email";
import { VerificationEmail } from "@/emails/verification-email";
import { makeUserAdminByEnv } from "@/lib/auth/admin";
import { sendReactEmail } from "@/lib/email/resend";
import prisma from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          await makeUserAdminByEnv(user.email);
        },
      },
    },
    session: {
      create: {
        async after(session) {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { email: true },
          });
          if (user) {
            await makeUserAdminByEnv(user.email);
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      void sendReactEmail({
        to: user.email,
        subject: "Restablece tu contraseña — Nicodigos",
        react: ResetPasswordEmail({
          userName: user.name,
          url,
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendReactEmail({
        to: user.email,
        subject: "Verifica tu correo — Nicodigos",
        react: VerificationEmail({
          userName: user.name,
          url,
        }),
      });
    },
  },
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN"],
        required: true,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});
