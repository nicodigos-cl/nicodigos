import { describe, expect, test } from "bun:test";

import { IMAGE_MIME_TYPES, MAX_IMAGE_SIZE } from "@/lib/uploads/image";

describe("kinguin image mirror constraints", () => {
  test("accepted image mime types cover common CDN outputs", () => {
    expect(IMAGE_MIME_TYPES).toContain("image/jpeg");
    expect(IMAGE_MIME_TYPES).toContain("image/png");
    expect(IMAGE_MIME_TYPES).toContain("image/webp");
  });

  test("max image size is 5MB", () => {
    expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
  });
});
