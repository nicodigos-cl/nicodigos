import "server-only";

import { Flow } from "@nicotordev/flowcl-pagos";

import {
  getFlowApiKey,
  getFlowEnvironment,
  getFlowSecretKey,
  isFlowConfigured,
} from "@/lib/payments/flow/config";

export { isFlowConfigured };

let flowClient: Flow | null = null;

export function getFlowClient(): Flow {
  if (!isFlowConfigured()) {
    throw new Error("Flow no configurado (FLOW_API_KEY / FLOW_SECRET_KEY).");
  }

  if (!flowClient) {
    flowClient = new Flow(
      getFlowApiKey(),
      getFlowSecretKey(),
      getFlowEnvironment(),
    );
  }

  return flowClient;
}
