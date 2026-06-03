/**
 * Client-safe exports only. Server code must import from:
 * - `@/lib/currency/exchange` (getEurToClpRate)
 * - `@/lib/currency/frankfurter-client`
 */
export {
  APP_CURRENCY,
  KINGUIN_SOURCE_CURRENCY,
  DEFAULT_MARKUP,
} from "@/lib/currency/constants";
export { eurToClp, sellClpFromCostEur, roundClp } from "@/lib/currency/convert";
export { formatMoney, formatSourceMoney } from "@/lib/currency/format";
