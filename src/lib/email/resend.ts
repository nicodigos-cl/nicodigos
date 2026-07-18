import type { ReactElement } from "react";
import { Resend } from "resend";

import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "email" });

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

export function getEmailFromAddress() {
  return process.env.RESEND_FROM ?? "Nicodigos <onboarding@resend.dev>";
}

export async function sendReactEmail({
  to,
  subject,
  react,
  category = "transactional",
}: {
  to: string;
  subject: string;
  react: ReactElement;
  category?: "transactional" | "auth" | "admin" | "test";
}) {
  try {
    const { getOperationalSettings } = await import("@/lib/settings/runtime");
    const settings = await getOperationalSettings();

    if (!settings.resendEnabled && category !== "test") {
      log.warn({ to, subject, category }, "Resend disabled in settings — skip");
      return null;
    }

    if (category === "transactional" && !settings.transactionalEmailsEnabled) {
      log.warn({ to, subject }, "Transactional emails disabled — skip");
      return null;
    }

    if (category === "admin" && !settings.adminEmailsEnabled) {
      log.warn({ to, subject }, "Admin emails disabled — skip");
      return null;
    }

    if (category === "auth") {
      const isReset = /contraseña|password|reset/i.test(subject);
      const isVerify = /verific/i.test(subject);
      if (isReset && !settings.emailPasswordReset) {
        log.warn({ to, subject }, "Password reset emails disabled — skip");
        return null;
      }
      if (isVerify && !settings.emailEmailVerification) {
        log.warn({ to, subject }, "Email verification disabled — skip");
        return null;
      }
    }
  } catch (error) {
    log.warn({ err: error }, "Could not load email settings — sending anyway");
  }

  const resend = getResendClient();
  const from = getEmailFromAddress();

  if (!resend) {
    log.warn(
      { to, subject },
      "RESEND_API_KEY missing — email not sent (dev skip)",
    );
    return null;
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    react,
  });

  if (error) {
    log.error({ err: error, to, subject }, "Failed to send email");
    throw new Error(error.message);
  }

  log.info({ to, subject, id: data?.id }, "Email sent");
  return data;
}
