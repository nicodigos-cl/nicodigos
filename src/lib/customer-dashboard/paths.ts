/** Canonical customer order routes (Spanish path). */
export const CUSTOMER_ORDERS_PATH = "/dashboard/pedidos";

export function customerOrdersPath(
  query?: Record<string, string | number | undefined | null>,
): string {
  if (!query) return CUSTOMER_ORDERS_PATH;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${CUSTOMER_ORDERS_PATH}?${qs}` : CUSTOMER_ORDERS_PATH;
}

export function customerOrderPath(orderId: string): string {
  return `${CUSTOMER_ORDERS_PATH}/${orderId}`;
}

export function customerOrderSupportPath(
  orderId: string,
  category?: string,
): string {
  const params = new URLSearchParams({ orderId });
  if (category) params.set("category", category);
  return `/dashboard/support?${params.toString()}`;
}

export const CUSTOMER_DELIVERIES_PATH = "/dashboard/deliveries";

export function customerDeliveriesPath(
  query?: Record<string, string | number | undefined | null>,
): string {
  if (!query) return CUSTOMER_DELIVERIES_PATH;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${CUSTOMER_DELIVERIES_PATH}?${qs}` : CUSTOMER_DELIVERIES_PATH;
}

export function customerDeliveryPath(deliveryId: string): string {
  return `${CUSTOMER_DELIVERIES_PATH}/${deliveryId}`;
}

export function customerDeliverySupportPath(
  deliveryId: string,
  category?: string,
): string {
  const params = new URLSearchParams({ deliveryId });
  if (category) params.set("category", category);
  return `/dashboard/support?${params.toString()}`;
}

export function customerCheckoutPath(orderId: string): string {
  return `/checkout?orderId=${encodeURIComponent(orderId)}`;
}

export const CUSTOMER_TRANSACTIONS_PATH = "/dashboard/transactions";

export function customerTransactionsPath(
  query?: Record<string, string | number | undefined | null>,
): string {
  if (!query) return CUSTOMER_TRANSACTIONS_PATH;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs
    ? `${CUSTOMER_TRANSACTIONS_PATH}?${qs}`
    : CUSTOMER_TRANSACTIONS_PATH;
}

export const CUSTOMER_NOTIFICATIONS_PATH = "/dashboard/notifications";
export const CUSTOMER_PROFILE_PATH = "/dashboard/profile";
export const CUSTOMER_SECURITY_PATH = "/dashboard/security";

export function customerProfilePath(): string {
  return CUSTOMER_PROFILE_PATH;
}
