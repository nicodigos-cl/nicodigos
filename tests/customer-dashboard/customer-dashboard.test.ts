import { describe, expect, test } from "bun:test";

import { buildCustomerDashboardAlerts } from "@/lib/customer-dashboard/alerts";
import { formatCustomerOrderNumber } from "@/lib/customer-dashboard/format";
import {
  computeSmmProgressPercent,
  getCustomerOrderStatusView,
  getCustomerPaymentStatusView,
  getCustomerSmmStatusView,
  resolveOrderPrimaryAction,
} from "@/lib/customer-dashboard/status";
import {
  customerOrdersListQuerySchema,
  submitSmmTargetSchema,
  updateCustomerBillingSchema,
} from "@/lib/customer-dashboard/validations";

describe("customer dashboard status mapping", () => {
  test("maps order statuses to friendly labels", () => {
    expect(getCustomerOrderStatusView("PENDING").label).toBe("Esperando pago");
    expect(getCustomerOrderStatusView("FULFILLED").tone).toBe("success");
    expect(getCustomerPaymentStatusView("PAID").label).toBe("Aprobada");
    expect(getCustomerPaymentStatusView("REJECTED").tone).toBe("danger");
  });

  test("does not invent technical labels", () => {
    const view = getCustomerOrderStatusView("PROCESSING");
    expect(view.label).not.toContain("PROCESSING");
    expect(view.description.length).toBeGreaterThan(0);
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
  });
});

describe("customer dashboard validations", () => {
  test("parses order list query", () => {
    const parsed = customerOrdersListQuerySchema.parse({
      page: "2",
      q: "  NC-123  ",
      status: "PENDING",
    });
    expect(parsed.page).toBe(2);
    expect(parsed.q).toBe("NC-123");
    expect(parsed.status).toBe("PENDING");
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
});

describe("customer order number", () => {
  test("formats stable customer-facing order number", () => {
    const value = formatCustomerOrderNumber("clabcdefghijklmnop");
    expect(value.startsWith("#NC-")).toBeTrue();
    expect(value).not.toContain("clabcdefghijklmnop");
  });
});
