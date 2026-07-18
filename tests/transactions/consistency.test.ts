import { describe, expect, test } from "bun:test";
import { detectTransactionConsistencyIssues } from "@/lib/transactions/consistency";

const consistent = { paymentStatus: "PAID", paymentAmount: 12_000, paymentCurrency: "CLP", orderStatus: "PAID", orderTotal: 12_000, orderCurrency: "CLP", deliveriesCount: 1, approvedPaymentsCount: 1 } as const;
describe("transaction consistency", () => {
  test("accepts a consistent approved transaction", () => expect(detectTransactionConsistencyIssues(consistent)).toEqual([]));
  test("detects amount, currency and fulfillment inconsistencies", () => {
    const issues = detectTransactionConsistencyIssues({ ...consistent, paymentAmount: 10_000, paymentCurrency: "USD", deliveriesCount: 0 });
    expect(issues.map((issue) => issue.type)).toEqual(expect.arrayContaining(["AMOUNT_MISMATCH", "CURRENCY_MISMATCH", "DELIVERY_NOT_STARTED"]));
  });
  test("detects duplicate approvals and repeated confirmation", () => {
    const issues = detectTransactionConsistencyIssues({ ...consistent, approvedPaymentsCount: 2, webhookReceived: true, webhookProcessed: true, processedConfirmations: 2 });
    expect(issues.map((issue) => issue.type)).toEqual(expect.arrayContaining(["MULTIPLE_APPROVED_PAYMENTS", "CONFIRMATION_PROCESSED_MULTIPLE_TIMES"]));
  });
});
