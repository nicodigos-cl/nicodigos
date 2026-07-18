import { describe, expect, test } from "bun:test";

import { buildCustomerDashboardAlerts } from "@/lib/customer-dashboard/alerts";
import { deriveCustomerOrderDeliverySummary } from "@/lib/customer-dashboard/delivery-summary";
import {
  formatCustomerOrderNumber,
  parseOrderSearchToken,
} from "@/lib/customer-dashboard/format";
import {
  buildCustomerOrdersOrderBy,
  buildCustomerOrdersWhere,
} from "@/lib/customer-dashboard/order-filters";
import { deriveCustomerPaymentSummary } from "@/lib/customer-dashboard/payment-summary";
import { customerOrderPath } from "@/lib/customer-dashboard/paths";
import {
  computeSmmProgressPercent,
  getCustomerDeliveryMethodLabel,
  getCustomerOrderStatusView,
  getCustomerPaymentMethodLabel,
  getCustomerPaymentStatusView,
  getCustomerSmmStatusView,
  resolveOrderPrimaryAction,
} from "@/lib/customer-dashboard/status";
import {
  changeCustomerPasswordSchema,
  customerOrdersListQuerySchema,
  revokeAllOtherSessionsSchema,
  submitSmmTargetSchema,
  updateCustomerBillingSchema,
} from "@/lib/customer-dashboard/validations";

describe("customer dashboard status mapping", () => {
  test("maps order statuses to friendly labels", () => {
    expect(getCustomerOrderStatusView("PENDING").label).toBe("Esperando pago");
    expect(getCustomerOrderStatusView("FULFILLED").tone).toBe("success");
    expect(getCustomerPaymentStatusView("PAID").label).toBe("Pago confirmado");
    expect(getCustomerPaymentStatusView("REJECTED").tone).toBe("danger");
  });

  test("does not invent technical labels", () => {
    const view = getCustomerOrderStatusView("PROCESSING");
    expect(view.label).not.toContain("PROCESSING");
    expect(view.description.length).toBeGreaterThan(0);
  });

  test("maps delivery methods without exposing Kinguin", () => {
    expect(getCustomerDeliveryMethodLabel("KINGUIN")).toBe("Key digital");
    expect(getCustomerDeliveryMethodLabel("MANUAL")).toBe("Entrega digital");
    expect(getCustomerPaymentMethodLabel("FLOW", null)).toBe("Pago online");
  });

  test("computes SMM progress from remains", () => {
    expect(
      computeSmmProgressPercent({ quantity: 1000, remains: 250 }),
    ).toBe(75);
    expect(computeSmmProgressPercent({ quantity: 0, remains: 0 })).toBeNull();
    expect(
      computeSmmProgressPercent({ quantity: 100, remains: null }),
    ).toBeNull();
  });

  test("SMM failed status hides provider errors", () => {
    const view = getCustomerSmmStatusView({
      status: "FAILED",
      hasTarget: true,
      externalStatus: "error_105",
      remains: 10,
      quantity: 100,
    });
    expect(view.label).toBe("Requiere revisión");
    expect(view.description).not.toContain("error_105");
  });

  test("primary action prefers payment when pending", () => {
    const action = resolveOrderPrimaryAction({
      orderId: "order1",
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      availableDeliveryId: "del1",
      needsSmmTargetDeliveryId: "del2",
      hasFailedDelivery: true,
    });
    expect(action.type).toBe("PAY");
    if (action.type === "PAY") {
      expect(action.href).toContain("/checkout");
    }
  });

  test("primary action links to pedidos path for view", () => {
    const action = resolveOrderPrimaryAction({
      orderId: "clorderid000000000000001",
      orderStatus: "FULFILLED",
      paymentStatus: "PAID",
      availableDeliveryId: null,
      needsSmmTargetDeliveryId: null,
      hasFailedDelivery: false,
    });
    expect(action.type).toBe("VIEW");
    if (action.type === "VIEW") {
      expect(action.href).toBe(
        customerOrderPath("clorderid000000000000001"),
      );
    }
  });
});

describe("customer payment summary", () => {
  test("prioritizes approved payment over later failed attempts", () => {
    const summary = deriveCustomerPaymentSummary([
      {
        id: "p2",
        status: "FAILED",
        amount: "1000",
        currency: "CLP",
        provider: "FLOW",
        paymentMethod: null,
        paidAt: null,
        createdAt: "2026-07-18T12:00:00.000Z",
        updatedAt: "2026-07-18T12:00:00.000Z",
      },
      {
        id: "p1",
        status: "PAID",
        amount: "1000",
        currency: "CLP",
        provider: "FLOW",
        paymentMethod: null,
        paidAt: "2026-07-17T12:00:00.000Z",
        createdAt: "2026-07-17T12:00:00.000Z",
        updatedAt: "2026-07-17T12:00:00.000Z",
      },
    ]);
    expect(summary.hasApprovedPayment).toBeTrue();
    expect(summary.canPay).toBeFalse();
    expect(summary.canRetry).toBeFalse();
    expect(summary.status).toBe("PAID");
  });

  test("allows retry when only failed attempts exist", () => {
    const summary = deriveCustomerPaymentSummary([
      {
        id: "p1",
        status: "FAILED",
        amount: "1000",
        currency: "CLP",
        provider: "FLOW",
        paymentMethod: null,
        paidAt: null,
        createdAt: "2026-07-18T12:00:00.000Z",
        updatedAt: "2026-07-18T12:00:00.000Z",
      },
    ]);
    expect(summary.canRetry).toBeTrue();
    expect(summary.label).toBe("Pago fallido");
  });
});

