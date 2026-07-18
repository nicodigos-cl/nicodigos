export const BUSINESS_TIMEZONE = "America/Santiago";
export const LOW_STOCK_THRESHOLD = 5;
export const DASHBOARD_MAX_RANGE_DAYS = 366;
export const DASHBOARD_RECENT_LIMIT = 8;
export const DASHBOARD_ACTIVITY_LIMIT = 16;
export const DASHBOARD_TOP_PRODUCTS_LIMIT = 6;

export const APPROVED_PAYMENT_STATUSES = [
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
] as const;

export const ACTIVE_APPROVED_PAYMENT_STATUSES = [
  "PAID",
  "PARTIALLY_REFUNDED",
] as const;
