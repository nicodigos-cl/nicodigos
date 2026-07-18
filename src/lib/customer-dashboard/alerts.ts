import { formatCustomerOrderNumber } from "@/lib/customer-dashboard/format";
import type { CustomerDashboardAlert } from "@/lib/customer-dashboard/types";
import type {
  DeliveryMethod,
  DeliveryStatus,
} from "@/lib/validations/deliveries";
import type { OrderStatus, PaymentStatus } from "@/lib/validations/orders";

type AlertOrder = {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
};

type AlertDelivery = {
  id: string;
  status: DeliveryStatus;
  deliveryMethod: DeliveryMethod;
  productName: string;
  hasSmmTarget: boolean;
};

type AlertProfile = {
  emailVerified: boolean;
  billingIncomplete: boolean;
};

export function buildCustomerDashboardAlerts(input: {
  orders: AlertOrder[];
  deliveries: AlertDelivery[];
  profile: AlertProfile;
}): CustomerDashboardAlert[] {
  const alerts: CustomerDashboardAlert[] = [];
  const seen = new Set<string>();

  for (const order of input.orders) {
    const number = formatCustomerOrderNumber(order.id);

    if (
      order.status === "PENDING" ||
      order.paymentStatus === "PENDING" ||
      order.paymentStatus === "EXPIRED"
    ) {
      const key = `payment-pending:${order.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({
          type: "PAYMENT_PENDING",
          tone: "warning",
          orderId: order.id,
          title: "Tu pago todavía está pendiente",
          description: `Completa o revisa el pago del pedido ${number}.`,
          href: `/dashboard/orders/${order.id}`,
          actionLabel: "Revisar pedido",
        });
      }
    }

    if (
      order.paymentStatus === "FAILED" ||
      order.paymentStatus === "REJECTED"
    ) {
      const key = `payment-rejected:${order.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({
          type: "PAYMENT_REJECTED",
          tone: "danger",
          orderId: order.id,
          title: "Tuvimos un problema con tu pago",
          description: `El pago del pedido ${number} no se pudo completar.`,
          href: `/checkout?orderId=${order.id}`,
          actionLabel: "Reintentar pago",
        });
      }
    }

    if (
      order.paymentStatus === "PARTIALLY_REFUNDED" ||
      (order.status === "REFUNDED" && order.paymentStatus !== "REFUNDED")
    ) {
      const key = `refund:${order.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({
          type: "REFUND_IN_PROGRESS",
          tone: "info",
          orderId: order.id,
          title: "Reembolso en proceso",
          description: `Estamos procesando un reembolso del pedido ${number}.`,
          href: `/dashboard/orders/${order.id}`,
          actionLabel: "Ver pedido",
        });
      }
    }
  }

  for (const delivery of input.deliveries) {
    if (delivery.status === "DELIVERED") {
      const key = `delivery-available:${delivery.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({
          type: "DELIVERY_AVAILABLE",
          tone: "success",
          deliveryId: delivery.id,
          title: "Tienes una entrega disponible",
          description: `Ya puedes revisar el contenido de ${delivery.productName}.`,
          href: `/dashboard/deliveries/${delivery.id}`,
          actionLabel: "Ver entrega",
        });
      }
    }

    if (
      delivery.deliveryMethod === "SMM" &&
      !delivery.hasSmmTarget &&
      (delivery.status === "PENDING" || delivery.status === "PROCESSING")
    ) {
      const key = `smm-target:${delivery.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({
          type: "SMM_TARGET_REQUIRED",
          tone: "warning",
          deliveryId: delivery.id,
          title: "Necesitamos información para completar tu entrega",
          description: "Agrega el enlace de destino para iniciar tu servicio.",
          href: `/dashboard/deliveries/${delivery.id}`,
          actionLabel: "Completar información",
        });
      }
    }

    if (
      delivery.deliveryMethod === "SMM" &&
      delivery.status === "FAILED"
    ) {
      const key = `smm-failed:${delivery.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({
          type: "SMM_FAILED",
          tone: "danger",
          deliveryId: delivery.id,
          title: "Tu servicio necesita revisión",
          description:
            "No pudimos completar automáticamente este servicio. Nuestro equipo lo está revisando.",
          href: `/dashboard/support?deliveryId=${delivery.id}`,
          actionLabel: "Contactar soporte",
        });
      }
    }

    if (
      delivery.deliveryMethod !== "SMM" &&
      delivery.status === "FAILED"
    ) {
      const key = `delivery-failed:${delivery.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({
          type: "DELIVERY_FAILED",
          tone: "danger",
          deliveryId: delivery.id,
          title: "Hubo un problema con tu entrega",
          description: `Estamos revisando la entrega de ${delivery.productName}.`,
          href: `/dashboard/support?deliveryId=${delivery.id}`,
          actionLabel: "Contactar soporte",
        });
      }
    }
  }

  if (!input.profile.emailVerified) {
    alerts.push({
      type: "EMAIL_UNVERIFIED",
      tone: "warning",
      title: "Verifica tu email",
      description: "Confirma tu correo para recibir avisos de pedidos y entregas.",
      href: "/dashboard/security",
      actionLabel: "Ir a seguridad",
    });
  }

  if (input.profile.billingIncomplete) {
    alerts.push({
      type: "BILLING_INCOMPLETE",
      tone: "info",
      title: "Completa tus datos de facturación",
      description: "Agrega RUT y dirección para agilizar tus próximas compras.",
      href: "/dashboard/profile",
      actionLabel: "Completar perfil",
    });
  }

  const priority: Record<CustomerDashboardAlert["tone"], number> = {
    danger: 0,
    warning: 1,
    info: 2,
    success: 3,
  };

  return alerts
    .sort((a, b) => priority[a.tone] - priority[b.tone])
    .slice(0, 8);
}
