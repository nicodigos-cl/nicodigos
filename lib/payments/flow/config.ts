import "server-only";

export type FlowEnvironment = "sandbox" | "production";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function getSiteBaseUrl(): string {
  return trimEnv(process.env.BETTER_AUTH_URL) || "http://localhost:3000";
}

/** URL pública alcanzable desde Flow (webhook). En local: túnel cloudflared. */
export function getFlowPublicBaseUrl(): string {
  const publicUrl = trimEnv(process.env.FLOW_PUBLIC_URL);
  if (publicUrl) {
    return publicUrl.replace(/\/$/, "");
  }

  return getSiteBaseUrl().replace(/\/$/, "");
}

/** Retorno del navegador tras pagar. En local usa localhost; en prod BETTER_AUTH_URL. */
export function getFlowReturnBaseUrl(): string {
  const returnUrl = trimEnv(process.env.FLOW_RETURN_URL);
  if (returnUrl) {
    return returnUrl.replace(/\/$/, "");
  }

  return getSiteBaseUrl().replace(/\/$/, "");
}

export function getFlowApiKey(): string {
  return trimEnv(process.env.FLOW_API_KEY);
}

export function getFlowSecretKey(): string {
  return trimEnv(process.env.FLOW_SECRET_KEY);
}

export function getFlowEnvironment(): FlowEnvironment {
  const env = trimEnv(process.env.FLOW_ENV).toLowerCase();
  return env === "production" ? "production" : "sandbox";
}

export function isFlowConfigured(): boolean {
  return Boolean(getFlowApiKey() && getFlowSecretKey());
}

/** Webhook server-to-server (Flow POST). Debe ser HTTPS público. */
export function flowConfirmationUrl(): string {
  return `${getFlowPublicBaseUrl()}/api/webhooks/flow`;
}

/** Entrada de retorno de Flow (POST/GET con token); redirige a /checkout/return. */
export function flowReturnUrl(): string {
  return `${getFlowReturnBaseUrl()}/api/checkout/flow-return`;
}
