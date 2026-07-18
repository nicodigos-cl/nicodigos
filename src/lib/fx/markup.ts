/** Pure pricing helpers safe for client and server. */

export function applyMarkupPct(baseClp: number, markupPct: number): number {
  if (!Number.isFinite(baseClp) || baseClp < 0) {
    return 0;
  }
  const pct = Number.isFinite(markupPct) ? markupPct : 0;
  return Math.round(baseClp * (1 + pct / 100));
}
