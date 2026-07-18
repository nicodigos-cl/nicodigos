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

export function customerDeliveryPath(deliveryId: string): string {
  return `/dashboard/deliveries/${deliveryId}`;
}

export function customerCheckoutPath(orderId: string): string {
  return `/checkout?orderId=${encodeURIComponent(orderId)}`;
}
