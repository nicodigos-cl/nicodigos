import type { ServerWebSocket } from "bun";
import Redis from "ioredis";

import {
  ORDER_EVENTS_CHANNEL,
  type OrderLiveEvent,
  type OrderWsClientMessage,
  type OrderWsServerMessage,
} from "../src/lib/order-live/events";
import {
  verifyOrderWsTicket,
  type OrderWsTicketClaims,
} from "../src/lib/order-live/ticket";
import {
  SUPPORT_EVENTS_CHANNEL,
  type SupportLiveEvent,
  type SupportWsClientMessage,
  type SupportWsServerMessage,
} from "../src/lib/support-live/events";
import {
  verifySupportWsTicket,
  type SupportWsTicketClaims,
} from "../src/lib/support-live/ticket";

type SupportSocketData = {
  kind: "support";
  claims: SupportWsTicketClaims;
  threads: Set<string>;
  lastPongAt: number;
};

type OrderSocketData = {
  kind: "order";
  claims: OrderWsTicketClaims;
  orders: Set<string>;
  lastPongAt: number;
};

type SocketData = SupportSocketData | OrderSocketData;

type ServerMessage =
  | SupportWsServerMessage
  | OrderWsServerMessage;

const port = Number(process.env.PORT) || 3011;
const redisUrl = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
const HEARTBEAT_INTERVAL_MS = 25_000;
const HEARTBEAT_TIMEOUT_MS = 60_000;

const sockets = new Set<ServerWebSocket<SocketData>>();

function send(ws: ServerWebSocket<SocketData>, message: ServerMessage) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function canObserveOrder(claims: OrderWsTicketClaims, orderId: string): boolean {
  if (claims.role === "ADMIN") return true;
  return claims.orderId === orderId;
}

function fanOutSupport(event: SupportLiveEvent) {
  for (const ws of sockets) {
    if (ws.data.kind !== "support") continue;
    const { claims, threads } = ws.data;
    const isAdmin = claims.role === "ADMIN";
    const ownsThread =
      event.userId != null && event.userId === claims.userId;
    const subscribed = threads.has(event.threadId);

    if (event.type === "typing" || event.type === "presence") {
      if (event.actorUserId === claims.userId) continue;
      if (!subscribed) continue;
      if (!isAdmin && !ownsThread) continue;
      send(ws, event);
      continue;
    }

    if (isAdmin) {
      send(ws, event);
      continue;
    }

    if (ownsThread) {
      send(ws, event);
    }
  }
}

function fanOutOrder(event: OrderLiveEvent) {
  for (const ws of sockets) {
    if (ws.data.kind !== "order") continue;
    const { claims, orders } = ws.data;
    if (!orders.has(event.orderId)) continue;
    if (!canObserveOrder(claims, event.orderId)) continue;
    if (claims.role !== "ADMIN" && claims.userId !== event.userId) continue;
    send(ws, event);
  }
}

async function publishTypingOrPresence(
  publisher: Redis,
  event: Extract<SupportLiveEvent, { type: "typing" | "presence" }>,
) {
  await publisher.publish(SUPPORT_EVENTS_CHANNEL, JSON.stringify(event));
}

const subscriber = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

const publisher = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

subscriber.on("error", (error) => {
  console.error("[live-ws] redis subscriber error", error.message);
});

publisher.on("error", (error) => {
  console.error("[live-ws] redis publisher error", error.message);
});

await subscriber.subscribe(SUPPORT_EVENTS_CHANNEL, ORDER_EVENTS_CHANNEL);
subscriber.on("message", (channel, raw) => {
  try {
    if (channel === ORDER_EVENTS_CHANNEL) {
      const event = JSON.parse(raw) as OrderLiveEvent;
      if (!event?.type || !event.orderId) return;
      fanOutOrder(event);
      return;
    }

    const event = JSON.parse(raw) as SupportLiveEvent;
    if (!event?.type || !event.threadId) return;
    fanOutSupport(event);
  } catch {
    // ignore malformed payloads
  }
});

