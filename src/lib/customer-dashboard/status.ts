import type {
  DeliveryMethod,
  DeliveryStatus,
} from "@/lib/validations/deliveries";
import type { OrderStatus, PaymentStatus } from "@/lib/validations/orders";

import type {
  CustomerDeliveryStatusView,
  CustomerOrderPrimaryAction,
  CustomerOrderStatusView,
  CustomerPaymentStatusView,
  CustomerSmmStatusView,
} from "@/lib/customer-dashboard/types";

export { toneToBadgeClass } from "@/lib/customer-dashboard/status-tone";
export type { CustomerStatusTone } from "@/lib/customer-dashboard/status-tone";

export function getCustomerOrderStatusView(
  status: OrderStatus,
): CustomerOrderStatusView {
  switch (status) {
    case "PENDING":
      return {
        label: "Esperando pago",
        description: "Completa el pago para continuar con tu pedido.",
        tone: "warning",
      };
    case "PAID":
      return {
        label: "Pago confirmado",
        description: "Recibimos tu pago y estamos preparando la entrega.",
        tone: "success",
      };
    case "PROCESSING":
      return {
        label: "Preparando entrega",
        description: "Estamos procesando los productos de tu pedido.",
        tone: "info",
      };
    case "FULFILLED":
      return {
        label: "Completado",
        description: "Tu pedido fue entregado.",
        tone: "success",
      };
    case "PARTIALLY_FULFILLED":
      return {
        label: "Entrega parcial",
        description: "Parte de tu pedido ya está disponible.",
        tone: "info",
      };
    case "CANCELED":
      return {
        label: "Cancelado",
        description: "Este pedido fue cancelado.",
        tone: "neutral",
      };
    case "REFUNDED":
      return {
        label: "Reembolsado",
        description: "El monto de este pedido fue reembolsado.",
        tone: "neutral",
      };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function getCustomerPaymentStatusView(
  status: PaymentStatus,
): CustomerPaymentStatusView {
  switch (status) {
    case "PENDING":
      return {
        label: "Pendiente",
        description: "Aún no recibimos la confirmación del pago.",
        tone: "warning",
      };
    case "PROCESSING":
      return {
        label: "Pago en revisión",
        description: "Estamos confirmando tu pago con el medio de pago.",
        tone: "info",
      };
    case "PAID":
      return {
        label: "Aprobada",
        description: "Tu pago fue confirmado.",
        tone: "success",
      };
    case "FAILED":
      return {
        label: "Rechazada",
        description: "El pago no se pudo completar. Puedes intentarlo de nuevo.",
        tone: "danger",
      };
    case "REJECTED":
      return {
        label: "Rechazada",
        description: "El pago fue rechazado. Revisa o intenta nuevamente.",
        tone: "danger",
      };
    case "CANCELLED":
      return {
        label: "Cancelada",
        description: "Esta transacción fue cancelada.",
        tone: "neutral",
      };
    case "EXPIRED":
      return {
        label: "Expirada",
        description: "El intento de pago expiró. Puedes generar uno nuevo.",
        tone: "warning",
      };
    case "PARTIALLY_REFUNDED":
      return {
        label: "Reembolso parcial",
        description: "Se reembolsó una parte del monto.",
        tone: "info",
      };
    case "REFUNDED":
      return {
        label: "Reembolsada",
        description: "El pago fue reembolsado por completo.",
        tone: "neutral",
      };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function getCustomerDeliveryStatusView(
  status: DeliveryStatus,
): CustomerDeliveryStatusView {
  switch (status) {
    case "PENDING":
      return {
        label: "En preparación",
        description: "Todavía estamos preparando esta entrega.",
        tone: "warning",
      };
    case "PROCESSING":
      return {
        label: "En proceso",
        description: "Tu entrega está en curso.",
        tone: "info",
      };
    case "DELIVERED":
      return {
        label: "Entrega disponible",
        description: "Ya puedes revisar el contenido de tu compra.",
        tone: "success",
      };
    case "FAILED":
      return {
        label: "Requiere revisión",
        description: "Hubo un problema. Nuestro equipo lo está revisando.",
        tone: "danger",
      };
    case "CANCELED":
      return {
        label: "Cancelada",
        description: "Esta entrega fue cancelada.",
        tone: "neutral",
      };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function getCustomerDeliveryMethodLabel(method: DeliveryMethod): string {
  switch (method) {
    case "SMM":
      return "Servicio SMM";
    case "KINGUIN":
      return "Key";
    case "MANUAL":
      return "Entrega manual";
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
}

export function getCustomerPaymentMethodLabel(
  provider: string | null | undefined,
  paymentMethod: string | null | undefined,
): string {
  if (paymentMethod && paymentMethod.trim().length > 0) {
    return paymentMethod;
  }
  switch (provider) {
    case "FLOW":
      return "Flow";
    case "MANUAL":
      return "Manual";
    case "OTHER":
      return "Otro";
    default:
      return "Pago";
  }
}

export function getCustomerSmmStatusView(input: {
  status: DeliveryStatus;
  hasTarget: boolean;
  externalStatus: string | null;
  remains: number | null;
  quantity: number | null;
}): CustomerSmmStatusView {
  if (input.status === "FAILED") {
    return {
      label: "Requiere revisión",
      description:
        "No pudimos completar automáticamente este servicio. Nuestro equipo lo está revisando.",
      tone: "danger",
    };
  }
  if (input.status === "CANCELED") {
    return {
      label: "Cancelado",
      description: "Este servicio fue cancelado.",
      tone: "neutral",
    };
  }
  if (!input.hasTarget) {
    return {
      label: "Esperando envío",
      description: "Necesitamos el enlace o destino para iniciar el servicio.",
      tone: "warning",
    };
  }
  if (input.status === "DELIVERED") {
    if (
      input.quantity != null &&
      input.remains != null &&
      input.remains > 0 &&
      input.remains < input.quantity
    ) {
      return {
        label: "Parcialmente completado",
        description: "El servicio avanzó, pero aún queda cantidad pendiente.",
        tone: "info",
      };
    }
    return {
      label: "Completado",
      description: "El servicio finalizó correctamente.",
      tone: "success",
    };
  }
  if (input.status === "PROCESSING" || input.externalStatus) {
    return {
      label: "En progreso",
      description: "El servicio está en curso.",
      tone: "info",
    };
  }
  return {
    label: "Enviado al proveedor",
    description: "Recibimos tu destino y estamos iniciando el servicio.",
    tone: "info",
  };
}

export function computeSmmProgressPercent(input: {
  quantity: number | null;
  remains: number | null;
}): number | null {
  if (input.quantity == null || input.quantity <= 0 || input.remains == null) {
    return null;
  }
  const delivered = input.quantity - input.remains;
  return Math.min(100, Math.max(0, (delivered / input.quantity) * 100));
}

export function resolveOrderPrimaryAction(input: {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus | null;
  availableDeliveryId: string | null;
  needsSmmTargetDeliveryId: string | null;
  hasFailedDelivery: boolean;
}): CustomerOrderPrimaryAction {
  const orderHref = `/dashboard/orders/${input.orderId}`;

  if (
    input.orderStatus === "PENDING" ||
    input.paymentStatus === "PENDING" ||
    input.paymentStatus === "EXPIRED" ||
    input.paymentStatus === "FAILED" ||
    input.paymentStatus === "REJECTED"
  ) {
    return {
      type: "PAY",
      label:
        input.paymentStatus === "FAILED" ||
        input.paymentStatus === "REJECTED" ||
        input.paymentStatus === "EXPIRED"
          ? "Reintentar pago"
          : "Pagar ahora",
      href: `/checkout?orderId=${input.orderId}`,
    };
  }

  if (input.paymentStatus === "PROCESSING") {
    return {
      type: "REVIEW_PAYMENT",
      label: "Revisar pago",
      href: orderHref,
    };
  }

  if (input.needsSmmTargetDeliveryId) {
    return {
      type: "COMPLETE_INFO",
      label: "Completar información",
      href: `/dashboard/deliveries/${input.needsSmmTargetDeliveryId}`,
    };
  }

  if (input.availableDeliveryId) {
    return {
      type: "VIEW_DELIVERY",
      label: "Ver entrega",
      href: `/dashboard/deliveries/${input.availableDeliveryId}`,
    };
  }

  if (input.hasFailedDelivery) {
    return {
      type: "CONTACT_SUPPORT",
      label: "Contactar soporte",
      href: `/dashboard/support?orderId=${input.orderId}`,
    };
  }

  return {
    type: "VIEW_ORDER",
    label: "Ver pedido",
    href: orderHref,
  };
}
