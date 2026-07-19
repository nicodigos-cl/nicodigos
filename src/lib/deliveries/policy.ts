/** Subset of store settings used by delivery policy (keeps this module testable). */
export type DeliveryPolicySettings = {
  storeStatus: "OPEN" | "CLOSED" | "MAINTENANCE" | "READ_ONLY";
  automaticDeliveryEnabled: boolean;
  manualDeliveryEnabled: boolean;
  autoSendAfterPayment: boolean;
  deliveryRetryMax: number;
  deliveryRetryIntervalMinutes: number;
  allowPartialDeliveries: boolean;
  allowEmailResend: boolean;
  requireRecentSessionForCredentials: boolean;
  sensitiveLinkExpirationMinutes: number;
  hideCredentialsByDefault: boolean;
  keysAutoAssign: boolean;
  keysAllowManualReplace: boolean;
  accountsAutoAssign: boolean;
  accountsRequireRecentSession: boolean;
  accountsHideCredentials: boolean;
  accountsAllowReplace: boolean;
  smmAutoSend: boolean;
  smmManualSend: boolean;
  smmMaxRetries: number;
  smmAllowPartials: boolean;
  reauthForCredentialReveal: boolean;
  allowJobsDuringMaintenance: boolean;
  allowOngoingDeliveriesDuringMaintenance: boolean;
};

export type DeliveryMethodKind = "MANUAL" | "SMM" | "KINGUIN";

export type DeliveryPolicyDecision =
  | { action: "request" }
  | { action: "park_manual"; reason: string }
  | { action: "skip"; reason: string };

export type DeliveryRetryOptions = {
  attempts: number;
  backoffDelayMs: number;
};

/** Whether the order is in a paid-enough state to start fulfillment. */
export function isPaidForDelivery(input: {
  orderStatus: string;
  hasPaidPayment: boolean;
}): boolean {
  return (
    ["PAID", "PROCESSING", "FULFILLED", "PARTIALLY_FULFILLED"].includes(
      input.orderStatus,
    ) || input.hasPaidPayment
  );
}

/**
 * Decide what to do with a delivery after payment / ensure.
 *
 * - `request` → enqueue via outbox
 * - `park_manual` → MANUAL_REVIEW (admin must finish)
 * - `skip` → leave alone (unpaid, etc.)
 */
export function decideDeliveryEnsureAction(
  settings: DeliveryPolicySettings,
  method: DeliveryMethodKind,
  isPaid: boolean,
): DeliveryPolicyDecision {
  if (!isPaid) {
    return { action: "skip", reason: "El pedido aún no está pagado." };
  }

  // Always create/park deliveries even when automation master is off —
  // paid orders must not disappear from the admin queue.
  if (!settings.automaticDeliveryEnabled) {
    return {
      action: "park_manual",
      reason:
        "Entregas automáticas desactivadas: completar la entrega manualmente.",
    };
  }

  if (!settings.autoSendAfterPayment) {
    if (method === "MANUAL") {
      return {
        action: "park_manual",
        reason:
          "Envío automático tras el pago desactivado: asignación manual requerida.",
      };
    }
    if (method === "SMM") {
      return {
        action: "park_manual",
        reason:
          "Envío automático tras el pago desactivado: enviar SMM manualmente.",
      };
    }
    return {
      action: "park_manual",
      reason:
        "Envío automático tras el pago desactivado: completar compra Kinguin manualmente.",
    };
  }

  if (method === "MANUAL") {
    if (!settings.manualDeliveryEnabled) {
      return {
        action: "park_manual",
        reason: "Entregas manuales desactivadas en ajustes.",
      };
    }
    if (!settings.keysAutoAssign && !settings.accountsAutoAssign) {
      return {
        action: "park_manual",
        reason:
          "Asignación automática de keys/cuentas desactivada: completar manualmente.",
      };
    }
    return { action: "request" };
  }

  if (method === "SMM") {
    if (!settings.smmAutoSend) {
      return {
        action: "park_manual",
        reason: "Envío automático SMM desactivado: enviar manualmente.",
      };
    }
    return { action: "request" };
  }

  // KINGUIN
  return { action: "request" };
}

/** Worker may auto-fulfill only when policy still allows request. */
export function canWorkerAutoFulfill(
  settings: DeliveryPolicySettings,
  method: DeliveryMethodKind,
): { ok: true } | { ok: false; reason: string } {
  const decision = decideDeliveryEnsureAction(settings, method, true);
  if (decision.action === "request") return { ok: true };
  return {
    ok: false,
    reason:
      decision.action === "park_manual"
        ? decision.reason
        : "La política de entregas no permite fulfillment automático.",
  };
}

export function getDeliveryRetryOptions(
  settings: DeliveryPolicySettings,
  method: DeliveryMethodKind,
): DeliveryRetryOptions {
  const retryMax =
    method === "SMM" ? settings.smmMaxRetries : settings.deliveryRetryMax;
  return {
    attempts: Math.max(1, retryMax + 1),
    backoffDelayMs: Math.max(1, settings.deliveryRetryIntervalMinutes) * 60_000,
  };
}

