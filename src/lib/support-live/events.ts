export const SUPPORT_EVENTS_CHANNEL = "support:events";

export type SupportWsRole = "USER" | "ADMIN";

export type SupportLiveMessagePayload = {
  id: string;
  threadId: string;
  direction: "INBOUND" | "OUTBOUND";
  textContent: string;
  fromName: string | null;
  fromAddress: string | null;
  sentByUserId: string | null;
  createdAt: string;
};

export type SupportLiveThreadPayload = {
  id: string;
  subject: string;
  status: string;
  category: string | null;
  userId: string | null;
  orderId: string | null;
  deliveryId: string | null;
  assignedUserId: string | null;
  assignedEmail: string | null;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  userName: string | null;
  userEmail: string | null;
};

export type SupportLiveEvent =
  | {
      type: "message.new";
      threadId: string;
      userId: string | null;
      message: SupportLiveMessagePayload;
      thread: SupportLiveThreadPayload;
    }
  | {
      type: "thread.updated";
      threadId: string;
      userId: string | null;
      thread: SupportLiveThreadPayload;
    }
  | {
      type: "typing";
      threadId: string;
      userId: string | null;
      actorUserId: string;
      actorName: string;
      role: SupportWsRole;
    }
  | {
      type: "presence";
      threadId: string;
      userId: string | null;
      actorUserId: string;
      actorName: string;
      role: SupportWsRole;
      online: boolean;
    };

export type SupportWsClientMessage =
  | { type: "thread.subscribe"; threadId: string }
  | { type: "thread.unsubscribe"; threadId: string }
  | { type: "typing"; threadId: string }
  | { type: "presence"; threadId: string; online: boolean }
  | { type: "ping" };

export type SupportWsServerMessage =
  | SupportLiveEvent
  | { type: "ready"; role: SupportWsRole; userId: string }
  | { type: "subscribed"; threadId: string }
  | { type: "unsubscribed"; threadId: string }
  | { type: "pong" }
  | { type: "error"; message: string };
