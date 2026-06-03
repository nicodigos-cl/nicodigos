import {
  createFrankfurterClient,
  type FrankfurterClient,
} from "frankfurter-js";

const globalForFrankfurter = globalThis as typeof globalThis & {
  frankfurterSdk?: FrankfurterClient;
};

export function getFrankfurterSdk(): FrankfurterClient {
  if (!globalForFrankfurter.frankfurterSdk) {
    globalForFrankfurter.frankfurterSdk = createFrankfurterClient();
  }

  return globalForFrankfurter.frankfurterSdk;
}