describe("customer delivery summary", () => {
  test("groups queued work as processing and manual review as a problem", () => {
    const summary = deriveCustomerOrderDeliverySummary({
      totalItems: 2,
      deliveries: [
        { id: "queued", status: "QUEUED" },
        { id: "review", status: "MANUAL_REVIEW" },
      ],
    });
    expect(summary.processingCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.failedDeliveryId).toBe("review");
  });

  test("summarizes partial deliveries", () => {
    const summary = deriveCustomerOrderDeliverySummary({
      totalItems: 3,
      deliveries: [
        { id: "d1", status: "DELIVERED" },
        { id: "d2", status: "PROCESSING" },
        { id: "d3", status: "PENDING" },
      ],
    });
    expect(summary.deliveredCount).toBe(1);
    expect(summary.label).toContain("1 de 3");
    expect(summary.tone).toBe("info");
  });

  test("flags failed deliveries", () => {
    const summary = deriveCustomerOrderDeliverySummary({
      totalItems: 1,
      deliveries: [{ id: "d1", status: "FAILED" }],
    });
    expect(summary.tone).toBe("danger");
    expect(summary.label).toContain("Problema");
  });
});

describe("customer dashboard alerts", () => {
  test("builds actionable customer alerts", () => {
    const alerts = buildCustomerDashboardAlerts({
      orders: [
        {
          id: "clxxxxxxxx00000000000001",
          status: "PENDING",
          paymentStatus: "PENDING",
        },
      ],
      deliveries: [
        {
          id: "del1",
          status: "DELIVERED",
          deliveryMethod: "KINGUIN",
          productName: "Steam Key",
          hasSmmTarget: true,
        },
        {
          id: "del2",
          status: "PENDING",
          deliveryMethod: "SMM",
          productName: "Followers",
          hasSmmTarget: false,
        },
      ],
      profile: {
        emailVerified: false,
        billingIncomplete: true,
      },
    });

    expect(alerts.some((a) => a.type === "PAYMENT_PENDING")).toBeTrue();
    expect(alerts.some((a) => a.type === "SMM_TARGET_REQUIRED")).toBeTrue();
    expect(alerts.some((a) => a.type === "EMAIL_UNVERIFIED")).toBeTrue();
    expect(JSON.stringify(alerts)).not.toContain("PaymentStatus");
    expect(JSON.stringify(alerts)).not.toContain("provider");
    expect(JSON.stringify(alerts)).toContain("/dashboard/pedidos/");
  });
});

describe("customer dashboard validations", () => {
  test("parses order list query with visual filters", () => {
    const parsed = customerOrdersListQuerySchema.parse({
      page: "2",
      q: "  NC-123ABC  ",
      status: "processing",
      payment: "failed",
      delivery: "SMM",
      sort: "amount_desc",
      from: "2026-07-01",
      to: "2026-07-18",
    });
    expect(parsed.page).toBe(2);
    expect(parsed.q).toBe("NC-123ABC");
    expect(parsed.status).toBe("processing");
    expect(parsed.payment).toBe("failed");
    expect(parsed.sort).toBe("amount_desc");
  });

  test("rejects oversized search", () => {
    const result = customerOrdersListQuerySchema.safeParse({
      q: "x".repeat(200),
    });
    expect(result.success).toBeFalse();
  });

  test("rejects invalid SMM target", () => {
    expect(
      submitSmmTargetSchema.safeParse({
        deliveryId: "not-a-cuid",
        link: "notaurl",
      }).success,
    ).toBeFalse();
  });

  test("requires factura fields", () => {
    const result = updateCustomerBillingSchema.safeParse({
      invoiceType: "FACTURA",
      rut: "",
      businessName: "",
      businessActivity: "",
    });
    expect(result.success).toBeFalse();
  });

  test("validates password changes and explicit session revocation", () => {
    expect(
      changeCustomerPasswordSchema.safeParse({
        currentPassword: "current-password",
        newPassword: "new-password",
        confirmPassword: "different-password",
        revokeOtherSessions: true,
      }).success,
    ).toBeFalse();
    expect(revokeAllOtherSessionsSchema.safeParse({ confirm: false }).success).toBeFalse();
    expect(revokeAllOtherSessionsSchema.safeParse({ confirm: true }).success).toBeTrue();
  });
});

describe("customer order filters", () => {
  test("scopes where clause to userId", () => {
    const where = buildCustomerOrdersWhere("user-1", {
      page: 1,
      pageSize: 10,
      sort: "newest",
      status: "processing",
    });
    expect(where.userId).toBe("user-1");
    expect(where.status).toEqual({
      in: ["PROCESSING", "PARTIALLY_FULFILLED"],
    });
  });

  test("orders by amount desc", () => {
    expect(buildCustomerOrdersOrderBy("amount_desc")).toEqual({
      total: "desc",
    });
  });
});

describe("customer order number", () => {
  test("formats stable customer-facing order number", () => {
    const value = formatCustomerOrderNumber("clabcdefghijklmnop");
    expect(value.startsWith("NC-")).toBeTrue();
    expect(value).not.toContain("clabcdefghijklmnop");
  });

  test("parses NC search tokens", () => {
    const token = parseOrderSearchToken("#NC-ABCDEF12");
    expect(token.suffix).toBe("ABCDEF12");
  });
});
