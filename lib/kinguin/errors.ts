import axios from "axios";
import type { KinguinErrorResponse } from "@/types/kinguin";

export function isKinguinSandbox(): boolean {
  return process.env.KINGUIN_API_BASE?.includes("sandbox") ?? false;
}

export function formatKinguinError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as KinguinErrorResponse | undefined;
    const status = error.response?.status;

    if (data?.detail) {
      return `Kinguin (${status ?? "?"}): ${data.detail}`;
    }

    if (status === 500 && isKinguinSandbox()) {
      return "Kinguin sandbox no soporta el filtro ?name= (error del servidor). Se usa el catálogo completo con filtro local.";
    }

    if (status === 400 && data?.detail) {
      return data.detail;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Error desconocido al contactar con Kinguin.";
}

export function isRetryableKinguinNameSearchError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 500 || status === 502 || status === 503;
}
