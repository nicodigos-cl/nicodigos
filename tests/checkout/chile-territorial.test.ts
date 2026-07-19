import { describe, expect, test } from "bun:test";

import {
  chileComunaOptions,
  chileRegionCount,
  chileRegionName,
  chileRegionOptions,
  resolveChileComunaCode,
  resolveChileRegionNumber,
} from "@/lib/chile/territorial";

describe("chile territorial helpers", () => {
  test("ships 16 regions", () => {
    expect(chileRegionCount()).toBe(16);
    expect(chileRegionOptions().length).toBe(16);
  });

  test("resolves region from name or roman numeral", () => {
    expect(resolveChileRegionNumber("XIII")).toBe("XIII");
    expect(resolveChileRegionNumber("Región Metropolitana de Santiago")).toBe(
      "XIII",
    );
    expect(resolveChileRegionNumber("Metropolitana")).toBe("XIII");
    expect(chileRegionName("XIII")).toContain("Metropolitana");
  });

  test("resolves commune within region", () => {
    const code = resolveChileComunaCode("XIII", "Santiago");
    expect(code).toBe("13101");
    expect(chileComunaOptions("XIII").some((o) => o.value === code)).toBe(true);
  });

  test("unknown values resolve empty", () => {
    expect(resolveChileRegionNumber("Atlantis")).toBe("");
    expect(resolveChileComunaCode("XIII", "NoExiste")).toBe("");
    expect(chileComunaOptions("")).toEqual([]);
  });
});
