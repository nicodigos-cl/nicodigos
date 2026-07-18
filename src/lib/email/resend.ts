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
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
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
