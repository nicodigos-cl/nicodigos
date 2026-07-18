import { describe, expect, test } from "bun:test";

import {
  mintSupportWsTicket,
  verifySupportWsTicket,
} from "@/lib/support-live/ticket";

describe("support ws ticket", () => {
  test("mints and verifies a ticket", () => {
    process.env.SUPPORT_WS_SECRET = "test-secret-for-support-ws";
    const { ticket, expiresAt } = mintSupportWsTicket({
      userId: "user_1",
      email: "a@b.c",
      name: "Ada",
      role: "USER",
    });
    expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    const claims = verifySupportWsTicket(ticket);
    expect(claims).toEqual({
      userId: "user_1",
      email: "a@b.c",
      name: "Ada",
      role: "USER",
      exp: expiresAt,
    });
  });

  test("rejects tampered tickets", () => {
    process.env.SUPPORT_WS_SECRET = "test-secret-for-support-ws";
    const { ticket } = mintSupportWsTicket({
      userId: "user_1",
      email: "a@b.c",
      name: "Ada",
      role: "ADMIN",
    });
    expect(verifySupportWsTicket(`${ticket}x`)).toBeNull();
  });
});
