import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "domain-events" });

export type SmmServiceRateChangedEvent = {
  providerId: string;
  providerApiUrl: string;
  remoteServiceId: number;
  oldRate: string;
  newRate: string;
};

export type SmmServiceRemovedEvent = {
  providerId: string;
  providerApiUrl: string;
  remoteServiceIds: number[];
};

export type DomainEventMap = {
  "smm.service.rate_changed": SmmServiceRateChangedEvent;
  "smm.service.removed": SmmServiceRemovedEvent;
};

type Handler<K extends keyof DomainEventMap> = (
  payload: DomainEventMap[K],
) => void | Promise<void>;

type HandlerMap = {
  [K in keyof DomainEventMap]?: Array<Handler<K>>;
};

const handlers: HandlerMap = {};

export function onDomainEvent<K extends keyof DomainEventMap>(
  event: K,
  handler: Handler<K>,
): void {
  const list = (handlers[event] ??= []) as Array<Handler<K>>;
  list.push(handler);
}

export async function emitDomainEvent<K extends keyof DomainEventMap>(
  event: K,
  payload: DomainEventMap[K],
): Promise<void> {
  const list = handlers[event] as Array<Handler<K>> | undefined;
  if (!list?.length) {
    return;
  }

  for (const handler of list) {
    try {
      await handler(payload);
    } catch (error) {
      log.error({ err: error, event, payload }, "domain event handler failed");
    }
  }
}
