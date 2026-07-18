import axios, { type AxiosInstance, isAxiosError } from "axios";

import { createLogger } from "@/lib/logger";
import { captureException } from "@/lib/observability";
import type {
  SmmAddOrderResponse,
  SmmApiErrorBody,
  SmmBalance,
  SmmCancelItem,
  SmmMultiRefillItem,
  SmmMultiRefillStatusItem,
  SmmMultiStatusResponse,
  SmmOrderPayload,
  SmmOrderStatus,
  SmmRefillResponse,
  SmmRefillStatusResponse,
  SmmServiceItem,
} from "@/types/smm";

const log = createLogger({ module: "smm-service" });

export type SmmServiceOptions = {
  /** Full panel API endpoint, e.g. `https://perfectsmm.com/api/v2`. */
  apiUrl: string;
  /** Panel API key from the account page. */
  apiKey: string;
  /** Request timeout in ms. Default 30_000. */
  timeoutMs?: number;
};

export class SmmApiError extends Error {
  readonly status?: number;
  readonly body?: unknown;
  readonly action?: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      body?: unknown;
      action?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "SmmApiError";
    this.status = options?.status;
    this.body = options?.body;
    this.action = options?.action;
    if (options?.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: options.cause,
        enumerable: false,
      });
    }
  }
}

type ConnectParams = Record<
  string,
  string | number | boolean | undefined | null
>;

/**
 * Modular Node SDK for SMM panel APIs (`/api/v2`).
 * Initialize with any `apiUrl` + `apiKey` — no env required.
 *
 * @example
 * ```ts
 * const smm = new SmmService({
 *   apiUrl: "https://perfectsmm.com/api/v2",
 *   apiKey: "your-key",
 * });
 * const services = await smm.services();
 * const { order } = await smm.order({
 *   service: 1,
 *   link: "https://example.com",
 *   quantity: 100,
 * });
 * ```
 */
export class SmmService {
  private readonly apiKey: string;
  private readonly http: AxiosInstance;
  readonly apiUrl: string;

