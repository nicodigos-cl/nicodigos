export type UserReviewIssue =
  | {
      type: "MULTIPLE_FAILED_PAYMENTS";
      severity: "medium";
      message: string;
      evidence: string;
    }
  | {
      type: "PAID_ORDER_WITHOUT_DELIVERY";
      severity: "high";
      message: string;
      evidence: string;
    }
  | {
      type: "MULTIPLE_ACTIVE_SESSIONS";
      severity: "low";
      message: string;
      evidence: string;
    }
  | {
      type: "SUSPENDED_WITH_PENDING_ORDER";
      severity: "high";
      message: string;
      evidence: string;
    }
  | {
      type: "UNVERIFIED_WITH_PURCHASE";
      severity: "medium";
      message: string;
      evidence: string;
    }
  | {
      type: "INCOMPLETE_BILLING_WITH_FACTURA";
      severity: "medium";
      message: string;
      evidence: string;
    }
  | {
      type: "INVALID_RUT";
      severity: "low";
      message: string;
      evidence: string;
    }
  | {
      type: "PENDING_REFUNDS";
      severity: "medium";
      message: string;
      evidence: string;
    }
  | {
      type: "MARKED_FOR_REVIEW";
      severity: "high";
      message: string;
      evidence: string;
    };

export type UserReviewInput = {
  accountStatus: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "ANONYMIZED";
  emailVerified: boolean;
  requiresReview: boolean;
  reviewReason: string | null;
  invoiceType: "BOLETA" | "FACTURA";
  rut: string | null;
  rutValid: boolean | null;
  billingComplete: boolean;
  activeSessionCount: number;
  recentFailedPaymentCount: number;
  paidOrdersWithoutDelivery: number;
  pendingOrderCount: number;
  pendingRefundCount: number;
  paidOrderCount: number;
};

export function detectUserReviewIssues(
  input: UserReviewInput,
): UserReviewIssue[] {
  const issues: UserReviewIssue[] = [];

  if (input.requiresReview) {
    issues.push({
      type: "MARKED_FOR_REVIEW",
      severity: "high",
      message: "La cuenta está marcada para revisión administrativa.",
      evidence: input.reviewReason ?? "Sin motivo registrado",
    });
  }

  if (input.recentFailedPaymentCount >= 3) {
    issues.push({
      type: "MULTIPLE_FAILED_PAYMENTS",
      severity: "medium",
      message: "Hay varios intentos de pago fallidos recientes.",
      evidence: `${input.recentFailedPaymentCount} fallos en los últimos 30 días`,
    });
  }

  if (input.paidOrdersWithoutDelivery > 0) {
    issues.push({
      type: "PAID_ORDER_WITHOUT_DELIVERY",
      severity: "high",
      message: "Existen pedidos pagados sin entregas iniciadas.",
      evidence: `${input.paidOrdersWithoutDelivery} pedido(s)`,
    });
  }

  if (input.activeSessionCount >= 5) {
    issues.push({
      type: "MULTIPLE_ACTIVE_SESSIONS",
      severity: "low",
      message: "La cuenta tiene muchas sesiones activas concurrentes.",
      evidence: `${input.activeSessionCount} sesiones vigentes`,
    });
  }

  if (
    (input.accountStatus === "SUSPENDED" ||
      input.accountStatus === "RESTRICTED") &&
    input.pendingOrderCount > 0
  ) {
    issues.push({
      type: "SUSPENDED_WITH_PENDING_ORDER",
      severity: "high",
      message: "La cuenta restringida o bloqueada aún tiene pedidos pendientes.",
      evidence: `${input.pendingOrderCount} pedido(s) pendiente(s)`,
    });
  }

  if (!input.emailVerified && input.paidOrderCount > 0) {
    issues.push({
      type: "UNVERIFIED_WITH_PURCHASE",
      severity: "medium",
      message: "Hay compras con el email sin verificar.",
      evidence: `${input.paidOrderCount} pedido(s) pagado(s)`,
    });
  }

  if (input.invoiceType === "FACTURA" && !input.billingComplete) {
    issues.push({
      type: "INCOMPLETE_BILLING_WITH_FACTURA",
      severity: "medium",
      message: "Prefiere factura pero le faltan datos de facturación.",
      evidence: "Razón social, giro o RUT incompletos",
    });
  }

  if (input.rut && input.rutValid === false) {
    issues.push({
      type: "INVALID_RUT",
      severity: "low",
      message: "El RUT almacenado no supera la validación de dígito verificador.",
      evidence: input.rut,
    });
  }

  if (input.pendingRefundCount > 0) {
    issues.push({
      type: "PENDING_REFUNDS",
      severity: "medium",
      message: "Hay reembolsos pendientes de resolución.",
      evidence: `${input.pendingRefundCount} reembolso(s)`,
    });
  }

  return issues;
}
