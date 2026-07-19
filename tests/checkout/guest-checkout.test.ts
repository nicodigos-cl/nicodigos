import { describe, expect, test } from "bun:test";

import { guestCheckoutOtpSchema } from "@/lib/validations/orders";

describe("guest checkout OTP", () => {
  test("normalizes a valid guest identity", () => {
    const parsed = guestCheckoutOtpSchema.parse({
      email: "  Cliente@Example.com ",
      customerName: "  Cliente Invitado  ",
    });

    expect(parsed).toEqual({
      email: "cliente@example.com",
      customerName: "Cliente Invitado",
    });
  });

  test("requires both a valid email and customer name", () => {
    expect(
      guestCheckoutOtpSchema.safeParse({ email: "incorrecto", customerName: "" })
        .success,
    ).toBe(false);
  });
});
