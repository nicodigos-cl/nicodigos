import type { ServerWebSocket } from "bun";
import Redis from "ioredis";

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

type SocketData = {
  claims: SupportWsTicketClaims;
  threads: Set<string>;
};

const port = Number(process.env.PORT) || 3011;
const redisUrl = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";

const sockets = new Set<ServerWebSocket<SocketData>>();

function send(ws: ServerWebSocket<SocketData>, message: SupportWsServerMessage) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function fanOut(event: SupportLiveEvent) {
  for (const ws of sockets) {
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
  console.error("[support-ws] redis subscriber error", error.message);
});

publisher.on("error", (error) => {
  console.error("[support-ws] redis publisher error", error.message);
});

await subscriber.subscribe(SUPPORT_EVENTS_CHANNEL);
subscriber.on("message", (_channel, raw) => {
  try {
    const event = JSON.parse(raw) as SupportLiveEvent;
    if (!event?.type || !event.threadId) return;
    fanOut(event);
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
        service: "support-ws",
        sockets: sockets.size,
      });
    }

    if (url.pathname === "/ws" || url.pathname === "/") {
      const ticket = url.searchParams.get("ticket");
      if (!ticket) {
        return new Response("Missing ticket", { status: 401 });
      }

      const claims = verifySupportWsTicket(ticket);
      if (!claims) {
        return new Response("Invalid ticket", { status: 401 });
      }

      const upgraded = serverRef.upgrade(req, {
        data: {
          claims,
          threads: new Set<string>(),
        },
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
      send(ws, {
        type: "ready",
        role: ws.data.claims.role,
        userId: ws.data.claims.userId,
      });
    },
    async message(ws, message) {
      let parsed: SupportWsClientMessage;
      try {
        parsed = JSON.parse(String(message)) as SupportWsClientMessage;
      } catch {
        send(ws, { type: "error", message: "JSON inválido" });
        return;
      }

      if (parsed.type === "ping") {
        send(ws, { type: "pong" });
        return;
      }

      if (parsed.type === "thread.subscribe") {
        if (!parsed.threadId) {
          send(ws, { type: "error", message: "threadId requerido" });
          return;
        }
        ws.data.threads.add(parsed.threadId);
        send(ws, { type: "subscribed", threadId: parsed.threadId });
        return;
      }

      if (parsed.type === "thread.unsubscribe") {
        ws.data.threads.delete(parsed.threadId);
        send(ws, { type: "unsubscribed", threadId: parsed.threadId });
        return;
      }

      if (parsed.type === "typing" || parsed.type === "presence") {
        if (!parsed.threadId || !ws.data.threads.has(parsed.threadId)) {
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

console.log(
  `[support-ws] listening on http://localhost:${server.port} (ws /ws)`,
);

async function shutdown() {
  console.log("[support-ws] shutting down");
  subscriber.disconnect();
  publisher.disconnect();
  server.stop(true);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
