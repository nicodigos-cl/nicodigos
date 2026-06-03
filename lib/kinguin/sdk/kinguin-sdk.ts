import type { AxiosInstance } from "axios";
import { createKinguinHttpClient, kinguinGetConfig } from "@/lib/kinguin/http";
import type {
  KinguinBalance,
  KinguinDownloadKeysParams,
  KinguinKey,
  KinguinOrder,
  KinguinOrderSearchParams,
  KinguinOrderSearchResponse,
  KinguinPlaceOrderInput,
  KinguinProduct,
  KinguinProductSearchParams,
  KinguinProductSearchResponse,
  KinguinRegion,
  KinguinReturnKeyResult,
} from "@/types/kinguin";

export type KinguinSdkOptions = {
  apiKey?: string;
  apiBase?: string;
};

/**
 * Typed SDK for the Kinguin eCommerce API (see Kinguin-eCommerce-API/).
 * HTTP transport uses axios; there is no official npm package from Kinguin.
 */
export class KinguinSdk {
  private readonly axiosInstance: AxiosInstance;

  constructor(options: KinguinSdkOptions = {}) {
    const resolvedApiKey = options.apiKey ?? process.env.KINGUIN_API_KEY;
    const resolvedApiBase = options.apiBase ?? process.env.KINGUIN_API_BASE;

    if (!resolvedApiKey || !resolvedApiBase) {
      throw new Error("KINGUIN_API_KEY and KINGUIN_API_BASE must be set");
    }

    this.axiosInstance = createKinguinHttpClient(
      resolvedApiKey,
      resolvedApiBase,
    );
  }

  async searchProducts(params?: KinguinProductSearchParams) {
    const response = await this.axiosInstance.get<KinguinProductSearchResponse>(
      "/v1/products",
      kinguinGetConfig(params),
    );
    return response.data;
  }

  async getProduct(productId: string) {
    const response = await this.axiosInstance.get<KinguinProduct>(
      `/v2/products/${productId}`,
      kinguinGetConfig(),
    );
    return response.data;
  }

  async getProductByKinguinId(kinguinId: number) {
    const response = await this.axiosInstance.get<KinguinProduct>(
      `/v1/products/${kinguinId}`,
      kinguinGetConfig(),
    );
    return response.data;
  }

  async placeOrder(input: KinguinPlaceOrderInput) {
    const response = await this.axiosInstance.post<KinguinOrder>(
      "/v2/order",
      input,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );
    return response.data;
  }

  async getOrder(orderId: string) {
    const response = await this.axiosInstance.get<KinguinOrder>(
      `/v1/order/${orderId}`,
      kinguinGetConfig(),
    );
    return response.data;
  }

  async searchOrders(params?: KinguinOrderSearchParams) {
    const response = await this.axiosInstance.get<KinguinOrderSearchResponse>(
      "/v1/order",
      kinguinGetConfig(params),
    );
    return response.data;
  }

  async getOrderKeys(orderId: string, params?: KinguinDownloadKeysParams) {
    const response = await this.axiosInstance.get<KinguinKey[]>(
      `/v2/order/${orderId}/keys`,
      kinguinGetConfig(params),
    );
    return response.data;
  }

  async returnOrderKeys(orderId: string) {
    const response = await this.axiosInstance.post<KinguinReturnKeyResult[]>(
      `/v2/order/${orderId}/keys/return`,
    );
    return response.data;
  }

  async getBalance() {
    const response = await this.axiosInstance.get<KinguinBalance>(
      "/v1/balance",
      kinguinGetConfig(),
    );
    return response.data;
  }

  async getRegions() {
    const response = await this.axiosInstance.get<KinguinRegion[]>(
      "/v1/regions",
      kinguinGetConfig(),
    );
    return response.data;
  }

  async getPlatforms() {
    const response = await this.axiosInstance.get<string[]>(
      "/v1/platforms",
      kinguinGetConfig(),
    );
    return response.data;
  }

  async getGenres() {
    const response = await this.axiosInstance.get<string[]>(
      "/v1/genres",
      kinguinGetConfig(),
    );
    return response.data;
  }
}
