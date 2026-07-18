import "server-only";

import { Flow } from "@nicotordev/flowcl-pagos";

import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "flow" });

let flowClient: Flow | null = null;

export function getAppBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "");

  if (fromEnv) {
    return fromEnv;
  }

  return "http://localhost:3000";
}

export function getFlowClient(): Flow {
  if (flowClient) {
    return flowClient;
  }

  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  const environment =
    process.env.FLOW_ENVIRONMENT === "production" ? "production" : "sandbox";

  if (!apiKey || !secretKey) {
    throw new Error(
      "Flow no está configurado. Define FLOW_API_KEY y FLOW_SECRET_KEY.",
    );
  }

  flowClient = new Flow(apiKey, secretKey, environment, {
    logging: true,
    logger: {
      error(event) {
        log.error(
          {
            endpoint: event.endpoint,
            method: event.method,
            statusCode: event.statusCode,
            flowCode: event.flowCode,
          },
          event.message,
        );
      },
    },
  });

  return flowClient;
}

export function isFlowConfigured(): boolean {
  return Boolean(process.env.FLOW_API_KEY && process.env.FLOW_SECRET_KEY);
}
