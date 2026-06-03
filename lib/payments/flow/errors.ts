type FlowErrorBody = {
  code?: number;
  message?: string;
};

type FlowApiErrorLike = {
  flowMessage?: string;
  flowCode?: number;
  message?: string;
};

export function formatFlowError(error: unknown): string {
  if (error && typeof error === "object") {
    const flowError = error as FlowApiErrorLike;

    if (flowError.flowMessage) {
      return flowError.flowCode !== undefined
        ? `${flowError.flowMessage} (código ${flowError.flowCode})`
        : flowError.flowMessage;
    }
  }

  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = error.response.data as FlowErrorBody;
    if (data.message) {
      return data.code ? `${data.message} (código ${data.code})` : data.message;
    }
  }

  if (error instanceof Error) {
    return error.message.replace(/^Error de API \(\d+\): /, "");
  }

  return "No se pudo iniciar el pago.";
}
