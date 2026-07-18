import { describe, expect, test } from "bun:test";
import { buildTransactionsCsv } from "@/lib/transactions/export";
import { refundTransactionSchema, transactionsListQuerySchema } from "@/lib/validations/transactions";

describe("transaction inputs and export", () => {
  test("parses shareable filters and pagination", () => {
    const result = transactionsListQuerySchema.parse({ page: "2", pageSize: "50", status: "REJECTED", hasError: "true", minAmount: "1000" });
    expect(result).toMatchObject({ page: 2, pageSize: 50, status: "REJECTED", hasError: true, minAmount: 1000 });
  });
  test("rejects refunds without explicit confirmation or with invalid amount", () => {
    expect(refundTransactionSchema.safeParse({ paymentId: "cm12345678901234567890123", amount: 0, reason: "motivo suficientemente largo", confirmation: "SI" }).success).toBeFalse();
  });
  test("exports only the abbreviated provider reference", () => {
    const csv = buildTransactionsCsv([{ id: "payment-id", orderId: "order-id", orderNumber: "ORDER", customerName: null, customerEmail: "buyer@example.com", provider: "FLOW", status: "PAID", type: "PAYMENT", amount: 5000, currency: "CLP", paymentMethod: "Webpay", externalReference: "abc123…7890", flowOrder: 123, createdAt: "2026-07-18T00:00:00.000Z", updatedAt: "2026-07-18T00:00:00.000Z", confirmedAt: null, requiresReview: false, hasError: false, consistencyIssueCount: 0 }]);
    expect(csv).toContain("abc123…7890");
    expect(csv).not.toContain("token");
    expect(csv).not.toContain("secret");
  });
});
