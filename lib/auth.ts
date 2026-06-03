import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import { magicLink } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN"] as const,
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  plugins: [
    nextCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await getResend().emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: "Sign in",
          html: `
            <a href="${url}">
              Sign in
            </a>
          `,
        });
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url }) => {
      await getResend().emails.send({
        from: process.env.EMAIL_FROM ?? "Auth <onboarding@resend.dev>",
        to: user.email,
        subject: "Reset your password",
        html: `
          <p>Hello ${user.name ?? ""}</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${url}">Reset password</a></p>
        `,
      });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await getResend().emails.send({
        from: process.env.EMAIL_FROM ?? "Auth <onboarding@resend.dev>",
        to: user.email,
        subject: "Verify your email",
        html: `
          <p>Hello ${user.name ?? ""}</p>
          <p>Click the link below to verify your email:</p>
          <p><a href="${url}">Verify email</a></p>
        `,
      });
    },
  },
});
