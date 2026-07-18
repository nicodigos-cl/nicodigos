import pino, { type Logger, type LoggerOptions } from "pino";

const isDev = process.env.NODE_ENV !== "production";

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: {
    service: process.env.SERVICE_NAME ?? "nicodigos",
  },
    redact: {
    paths: [
      "apiKey",
      "*.apiKey",
      "password",
      "*.password",
      "serial",
      "*.serial",
      "token",
      "*.token",
      "headers['X-Api-Key']",
      "headers['x-api-key']",
      "config.headers['X-Api-Key']",
      "config.headers['x-api-key']",
    ],
    censor: "[Redacted]",
  },
};

if (isDev) {
  options.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  };
}

/** Structured JSON logger (pino). Use `.child({ module })` for scoped context. */
export const logger: Logger = pino(options);

export function createLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
