/**
 * Chile activation compatibility for Kinguin listings.
 *
 * Kinguin `countryLimitation` = excluded ISO country codes (CL blocked if listed).
 * `regionalLimitations` / product name carry region labels (EU, LATAM, Region free…).
 */

export type ChileCompatibilityInput = {
  name?: string | null;
  regionalLimitations?: string | null;
  countryLimitation?: string[] | null;
};

export type ChileCompatibilityResult = {
  /** False when Chile is clearly excluded or region is non-LATAM/ROW/free. */
  compatible: boolean;
  /** Short Spanish warning when not compatible; null when OK. */
  warning: string | null;
  /** Why we decided (for toasts / debugging). */
  reason: string;
};

const CHILE_EXCLUSION_CODES = new Set(["CL", "CHL"]);

const SAFE_REGION_RE =
  /\b(region\s*free|worldwide|global|rest\s+of\s+(the\s+)?world|\brow\b|latam|latin\s*america|south\s*america|chile)\b/i;

const UNSAFE_REGION_RE =
  /\b(europe|\beu\b|emea|united\s+states|\busa?\b|\bna\b|north\s*america|\buk\b|united\s+kingdom|turkey|t[uü]rkiye|russia|cis|japan|china|korea|india|brazil|\bbr\b|argentina|\bar\b|middle\s*east|asia|oceania|australia|new\s*zealand)\b/i;

const UNSAFE_NAME_TAG_RE =
  /(?:^|[\s(\[{_-])(eu|emea|usa?|na|uk|tr|ru|cis|jp|cn|kr|br|ar|in|asia)(?:$|[\s)\]}_-])/i;

const SAFE_NAME_TAG_RE =
  /(?:^|[\s(\[{_-])(latam|row|ww|worldwide|global|region\s*free|chile)(?:$|[\s)\]}_-])/i;

function normalizeCountries(codes: string[] | null | undefined): string[] {
  if (!codes?.length) return [];
  return codes
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0);
}

function chileExcludedByCountryList(codes: string[]): boolean {
  return codes.some(
    (code) =>
      CHILE_EXCLUSION_CODES.has(code) || code === "CHILE" || code === "CHILEAN",
  );
}

/**
 * Evaluate whether a Kinguin (or stored) product is safe to sell for Chile activation.
 */
export function evaluateChileCompatibility(
  input: ChileCompatibilityInput,
): ChileCompatibilityResult {
  const countries = normalizeCountries(input.countryLimitation);
  const region = input.regionalLimitations?.trim() ?? "";
  const name = input.name?.trim() ?? "";

  if (chileExcludedByCountryList(countries)) {
    return {
      compatible: false,
      warning: "No compatible con Chile (CL excluido)",
      reason: "countryLimitation includes CL",
    };
  }

  if (region) {
    const safe = SAFE_REGION_RE.test(region);
    const unsafe = UNSAFE_REGION_RE.test(region);
    if (unsafe && !safe) {
      return {
        compatible: false,
        warning: `Región no Chile: ${region}`,
        reason: `unsafe region: ${region}`,
      };
    }
    if (safe && !unsafe) {
      return {
        compatible: true,
        warning: null,
        reason: `safe region: ${region}`,
      };
    }
    if (unsafe && safe) {
      const strongSafe =
        /\b(region\s*free|latam|latin\s*america|chile|worldwide|global|\brow\b)\b/i.test(
          region,
        );
      if (!strongSafe) {
        return {
          compatible: false,
          warning: `Región ambigua / no Chile: ${region}`,
          reason: `ambiguous unsafe region: ${region}`,
        };
      }
      return {
        compatible: true,
        warning: null,
        reason: `strong safe overrides: ${region}`,
      };
    }
  }

  if (name) {
    if (SAFE_NAME_TAG_RE.test(name)) {
      return {
        compatible: true,
        warning: null,
        reason: "safe name region tag",
      };
    }
    if (UNSAFE_NAME_TAG_RE.test(name)) {
      const match = name.match(UNSAFE_NAME_TAG_RE);
      const tag = match?.[1]?.toUpperCase() ?? "región";
      return {
        compatible: false,
        warning: `Posible región no Chile (${tag})`,
        reason: `unsafe name tag: ${tag}`,
      };
    }
  }

  // No CL exclusion and no clear unsafe region → treat as OK (common for Region Free with partial exclusions).
  return {
    compatible: true,
    warning: null,
    reason: "no chile exclusion detected",
  };
}
