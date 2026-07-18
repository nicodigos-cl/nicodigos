import { describe, expect, test } from "bun:test";

import { detectUserReviewIssues } from "@/lib/users/review";
import { buildUsersCsv } from "@/lib/users/export";
import { usersHref } from "@/lib/users/url";
import { isValidRut, normalizeRut } from "@/lib/validations/rut";
import {
  changeUserRoleSchema,
  suspendUserSchema,
  usersListQuerySchema,
} from "@/lib/validations/users";

describe("admin users validations", () => {
  test("parses shareable filters and pagination", () => {
    const result = usersListQuerySchema.parse({
      page: "2",
      pageSize: "50",
      role: "ADMIN",
      withOrders: "true",
      minSpent: "1000",
      sort: "totalSpent",
    });
    expect(result).toMatchObject({
      page: 2,
      pageSize: 50,
      role: "ADMIN",
      withOrders: true,
      minSpent: 1000,
      sort: "totalSpent",
    });
  });

  test("rejects role change without confirmation", () => {
    expect(
      changeUserRoleSchema.safeParse({
        userId: "user_123",
        role: "ADMIN",
        reason: "motivo suficientemente largo",
        confirmation: "SI",
      }).success,
    ).toBeFalse();
  });

  test("requires explicit suspend confirmation", () => {
    expect(
      suspendUserSchema.safeParse({
        userId: "user_123",
        mode: "SUSPENDED",
        reason: "abuso reiterado de la plataforma",
        confirmation: "OK",
      }).success,
    ).toBeFalse();
    expect(
      suspendUserSchema.safeParse({
        userId: "user_123",
        mode: "SUSPENDED",
        reason: "abuso reiterado de la plataforma",
        confirmation: "SUSPENDER",
      }).success,
    ).toBeTrue();
  });
});

describe("admin users helpers", () => {
  test("builds shareable href without defaults", () => {
    const href = usersHref({
      page: 1,
      pageSize: 20,
      sort: "createdAt",
      order: "desc",
      withOrders: true,
      q: "nico",
    });
    expect(href).toContain("q=nico");
    expect(href).toContain("withOrders=true");
    expect(href).not.toContain("page=");
  });

  test("validates Chilean RUT", () => {
    expect(normalizeRut("12.345.678-5")).toBe("12345678-5");
    expect(isValidRut("11.111.111-1")).toBeTrue();
    expect(isValidRut("12345678-0")).toBeFalse();
  });

  test("detects review signals without labeling fraud", () => {
    const issues = detectUserReviewIssues({
      accountStatus: "SUSPENDED",
      emailVerified: false,
      requiresReview: true,
      reviewReason: "múltiples chargebacks",
      invoiceType: "FACTURA",
      rut: null,
      rutValid: null,
      billingComplete: false,
      activeSessionCount: 6,
      recentFailedPaymentCount: 4,
      paidOrdersWithoutDelivery: 1,
      pendingOrderCount: 2,
      pendingRefundCount: 1,
      paidOrderCount: 3,
    });
    expect(issues.some((issue) => issue.type === "MARKED_FOR_REVIEW")).toBeTrue();
    expect(
      issues.some((issue) => issue.type === "PAID_ORDER_WITHOUT_DELIVERY"),
    ).toBeTrue();
    expect(issues.every((issue) => !issue.message.toLowerCase().includes("fraudulento"))).toBeTrue();
  });

  test("export omits sensitive fields", () => {
    const csv = buildUsersCsv([
      {
        id: "user-1",
        name: "Nico",
        email: "nico@example.com",
        image: null,
        role: "USER",
        accountStatus: "ACTIVE",
        derivedStatus: "ACTIVE",
        emailVerified: true,
        hasPassword: true,
        orderCount: 2,
        totalSpent: 5000,
        currency: "CLP",
        lastActivityAt: "2026-07-18T00:00:00.000Z",
        createdAt: "2026-07-01T00:00:00.000Z",
        requiresReview: false,
        isEnvAdmin: false,
      },
    ]);
    expect(csv).toContain("nico@example.com");
    expect(csv).not.toContain("token");
    expect(csv).not.toContain("password");
    expect(csv).not.toContain("secret");
    expect(csv).not.toContain("session");
  });
});
