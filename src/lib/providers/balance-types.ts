export type ProviderBalanceKind = "SMM" | "KINGUIN";

export type ProviderBalanceStatus =
  | "AVAILABLE"
  | "INSUFFICIENT"
  | "UNKNOWN"
  | "ERROR";

export type ProviderBalanceSnapshot = {
  provider: ProviderBalanceKind;
  accountId: string;
  balance: number | null;
  currency: string | null;
  checkedAt: string;
  status: ProviderBalanceStatus;
  source: "api" | "cache" | "unavailable";
  ttlSeconds: number;
  lastError: string | null;
};

export function providerBalanceRedisKey(
  provider: ProviderBalanceKind,
  accountId: string,
): string {
  return `provider-balance:${provider.toLowerCase()}:${accountId}`;
}

export function sanitizeProviderError(message: string): string {
  return message
    .replace(/sk_[a-zA-Z0-9]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/api[_-]?key[=:\s]+\S+/gi, "api_key=[redacted]")
    .replace(/X-Api-Key[=:\s]+\S+/gi, "X-Api-Key=[redacted]")
    .slice(0, 400);
}
