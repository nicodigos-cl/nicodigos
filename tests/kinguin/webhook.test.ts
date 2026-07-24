import { describe, expect, test } from "bun:test";

import {
  normalizeKinguinWebhookEventName,
  parseKinguinOrderStatusPayload,
  parseKinguinProductUpdatePayload,
  parseKinguinWebhookBody,
} from "@/lib/kinguin/webhook";

describe("kinguin webhook parsers", () => {
  test("normalizes event names and probes", () => {
    expect(normalizeKinguinWebhookEventName(null)).toBe("probe");
    expect(normalizeKinguinWebhookEventName("")).toBe("probe");
    expect(normalizeKinguinWebhookEventName("product.update")).toBe(
      "product.update",
    );
    expect(normalizeKinguinWebhookEventName("order.status")).toBe(
      "order.status",
    );
    expect(normalizeKinguinWebhookEventName("order.complete")).toBe(
      "order.complete",
    );
    expect(normalizeKinguinWebhookEventName("unknown.event")).toBeNull();
  });

  test("parses empty body as probe payload", () => {
    expect(parseKinguinWebhookBody("")).toBeNull();
    expect(parseKinguinWebhookBody("   ")).toBeNull();
    expect(parseKinguinWebhookBody("{")).toBeNull();
  });

  test("parses order.status payload", () => {
    const payload = parseKinguinOrderStatusPayload(
      {
        orderId: "PHS84FJAG5U",
        orderExternalId: "AL2FEEHOO2OHF",
        status: "canceled",
        updatedAt: "2020-10-16T11:24:08.025+00:00",
      },
      "order.status",
    );
    expect(payload).toEqual({
      orderId: "PHS84FJAG5U",
      orderExternalId: "AL2FEEHOO2OHF",
      status: "canceled",
      updatedAt: "2020-10-16T11:24:08.025+00:00",
    });
  });

  test("order.complete defaults status to completed", () => {
    const payload = parseKinguinOrderStatusPayload(
      { orderId: "PHS84FJAG5U" },
      "order.complete",
    );
    expect(payload?.status).toBe("completed");
  });

  test("parses product.update payload", () => {
    const payload = parseKinguinProductUpdatePayload({
      kinguinId: 1949,
      productId: "5c9b5f6b2539a4e8f172916a",
      qty: 845,
      textQty: 845,
      cheapestOfferId: ["611222acff9ca40001f0b020"],
      updatedAt: "2020-10-16T11:24:08.015+00:00",
    });
    expect(payload?.kinguinId).toBe(1949);
    expect(payload?.qty).toBe(845);
    expect(payload?.cheapestOfferId).toEqual(["611222acff9ca40001f0b020"]);
  });
});
