import { LOW_STOCK_THRESHOLD } from "@/lib/dashboard/constants";

export type AdminDashboardAlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type AdminDashboardAlert =
  | {
      type: "PAID_ORDER_WITHOUT_DELIVERY";
      severity: "critical";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "FAILED_DELIVERIES";
      severity: "high";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "STALE_PENDING_DELIVERIES";
      severity: "high";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "TRANSACTIONS_REQUIRING_REVIEW";
      severity: "high";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "FAILED_PAYMENTS";
      severity: "medium";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "LOW_KEY_STOCK";
      severity: "high";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "ACTIVE_PRODUCTS_WITHOUT_STOCK";
      severity: "critical";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "FAILED_SMM_DELIVERIES";
      severity: "high";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "PENDING_REFUNDS";
      severity: "medium";
      count: number;
      href: string;
      title: string;
      description: string;
    }
  | {
      type: "APPROVED_PAYMENT_PENDING_ORDER";
      severity: "critical";
      count: number;
      href: string;
      title: string;
      description: string;
    };

export type AlertCounts = {
  paidWithoutDelivery: number;
  failedDeliveries: number;
  stalePendingDeliveries: number;
  requiresReview: number;
  failedPayments: number;
  lowKeyStock: number;
  activeWithoutStock: number;
  failedSmm: number;
  pendingRefunds: number;
  approvedPaymentPendingOrder: number;
};

export function buildDashboardAlerts(counts: AlertCounts): AdminDashboardAlert[] {
  const alerts: AdminDashboardAlert[] = [];

  if (counts.paidWithoutDelivery > 0) {
    alerts.push({
      type: "PAID_ORDER_WITHOUT_DELIVERY",
      severity: "critical",
      count: counts.paidWithoutDelivery,
      href: "/admin/orders?status=PAID",
      title: `${counts.paidWithoutDelivery} pedidos pagados sin entrega`,
      description:
        "El pago fue aprobado, pero el fulfillment no se inició para todos los ítems.",
    });
  }

  if (counts.approvedPaymentPendingOrder > 0) {
    alerts.push({
      type: "APPROVED_PAYMENT_PENDING_ORDER",
      severity: "critical",
      count: counts.approvedPaymentPendingOrder,
      href: "/admin/transactions?inconsistentPaidOrder=true",
      title: `${counts.approvedPaymentPendingOrder} pagos aprobados con pedido pendiente`,
      description:
        "Hay transacciones exitosas cuyo pedido todavía figura como pendiente.",
    });
  }

  if (counts.failedDeliveries > 0) {
    alerts.push({
      type: "FAILED_DELIVERIES",
      severity: "high",
      count: counts.failedDeliveries,
      href: "/admin/deliveries?status=FAILED",
      title: `${counts.failedDeliveries} entregas fallidas`,
      description: "Requieren revisión manual o reintento del proveedor.",
    });
  }

  if (counts.failedSmm > 0) {
    alerts.push({
      type: "FAILED_SMM_DELIVERIES",
      severity: "high",
      count: counts.failedSmm,
      href: "/admin/deliveries?status=FAILED&method=SMM",
      title: `${counts.failedSmm} servicios SMM con error`,
      description: "Pedidos SMM rechazados o atascados en el proveedor.",
    });
  }

  if (counts.stalePendingDeliveries > 0) {
    alerts.push({
      type: "STALE_PENDING_DELIVERIES",
      severity: "high",
      count: counts.stalePendingDeliveries,
      href: "/admin/deliveries?status=PENDING",
      title: `${counts.stalePendingDeliveries} entregas pendientes antiguas`,
      description: "Llevan más de 24 horas sin completarse.",
    });
  }

  if (counts.requiresReview > 0) {
    alerts.push({
      type: "TRANSACTIONS_REQUIRING_REVIEW",
      severity: "high",
      count: counts.requiresReview,
      href: "/admin/transactions?requiresReview=true",
      title: `${counts.requiresReview} transacciones por conciliar`,
      description: "Marcadas para revisión administrativa.",
    });
  }

  if (counts.activeWithoutStock > 0) {
    alerts.push({
      type: "ACTIVE_PRODUCTS_WITHOUT_STOCK",
      severity: "critical",
      count: counts.activeWithoutStock,
      href: "/admin/products?status=ACTIVE",
      title: `${counts.activeWithoutStock} productos activos sin stock`,
      description: "Publicados sin keys disponibles ni cantidad vendible.",
    });
  }

  if (counts.lowKeyStock > 0) {
    alerts.push({
      type: "LOW_KEY_STOCK",
      severity: "high",
      count: counts.lowKeyStock,
      href: "/admin/products",
      title: `${counts.lowKeyStock} productos con bajo stock de keys`,
      description: `Menos de ${LOW_STOCK_THRESHOLD} keys disponibles en productos manuales activos.`,
    });
  }

  if (counts.failedPayments > 0) {
    alerts.push({
      type: "FAILED_PAYMENTS",
      severity: "medium",
      count: counts.failedPayments,
      href: "/admin/transactions?status=FAILED",
      title: `${counts.failedPayments} pagos fallidos recientes`,
      description: "Intentos rechazados o fallidos en las últimas 24 horas.",
    });
  }

  if (counts.pendingRefunds > 0) {
    alerts.push({
      type: "PENDING_REFUNDS",
      severity: "medium",
      count: counts.pendingRefunds,
      href: "/admin/transactions?refunded=true",
      title: `${counts.pendingRefunds} reembolsos pendientes`,
      description: "Solicitudes de reembolso aún no confirmadas por el proveedor.",
    });
  }

  const severityRank: Record<AdminDashboardAlertSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return alerts.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
}