  constructor(options: SmmServiceOptions) {
    const apiUrl = options.apiUrl?.trim();
    const apiKey = options.apiKey?.trim();

    if (!apiUrl) {
      throw new Error("SmmService requires a non-empty apiUrl.");
    }
    if (!apiKey) {
      throw new Error("SmmService requires a non-empty apiKey.");
    }

    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiKey = apiKey;

    this.http = axios.create({
      timeout: options.timeoutMs ?? 30_000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0); SmmService/1.0",
      },
    });
  }

  /** `action=services` — list available services. */
  services(): Promise<SmmServiceItem[]> {
    return this.connect<SmmServiceItem[]>({ action: "services" });
  }

  /** `action=balance` — account balance. */
  balance(): Promise<SmmBalance> {
    return this.connect<SmmBalance>({ action: "balance" });
  }

  /**
   * `action=add` — place an order.
   * Payload shape depends on service type (default, comments, mentions, subscription, …).
   */
  order(data: SmmOrderPayload): Promise<SmmAddOrderResponse> {
    return this.connect<SmmAddOrderResponse>({
      action: "add",
      ...data,
    });
  }

  /** `action=status` + `order` — single order status. */
  status(orderId: number | string): Promise<SmmOrderStatus> {
    return this.connect<SmmOrderStatus>({
      action: "status",
      order: orderId,
    });
  }

  /** `action=status` + `orders` — up to 100 order IDs. */
  multiStatus(
    orderIds: Array<number | string>,
  ): Promise<SmmMultiStatusResponse> {
    this.assertIdLimit(orderIds, "orders");
    return this.connect<SmmMultiStatusResponse>({
      action: "status",
      orders: orderIds.join(","),
    });
  }

  /** `action=refill` + `order` — create a refill. */
  refill(orderId: number | string): Promise<SmmRefillResponse> {
    return this.connect<SmmRefillResponse>({
      action: "refill",
      order: orderId,
    });
  }

  /** `action=refill` + `orders` — create refills for up to 100 orders. */
  multiRefill(orderIds: Array<number | string>): Promise<SmmMultiRefillItem[]> {
    this.assertIdLimit(orderIds, "orders");
    return this.connect<SmmMultiRefillItem[]>({
      action: "refill",
      orders: orderIds.join(","),
    });
  }

  /** `action=refill_status` + `refill` — single refill status. */
  refillStatus(refillId: number | string): Promise<SmmRefillStatusResponse> {
    return this.connect<SmmRefillStatusResponse>({
      action: "refill_status",
      refill: refillId,
    });
  }

  /** `action=refill_status` + `refills` — up to 100 refill IDs. */
  multiRefillStatus(
    refillIds: Array<number | string>,
  ): Promise<SmmMultiRefillStatusItem[]> {
    this.assertIdLimit(refillIds, "refills");
    return this.connect<SmmMultiRefillStatusItem[]>({
      action: "refill_status",
      refills: refillIds.join(","),
    });
  }

  /** `action=cancel` + `orders` — cancel up to 100 orders. */
  cancel(orderIds: Array<number | string>): Promise<SmmCancelItem[]> {
    this.assertIdLimit(orderIds, "orders");
    return this.connect<SmmCancelItem[]>({
      action: "cancel",
      orders: orderIds.join(","),
    });
  }

  private assertIdLimit(ids: Array<number | string>, label: string): void {
    if (ids.length === 0) {
      throw new Error(`SmmService.${label} requires at least one id.`);
    }
    if (ids.length > 100) {
      throw new Error(
        `SmmService supports at most 100 ${label} per request (got ${ids.length}).`,
      );
    }
  }

  private async connect<T>(params: ConnectParams): Promise<T> {
    const action = String(params.action ?? "unknown");
    const body = new URLSearchParams();
    body.set("key", this.apiKey);

    for (const [name, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }
      body.set(name, String(value));
    }

    log.debug(
      {
        apiUrl: this.apiUrl,
        action,
        params: Object.fromEntries(
          Array.from(body.entries()).filter(([k]) => k !== "key"),
        ),
      },
      "SMM request",
    );

    try {
      const { data, status } = await this.http.post<T | SmmApiErrorBody>(
        this.apiUrl,
        body,
      );

      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        "error" in data &&
        typeof (data as SmmApiErrorBody).error === "string"
      ) {
        const message = (data as SmmApiErrorBody).error;
        const apiError = new SmmApiError(`SMM (${action}): ${message}`, {
          status,
          body: data,
          action,
        });
        this.reportError(apiError, action, status);
        throw apiError;
      }

      log.debug({ action, status }, "SMM response");
      return data as T;
    } catch (error) {
      if (error instanceof SmmApiError) {
        throw error;
      }

      const apiError = this.toApiError(error, action);
      this.reportError(apiError, action, apiError.status);
      throw apiError;
    }
  }

  private toApiError(error: unknown, action: string): SmmApiError {
    if (isAxiosError(error)) {
      const body = error.response?.data;
      const status = error.response?.status;
      const messageFromBody =
        body &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        "error" in body &&
        typeof (body as SmmApiErrorBody).error === "string"
          ? (body as SmmApiErrorBody).error
          : undefined;

      return new SmmApiError(
        messageFromBody
          ? `SMM (${action}): ${messageFromBody}`
          : `SMM request failed (${action})${status ? ` [${status}]` : ""}: ${error.message}`,
        { status, body, action, cause: error },
      );
    }

    if (error instanceof Error) {
      return new SmmApiError(error.message, { action, cause: error });
    }

    return new SmmApiError("Unknown SMM client error", {
      action,
      cause: error,
    });
  }

  private reportError(
    error: SmmApiError,
    action: string,
    status?: number,
  ): void {
    log.error(
      {
        err: error,
        action,
        status,
        apiUrl: this.apiUrl,
      },
      "SMM request failed",
    );
    captureException(error, {
      source: "smm-service",
      action,
      status: status ?? 0,
      apiUrl: this.apiUrl,
    });
  }
}
