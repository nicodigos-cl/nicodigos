import { describe, expect, test } from "bun:test";

import { evaluateChileCompatibility } from "@/lib/kinguin/chile-compatibility";

describe("evaluateChileCompatibility", () => {
  test("flags Chile when CL is in countryLimitation (excluded list)", () => {
    const result = evaluateChileCompatibility({
      name: "Some Game",
      regionalLimitations: "Region free",
      countryLimitation: ["PR", "CL", "PT"],
    });
    expect(result.compatible).toBe(false);
    expect(result.warning).toMatch(/Chile/i);
  });

  test("allows Region free without CL exclusion", () => {
    const result = evaluateChileCompatibility({
      name: "Counter-Strike: Source",
      regionalLimitations: "Region free",
      countryLimitation: ["PR", "PS", "PT"],
    });
    expect(result.compatible).toBe(true);
    expect(result.warning).toBeNull();
  });

  test("flags EU / Europe regions", () => {
    const result = evaluateChileCompatibility({
      name: "Game EU",
      regionalLimitations: "Europe",
      countryLimitation: [],
    });
    expect(result.compatible).toBe(false);
    expect(result.warning).toMatch(/Europa|Europe|no Chile/i);
  });

  test("allows LATAM", () => {
    const result = evaluateChileCompatibility({
      name: "FIFA 25 LATAM",
      regionalLimitations: "LATAM",
      countryLimitation: [],
    });
    expect(result.compatible).toBe(true);
  });

  test("flags US name tags", () => {
    const result = evaluateChileCompatibility({
      name: "Forza Horizon 5 (US)",
      regionalLimitations: null,
      countryLimitation: [],
    });
    expect(result.compatible).toBe(false);
  });

  test("empty meta without unsafe tags is compatible", () => {
    const result = evaluateChileCompatibility({
      name: "Indie Puzzle Game",
      regionalLimitations: null,
      countryLimitation: [],
    });
    expect(result.compatible).toBe(true);
  });
});
