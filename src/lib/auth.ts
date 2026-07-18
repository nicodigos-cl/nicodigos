import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { captcha, emailOTP } from "better-auth/plugins";

import { AuthOtpEmail } from "@/emails/auth-otp-email";
import {
  authOtpCopy,
  buildAuthOtpUrl,
  isAuthOtpType,
  type AuthOtpType,
} from "@/lib/auth/otp";
import { makeUserAdminByEnv } from "@/lib/auth/admin";
import { sendReactEmail } from "@/lib/email/resend";
import prisma from "@/lib/prisma";
import { turnstileSecretKey } from "@/lib/turnstile";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

function sendAuthOtpEmail({
  email,
  otp,
  type,
  userName,
}: {
  email: string;
  otp: string;
  type: AuthOtpType;
  userName?: string;
}) {
  const copy = authOtpCopy(type);
  void sendReactEmail({
    to: email,
    subject: copy.emailSubject,
    react: AuthOtpEmail({
      email,
      otp,
      type,
      userName,
      url: buildAuthOtpUrl({ email, otp, type }),
    }),
  });
}

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
        async before(session) {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { accountStatus: true, suspensionEndsAt: true },
          });
          if (!user) {
            return false;
          }
          if (
            user.accountStatus === "SUSPENDED" ||
            user.accountStatus === "ANONYMIZED"
          ) {
            if (
              user.accountStatus === "SUSPENDED" &&
              user.suspensionEndsAt &&
              user.suspensionEndsAt.getTime() <= Date.now()
            ) {
              await prisma.user.update({
                where: { id: session.userId },
                data: {
                  accountStatus: "ACTIVE",
                  suspensionReason: null,
                  suspendedAt: null,
                  suspendedByUserId: null,
                  suspensionEndsAt: null,
                },
              });
              return;
            }
            return false;
          }
        },
        async after(session) {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { email: true },
          });
          if (user) {
            await makeUserAdminByEnv(user.email);
          }
          await prisma.user.update({
            where: { id: session.userId },
            data: { lastActivityAt: new Date() },
          });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
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
  plugins: [
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: turnstileSecretKey,
      endpoints: [
        "/sign-up/email",
        "/sign-in/email",
        "/request-password-reset",
        "/email-otp/request-password-reset",
      ],
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10,
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (!isAuthOtpType(type)) return;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { name: true },
        });

        sendAuthOtpEmail({
          email,
          otp,
          type,
          userName: user?.name,
        });
      },
    }),
    nextCookies(),
  ],
});
