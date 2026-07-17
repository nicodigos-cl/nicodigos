import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  isAxiosError,
} from "axios";

import { createLogger } from "@/lib/logger";
import { captureException } from "@/lib/observability";
import type {
  KinguinBalance,
  KinguinDownloadedKey,
  KinguinEnvironment,
  KinguinErrorBody,
  KinguinOrder,
  KinguinOrderListResponse,
  KinguinOrderSearchParams,
  KinguinPlaceOrderRequestV1,
  KinguinPlaceOrderRequestV2,
  KinguinProduct,
  KinguinProductListResponse,
  KinguinProductSearchParams,
  KinguinRegion,
  KinguinReturnedKey,
} from "@/types/kinguin";

const log = createLogger({ module: "kinguin-client" });

export const KINGUIN_BASE_URLS = {
  production: "https://gateway.kinguin.net/esa/api",
  sandbox: "https://gateway.sandbox.kinguin.net/esa/api",
} as const;

export class KinguinApiError extends Error {
  readonly status?: number;
  readonly kind?: string;
  readonly detail?: string;
  readonly trace?: string;
  readonly body?: KinguinErrorBody;
  readonly method?: string;
  readonly url?: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      kind?: string;
      detail?: string;
      trace?: string;
      body?: KinguinErrorBody;
      method?: string;
      url?: string;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "KinguinApiError";
    this.status = options?.status;
    this.kind = options?.kind;
    this.detail = options?.detail;
    this.trace = options?.trace;
    this.body = options?.body;
    this.method = options?.method;
    this.url = options?.url;
  }
}

export type KinguinClientOptions = {
  apiKey?: string;
  environment?: KinguinEnvironment;
  baseURL?: string;
  /** Request timeout in ms. Default 30_000. */
  timeoutMs?: number;
};

function resolveBaseURL(options: KinguinClientOptions): string {
  if (options.baseURL) {
    return options.baseURL.replace(/\/$/, "");
  }

  const fromEnv = process.env.KINGUIN_API_BASE?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const environment =
    options.environment ??
    (process.env.KINGUIN_ENVIRONMENT === "sandbox" ? "sandbox" : "production");

  return KINGUIN_BASE_URLS[environment];
}

function resolveApiKey(options: KinguinClientOptions): string {
  const apiKey = options.apiKey ?? process.env.KINGUIN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing Kinguin API key. Set KINGUIN_API_KEY or pass apiKey to KinguinClient.",
    );
  }
  return apiKey;
}

