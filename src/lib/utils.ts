import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customerDeliveriesPath } from "./customer-dashboard/paths";
import type { CustomerDeliveriesListQuery } from "./customer-dashboard/validations";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildDeliveriesHref(
  query: CustomerDeliveriesListQuery,
  page: number,
): string {
  return customerDeliveriesPath({
    page: page > 1 ? page : undefined,
    pageSize: query.pageSize !== 10 ? query.pageSize : undefined,
    q: query.q,
    filter: query.filter !== "all" ? query.filter : undefined,
    method: query.method,
    sort: query.sort !== "newest" ? query.sort : undefined,
    from: query.from,
    to: query.to,
  });
}
