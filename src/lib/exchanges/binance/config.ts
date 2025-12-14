/**
 * lib/exchanges/binance/config.ts
 *
 * Centralised configuration for the Binance exchange adapter.
 *
 * This file is responsible for:
 * - Reading public environment variables (NEXT_PUBLIC_*)
 * - Providing safe defaults so the app runs out-of-the-box
 * - Exposing a single config object for Binance-specific code
 *
 * Official Binance Spot API docs:
 * REST:
 *   https://developers.binance.com/docs/binance-spot-api-docs/rest-api
 * WebSocket Streams:
 *   https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
 */

/**
 * Public environment variables used by the Binance adapter.
 *
 * These are replaced at build-time by Next.js.
 * Because they are NEXT_PUBLIC_*, they are safe for client usage
 * (they must not contain secrets).
 */
export type BinanceEnvKey =
  | "NEXT_PUBLIC_BINANCE_REST_URL"
  | "NEXT_PUBLIC_BINANCE_WS_URL"
  | "NEXT_PUBLIC_BINANCE_DEFAULT_SYMBOL";

/**
 * Read a public environment variable with a safe fallback.
 *
 * We intentionally DO NOT throw here:
 * - This is client-side code
 * - Defaults allow the repo to run without setup
 * - Keeps the project clone-and-run friendly
 */
function getPublicEnv(key: BinanceEnvKey, fallback: string): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

/**
 * Binance adapter configuration.
 *
 * This object is the ONLY thing Binance-specific code should depend on.
 * If you later add Coinbase/Kraken/etc, they get their own config objects.
 */
export const BINANCE = {
  /**
   * Binance REST base URL for public Spot endpoints.
   * Example: https://api.binance.com
   *
   * Recommended override in production:
   *   NEXT_PUBLIC_BINANCE_REST_URL=/api/binance
   * (via a Next.js route handler proxy)
   */
  restUrl: getPublicEnv(
    "NEXT_PUBLIC_BINANCE_REST_URL",
    "https://api.binance.com"
  ),

  /**
   * Binance base URL for WebSocket connections.
   * Example: wss://stream.binance.com:9443
   */
  wsUrl: getPublicEnv(
    "NEXT_PUBLIC_BINANCE_WS_URL",
    "wss://stream.binance.com:9443"
  ),

  /**
   * Default symbol used for UI bootstrapping and demos.
   *
   * Binance WebSocket streams expect lowercase symbols.
   */
  defaultSymbol: getPublicEnv(
    "NEXT_PUBLIC_BINANCE_DEFAULT_SYMBOL",
    "btcusdt"
  ).toLowerCase()
} as const;

/**
 * Optional helper to log the active Binance configuration once.
 *
 * Useful during development to confirm:
 * - env vars are being picked up
 * - proxy URLs are correct
 * - symbols are normalised correctly
 */
export function logBinanceConfig(): void {
  if (process.env.NODE_ENV === "production") return;

  console.group("[Binance Config]");
  console.log("REST URL :", BINANCE.restUrl);
  console.log("WS URL   :", BINANCE.wsUrl);
  console.log("Symbol   :", BINANCE.defaultSymbol);
  console.groupEnd();
}