const server = Bun.serve<SocketData>({
  port,
  fetch(req, serverRef) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "live-ws",
        channels: ["support", "orders"],
        sockets: sockets.size,
      });
    }

    if (url.pathname === "/ws" || url.pathname === "/") {
      const ticket = url.searchParams.get("ticket");
      if (!ticket) {
        return new Response("Missing ticket", { status: 401 });
      }

      // Same host (`wss://ws.nicodigos.cl/ws`): ticket shape selects the channel.
      const orderClaims = verifyOrderWsTicket(ticket);
      if (orderClaims) {
        const upgraded = serverRef.upgrade(req, {
          data: {
            kind: "order",
            claims: orderClaims,
            orders: new Set<string>([orderClaims.orderId]),
            lastPongAt: Date.now(),
          } satisfies OrderSocketData,
        });
        if (!upgraded) {
          return new Response("WebSocket upgrade failed", { status: 500 });
        }
        return undefined;
      }

      const supportClaims = verifySupportWsTicket(ticket);
      if (!supportClaims) {
        return new Response("Invalid ticket", { status: 401 });
      }

      const upgraded = serverRef.upgrade(req, {
        data: {
          kind: "support",
          claims: supportClaims,
          threads: new Set<string>(),
          lastPongAt: Date.now(),
        } satisfies SupportSocketData,
      });

      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 500 });
      }
      return undefined;
    }

    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      sockets.add(ws);
      if (ws.data.kind === "order") {
        send(ws, { type: "ready", userId: ws.data.claims.userId });
        send(ws, { type: "subscribed", orderId: ws.data.claims.orderId });
        return;
      }
      send(ws, {
        type: "ready",
        role: ws.data.claims.role,
        userId: ws.data.claims.userId,
      });
    },
    async message(ws, message) {
      let parsed: SupportWsClientMessage | OrderWsClientMessage;
      try {
        parsed = JSON.parse(String(message)) as
          | SupportWsClientMessage
          | OrderWsClientMessage;
      } catch {
        send(ws, { type: "error", message: "JSON inválido" });
        return;
      }

      if (parsed.type === "ping") {
        ws.data.lastPongAt = Date.now();
        send(ws, { type: "pong" });
        return;
      }

      if (ws.data.kind === "order") {
        if (parsed.type === "order.subscribe") {
          if (!canObserveOrder(ws.data.claims, parsed.orderId)) {
            send(ws, { type: "error", message: "Forbidden" });
            return;
          }
          ws.data.orders.add(parsed.orderId);
          send(ws, { type: "subscribed", orderId: parsed.orderId });
          return;
        }
        if (parsed.type === "order.unsubscribe") {
          ws.data.orders.delete(parsed.orderId);
          send(ws, { type: "unsubscribed", orderId: parsed.orderId });
          return;
        }
        send(ws, { type: "error", message: "Evento no soportado" });
        return;
      }

      if (parsed.type === "thread.subscribe") {
        if (!("threadId" in parsed) || !parsed.threadId) {
          send(ws, { type: "error", message: "threadId requerido" });
          return;
        }
        ws.data.threads.add(parsed.threadId);
        send(ws, { type: "subscribed", threadId: parsed.threadId });
        return;
      }

      if (parsed.type === "thread.unsubscribe") {
        if (!("threadId" in parsed)) return;
        ws.data.threads.delete(parsed.threadId);
        send(ws, { type: "unsubscribed", threadId: parsed.threadId });
        return;
      }

      if (parsed.type === "typing" || parsed.type === "presence") {
        if (!("threadId" in parsed) || !parsed.threadId || !ws.data.threads.has(parsed.threadId)) {
          send(ws, {
            type: "error",
            message: "Debes suscribirte al hilo primero",
          });
          return;
        }

        const event: SupportLiveEvent =
          parsed.type === "typing"
            ? {
                type: "typing",
                threadId: parsed.threadId,
                userId:
                  ws.data.claims.role === "USER"
                    ? ws.data.claims.userId
                    : null,
                actorUserId: ws.data.claims.userId,
                actorName: ws.data.claims.name,
                role: ws.data.claims.role,
              }
            : {
                type: "presence",
                threadId: parsed.threadId,
                userId:
                  ws.data.claims.role === "USER"
                    ? ws.data.claims.userId
                    : null,
                actorUserId: ws.data.claims.userId,
                actorName: ws.data.claims.name,
                role: ws.data.claims.role,
                online: parsed.online,
              };

        await publishTypingOrPresence(publisher, event);
        return;
      }

      send(ws, { type: "error", message: "Evento no soportado" });
    },
    close(ws) {
      sockets.delete(ws);
    },
  },
});

setInterval(() => {
  const now = Date.now();
  for (const ws of sockets) {
    if (now - ws.data.lastPongAt > HEARTBEAT_TIMEOUT_MS) {
      ws.close(4000, "heartbeat timeout");
      continue;
    }
    send(ws, { type: "pong" });
  }
}, HEARTBEAT_INTERVAL_MS);

console.log(
  `[live-ws] listening on http://localhost:${server.port} (ws /ws · support + orders)`,
);

async function shutdown() {
  console.log("[live-ws] shutting down");
  subscriber.disconnect();
  publisher.disconnect();
  server.stop(true);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
