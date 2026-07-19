export const ORDER_EVENTS_CHANNEL = "orders:events";

export type OrderLivePhase =
  | "AWAITING_PAYMENT"
  | "PAYMENT_CONFIRMED"
  | "PREPARING_DELIVERY"
  | "PROCESSING_PROVIDER"
  | "DELIVERED"
  | "PARTIALLY_DELIVERED"
  | "MANUAL_REVIEW"
  | "ERROR";

export type OrderLiveItemStatus = {
  orderItemId: string;
  productName: string;
  deliveryMethod: string;
  status: string;
  customerMessage: string | null;
  deliveryPromise: string | null;
};

export type OrderLiveSnapshot = {
  orderId: string;
  userId: string;
  phase: OrderLivePhase;
  title: string;
  message: string;
  orderStatus: string;
  paymentStatus: string | null;
  deliveryPromise: string | null;
  hasDelayedPromise: boolean;
  items: OrderLiveItemStatus[];
  updatedAt: string;
};

export type OrderLiveEvent = {
  type: "order.status";
  orderId: string;
  userId: string;
  snapshot: OrderLiveSnapshot;
};

export type OrderWsClientMessage =
  | { type: "order.subscribe"; orderId: string }
  | { type: "order.unsubscribe"; orderId: string }
  | { type: "ping" };

export type OrderWsServerMessage =
  | OrderLiveEvent
  | { type: "ready"; userId: string }
  | { type: "subscribed"; orderId: string }
  | { type: "unsubscribed"; orderId: string }
  | { type: "pong" }
  | { type: "error"; message: string };

export const ORDER_LIVE_PHASE_COPY: Record<
  OrderLivePhase,
  { title: string; message: string }
> = {
  AWAITING_PAYMENT: {
    title: "Esperando pago",
    message: "Completa el pago para que preparemos tu entrega.",
  },
  PAYMENT_CONFIRMED: {
    title: "Pago confirmado",
    message: "Recibimos tu pago. Estamos preparando la entrega.",
  },
  PREPARING_DELIVERY: {
    title: "Preparando entrega",
    message: "Tu pedido está en cola de fulfillment.",
  },
  PROCESSING_PROVIDER: {
    title: "Procesando con el proveedor",
    message: "Estamos gestionando la entrega con el proveedor.",
  },
  DELIVERED: {
    title: "Entrega completada",
    message: "Tu pedido fue entregado. Revisa el detalle en tu cuenta.",
  },
  PARTIALLY_DELIVERED: {
    title: "Entrega parcial",
    message: "Parte de tu pedido ya está listo; el resto sigue en proceso.",
  },
  MANUAL_REVIEW: {
    title: "Procesamiento manual",
    message:
      "Tu pedido requiere procesamiento manual y será entregado próximamente.",
  },
  ERROR: {
    title: "Hubo un problema",
    message:
      "Estamos revisando tu pedido. Te avisaremos cuando esté resuelto.",
  },
};

export const MANUAL_REVIEW_CUSTOMER_MESSAGE =
  "Tu pedido requiere procesamiento manual y será entregado próximamente.";