export function canAdminSendSmm(
  settings: DeliveryPolicySettings,
): { ok: true } | { ok: false; message: string } {
  if (!settings.smmManualSend && !settings.smmAutoSend) {
    return {
      ok: false,
      message:
        "El envío SMM está desactivado en ajustes (activa envío manual o automático SMM).",
    };
  }
  return { ok: true };
}

export function canAdminFulfillKinguin(
  settings: DeliveryPolicySettings,
): { ok: true } | { ok: false; message: string } {
  if (!settings.automaticDeliveryEnabled && !settings.manualDeliveryEnabled) {
    return {
      ok: false,
      message: "Las entregas están desactivadas en ajustes.",
    };
  }
  return { ok: true };
}

export function canCompleteManualDelivery(
  settings: DeliveryPolicySettings,
): { ok: true } | { ok: false; message: string } {
  if (!settings.manualDeliveryEnabled) {
    return {
      ok: false,
      message: "Las entregas manuales están desactivadas en ajustes.",
    };
  }
  return { ok: true };
}

export function canReplaceDeliveryContent(
  settings: DeliveryPolicySettings,
  kind: "keys" | "accounts" | "mixed",
): { ok: true } | { ok: false; message: string } {
  if (kind === "keys" && !settings.keysAllowManualReplace) {
    return {
      ok: false,
      message: "El reemplazo manual de keys está desactivado en ajustes.",
    };
  }
  if (kind === "accounts" && !settings.accountsAllowReplace) {
    return {
      ok: false,
      message: "El reemplazo de cuentas está desactivado en ajustes.",
    };
  }
  if (
    kind === "mixed" &&
    (!settings.keysAllowManualReplace || !settings.accountsAllowReplace)
  ) {
    return {
      ok: false,
      message:
        "El reemplazo de contenido está restringido por los ajustes de keys/cuentas.",
    };
  }
  return { ok: true };
}

export function canResendDeliveryEmail(
  settings: DeliveryPolicySettings,
): { ok: true } | { ok: false; message: string } {
  if (!settings.allowEmailResend) {
    return {
      ok: false,
      message: "El reenvío de emails de entrega está desactivado en ajustes.",
    };
  }
  return { ok: true };
}

export function canRevealDeliverySecrets(
  settings: DeliveryPolicySettings,
  input: {
    kind: "key" | "credential";
    sessionUpdatedAt?: Date | string | null;
    userLastActivityAt?: Date | string | null;
  },
): { ok: true } | { ok: false; message: string } {
  const requireRecent =
    settings.reauthForCredentialReveal ||
    settings.requireRecentSessionForCredentials ||
    (input.kind === "credential" && settings.accountsRequireRecentSession);

  if (!requireRecent) return { ok: true };

  const ref = input.sessionUpdatedAt ?? input.userLastActivityAt ?? null;
  if (!ref) {
    return {
      ok: false,
      message: "Debes volver a iniciar sesión para ver credenciales sensibles.",
    };
  }
  const at = ref instanceof Date ? ref : new Date(ref);
  if (Number.isNaN(at.getTime())) {
    return {
      ok: false,
      message: "Debes volver a iniciar sesión para ver credenciales sensibles.",
    };
  }

  const windowMs =
    Math.max(5, settings.sensitiveLinkExpirationMinutes) * 60_000;
  if (Date.now() - at.getTime() > windowMs) {
    return {
      ok: false,
      message:
        "Tu sesión no es reciente. Vuelve a autenticarte para ver credenciales.",
    };
  }
  return { ok: true };
}

export function isSmmPartialAllowed(
  settings: DeliveryPolicySettings,
  remoteStatus: string,
): boolean {
  const normalized = remoteStatus.toLowerCase();
  if (normalized === "completed") return true;
  if (normalized === "partial") {
    return settings.smmAllowPartials || settings.allowPartialDeliveries;
  }
  return false;
}

export function defaultContentIsSecret(
  settings: DeliveryPolicySettings,
  kind: "key" | "credential",
): boolean {
  if (kind === "credential") {
    return (
      settings.accountsHideCredentials || settings.hideCredentialsByDefault
    );
  }
  return settings.hideCredentialsByDefault;
}

/**
 * Whether background delivery jobs may run (outbox → queue → worker).
 * During MAINTENANCE, both jobs and ongoing deliveries must be allowed.
 */
export function canProcessDeliveryJobs(
  settings: DeliveryPolicySettings,
): { ok: true } | { ok: false; reason: string } {
  if (settings.storeStatus !== "MAINTENANCE") return { ok: true };
  if (!settings.allowJobsDuringMaintenance) {
    return {
      ok: false,
      reason: "Jobs desactivados durante mantenimiento.",
    };
  }
  if (!settings.allowOngoingDeliveriesDuringMaintenance) {
    return {
      ok: false,
      reason: "Entregas en curso pausadas durante mantenimiento.",
    };
  }
  return { ok: true };
}

/** Statuses that may be re-requested for auto fulfillment. */
export function isRequestableDeliveryStatus(status: string): boolean {
  return (
    status === "PENDING" ||
    status === "QUEUED" ||
    status === "FAILED" ||
    status === "MANUAL_REVIEW"
  );
}