function toSearchParams(
  params?: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> | undefined {
  if (!params) {
    return undefined;
  }

  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Typed HTTP client for the Kinguin eCommerce (ESA) API.
 * @see Kinguin-eCommerce-API/quickstart/README.md
 */
export class KinguinClient {
  private readonly http: AxiosInstance;
  private readonly environment: string;

  constructor(options: KinguinClientOptions = {}) {
    const apiKey = resolveApiKey(options);
    const baseURL = resolveBaseURL(options);
    this.environment = baseURL.includes("sandbox") ? "sandbox" : "production";

    this.http = axios.create({
      baseURL,
      timeout: options.timeoutMs ?? 30_000,
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    this.http.interceptors.request.use((config) => {
      log.debug(
        {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          environment: this.environment,
        },
        "Kinguin request",
      );
      return config;
    });

    this.http.interceptors.response.use(
      (response) => {
        log.debug(
          {
            method: response.config.method?.toUpperCase(),
            url: response.config.url,
            status: response.status,
            environment: this.environment,
          },
          "Kinguin response",
        );
        return response;
      },
      (error: unknown) => {
        const apiError = this.toApiError(error);
        log.error(
          {
            err: apiError,
            status: apiError.status,
            kind: apiError.kind,
            detail: apiError.detail,
            method: apiError.method,
            url: apiError.url,
            environment: this.environment,
          },
          "Kinguin request failed",
        );
        captureException(apiError, {
          source: "kinguin-client",
          environment: this.environment,
          status: apiError.status ?? 0,
          kind: apiError.kind ?? "unknown",
          method: apiError.method ?? "unknown",
          url: apiError.url ?? "unknown",
        });
        return Promise.reject(apiError);
      },
    );
  }

  private toApiError(error: unknown): KinguinApiError {
    if (error instanceof KinguinApiError) {
      return error;
    }

    if (isAxiosError(error)) {
      const body = error.response?.data as KinguinErrorBody | undefined;
      const status = error.response?.status ?? body?.status;
      const detail = body?.detail ?? error.message;
      const method = error.config?.method?.toUpperCase();
      const url = error.config?.url;

      return new KinguinApiError(
        body?.detail
          ? `Kinguin (${status ?? "?"}): ${body.detail}`
          : `Kinguin request failed${status ? ` (${status})` : ""}: ${error.message}`,
        {
          status,
          kind: body?.kind,
          detail,
          trace: body?.trace,
          body,
          method,
          url,
          cause: error,
        },
      );
    }

    if (error instanceof Error) {
      return new KinguinApiError(error.message, { cause: error });
    }

    return new KinguinApiError("Unknown Kinguin client error", {
      cause: error,
    });
  }

  private async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.http.get<T>(path, config);
    return data;
  }

  private async post<T>(
    path: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const { data } = await this.http.post<T>(path, body, config);
    return data;
  }

  /** `GET /v1/products` — search / list products. */
  searchProducts(
    params?: KinguinProductSearchParams,
  ): Promise<KinguinProductListResponse> {
    return this.get<KinguinProductListResponse>("/v1/products", {
      params: toSearchParams(params),
    });
  }

  /** `GET /v1/products/{kinguinId}` — numeric catalog id. */
  getProductByKinguinId(kinguinId: number): Promise<KinguinProduct> {
    return this.get<KinguinProduct>(`/v1/products/${kinguinId}`);
  }

  /** `GET /v2/products/{productId}` — string product id. */
  getProductByProductId(productId: string): Promise<KinguinProduct> {
    return this.get<KinguinProduct>(`/v2/products/${productId}`);
  }

  /** `GET /v1/regions` */
  getRegions(): Promise<KinguinRegion[]> {
    return this.get<KinguinRegion[]>("/v1/regions");
  }

  /** `GET /v1/platforms` */
  getPlatforms(): Promise<string[]> {
    return this.get<string[]>("/v1/platforms");
  }

  /** `GET /v1/genres` */
  getGenres(): Promise<string[]> {
    return this.get<string[]>("/v1/genres");
  }

  /** `GET /v1/balance` */
  getBalance(): Promise<KinguinBalance> {
    return this.get<KinguinBalance>("/v1/balance");
  }

  /** `POST /v1/order` — place order with numeric `kinguinId`. */
  placeOrderV1(body: KinguinPlaceOrderRequestV1): Promise<KinguinOrder> {
    return this.post<KinguinOrder>("/v1/order", body);
  }

  /** `POST /v2/order` — place order with string `productId` (preferred). */
  placeOrderV2(body: KinguinPlaceOrderRequestV2): Promise<KinguinOrder> {
    return this.post<KinguinOrder>("/v2/order", body);
  }

  /** `GET /v1/order/{orderId}` */
  getOrder(orderId: string): Promise<KinguinOrder> {
    return this.get<KinguinOrder>(`/v1/order/${orderId}`);
  }

  /** `GET /v1/order` — search / list orders. */
  searchOrders(
    params?: KinguinOrderSearchParams,
  ): Promise<KinguinOrderListResponse> {
    return this.get<KinguinOrderListResponse>("/v1/order", {
      params: toSearchParams(params),
    });
  }

  /** `GET /v2/order/{orderId}/keys` */
  downloadKeys(
    orderId: string,
    params?: { page?: number; limit?: number },
  ): Promise<KinguinDownloadedKey[]> {
    return this.get<KinguinDownloadedKey[]>(`/v2/order/${orderId}/keys`, {
      params: toSearchParams(params),
    });
  }

  /** `POST /v2/order/{orderId}/keys/return` */
  returnKeys(orderId: string): Promise<KinguinReturnedKey[]> {
    return this.post<KinguinReturnedKey[]>(`/v2/order/${orderId}/keys/return`);
  }
}

let defaultClient: KinguinClient | null = null;

/** Lazy singleton configured from env (`KINGUIN_API_KEY`, `KINGUIN_API_BASE`). */
export function getKinguinClient(
  options?: KinguinClientOptions,
): KinguinClient {
  if (options) {
    return new KinguinClient(options);
  }

  if (!defaultClient) {
    defaultClient = new KinguinClient();
  }

  return defaultClient;
}
