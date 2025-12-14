/**
 * Helpers around Binance server time.
 *
 * Endpoint:
 *   GET /api/v3/time
 *
 * Docs:
 *   Returns JSON like:
 *     { "serverTime": 1731569159523 }
 *
 * serverTime is:
 *   - a number
 *   - milliseconds since Unix epoch (01 Jan 1970 UTC)
 *   - same format as Date.now()
 */

import { binanceHttp } from "@/lib/http";

/**
 * TypeScript type representing the raw response shape from /api/v3/time.
 *
 * Why define this?
 * - It gives us autocomplete (t.serverTime).
 * - It documents the response contract in one place.
 */
export type BinanceServerTimeResponse = {
  serverTime: number;
};

/**
 * Fetch the current Binance server time (in milliseconds since epoch).
 *
 * This is a thin, typed wrapper around:
 *   GET https://api.binance.com/api/v3/time
 *
 * Returns:
 *   serverTime as a number (e.g. 1731569159523)
 *
 * Usage:
 *   const serverTime = await getServerTime();
 *   console.log("Binance time:", new Date(serverTime).toISOString());
 */
export async function getServerTime(): Promise<number> {
  // Call our generic HTTP client and tell it to expect BinanceServerTimeResponse.
  const data = await binanceHttp.get<BinanceServerTimeResponse>("/api/v3/time");
  return data.serverTime;
}

/**
 * Compute the clock skew between the local machine and Binance.
 *
 * The idea:
 *   - localNow is Date.now() on your machine.
 *   - serverTime is from getServerTime().
 *
 * We define:
 *   skewMs = serverTime - localNow
 *
 * Interpretation:
 *   - skewMs > 0 → Binance is "ahead" of local clock
 *   - skewMs < 0 → Binance is "behind" local clock
 *
 * This is useful later when:
 *   - sending time-sensitive orders
 *   - working with signatures that depend on timestamps
 */
export function calculateClockSkewMs(
  localNowMs: number,
  serverTimeMs: number
): number {
  return serverTimeMs - localNowMs;
}
