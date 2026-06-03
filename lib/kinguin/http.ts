import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

/** Strip undefined/null so axios does not send stray query keys. */
export function serializeKinguinParams(
  params?: Record<string, string | number | undefined>,
): Record<string, string | number> | undefined {
  if (!params) {
    return undefined;
  }

  const serialized: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    serialized[key] = value;
  }

  return Object.keys(serialized).length > 0 ? serialized : undefined;
}

export function createKinguinHttpClient(
  apiKey: string,
  apiBase: string,
): AxiosInstance {
  return axios.create({
    baseURL: apiBase.replace(/\/$/, ""),
    headers: {
      "X-Api-Key": apiKey,
    },
    paramsSerializer: {
      serialize: (params) => {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value === undefined || value === null) {
            continue;
          }
          searchParams.append(key, String(value));
        }
        return searchParams.toString();
      },
    },
    validateStatus: (status) => status >= 200 && status < 300,
  });
}

export function kinguinGetConfig(
  params?: Record<string, string | number | undefined>,
): AxiosRequestConfig {
  return {
    params: serializeKinguinParams(params),
    headers: {
      Accept: "application/json",
    },
  };
}
