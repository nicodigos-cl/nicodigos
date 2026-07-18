"use client";

import { useEffect, useRef, useState } from "react";

import type {
  SupportLiveEvent,
  SupportWsServerMessage,
} from "@/lib/support-live/events";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

type UseSupportLiveSocketOptions = {
  enabled?: boolean;
  threadId?: string | null;
  onEvent?: (event: SupportLiveEvent) => void;
};

export function useSupportLiveSocket({
  enabled = true,
  threadId,
  onEvent,
}: UseSupportLiveSocketOptions) {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    async function connect() {
      setState("connecting");
      setError(null);

      try {
        const response = await fetch("/api/support/ws-ticket", {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error("No se pudo obtener el ticket de soporte");
        }
        const data = (await response.json()) as {
          ticket: string;
          wsUrl: string;
        };
        if (cancelled) return;

        const url = new URL(data.wsUrl);
        url.searchParams.set("ticket", data.ticket);
        const ws = new WebSocket(url.toString());
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) {
            ws.close();
            return;
          }
          setState("connected");
          if (threadId) {
            ws.send(
              JSON.stringify({ type: "thread.subscribe", threadId }),
            );
            ws.send(
              JSON.stringify({
                type: "presence",
                threadId,
                online: true,
              }),
            );
          }
          pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25_000);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(
              String(event.data),
            ) as SupportWsServerMessage;
            if (
              message.type === "message.new" ||
              message.type === "thread.updated" ||
              message.type === "typing" ||
              message.type === "presence"
            ) {
              onEventRef.current?.(message);
            }
            if (message.type === "error") {
              setError(message.message);
            }
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          setState("error");
          setError("Error de conexión en vivo");
        };

        ws.onclose = () => {
          setState("disconnected");
          if (pingTimer) clearInterval(pingTimer);
          if (!cancelled) {
            reconnectTimer = setTimeout(() => void connect(), 2_500);
          }
        };
      } catch (err) {
        setState("error");
        setError(err instanceof Error ? err.message : "Error de conexión");
        if (!cancelled) {
          reconnectTimer = setTimeout(() => void connect(), 4_000);
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && threadId) {
        ws.send(
          JSON.stringify({ type: "presence", threadId, online: false }),
        );
        ws.send(
          JSON.stringify({ type: "thread.unsubscribe", threadId }),
        );
      }
      ws?.close();
      wsRef.current = null;
    };
  }, [enabled, threadId]);

  function sendTyping() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !threadId) return;
    ws.send(JSON.stringify({ type: "typing", threadId }));
  }

  return { state, error, sendTyping };
}
