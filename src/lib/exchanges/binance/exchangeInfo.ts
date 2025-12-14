/**
 * Binance Exchange Info helpers.
 *
 * Endpoint:
 *   GET /api/v3/exchangeInfo
 *
 * Docs (simplified):
 *   Returns a big JSON object describing:
 *     - timezone
 *     - serverTime
 *     - rateLimits
 *     - exchangeFilters
 *     - symbols[]  <-- one entry per trading pair (e.g. BTCUSDT)
 *
 * We only model the fields we actually care about right now.
 * TypeScript lets us do this: we can define a *subset* of the real shape.
 */

import { binanceHttp } from "@/lib/http";

/* ----------------------------------------------------------------------------------------------
 * Types representing the structure of /api/v3/exchangeInfo (subset)
 * ----------------------------------------------------------------------------------------------*/

/**
 * A single filter object inside a symbol.
 *
 * Binance uses filters for things like:
 *  - PRICE_FILTER   → tickSize, minPrice, maxPrice
 *  - LOT_SIZE       → stepSize, minQty, maxQty
 *  - MIN_NOTIONAL   → minNotional
 *
 * We only include fields we need for price/quantity rounding for now.
 */
export type BinanceSymbolFilter = {
  filterType: string; // e.g. "PRICE_FILTER" | "LOT_SIZE" | "MIN_NOTIONAL" | ...
  minPrice?: string;
  maxPrice?: string;
  tickSize?: string;

  minQty?: string;
  maxQty?: string;
  stepSize?: string;

  minNotional?: string;

  // There are more fields in the real API; we add them later if needed.
};

/**
 * A single symbol (trading pair) from Binance.
 *
 * Examples:
 *   - BTCUSDT
 *   - ETHUSDT
 *   - BNBUSDT
 *
 * We include:
 *   - baseAsset / quoteAsset: e.g. BTC / USDT
 *   - filters: so we can compute tick sizes / step sizes.
 */
export type BinanceSymbolInfo = {
  symbol: string; // e.g. "BTCUSDT"
  status: string; // e.g. "TRADING"
  baseAsset: string; // e.g. "BTC"
  quoteAsset: string; // e.g. "USDT"
  baseAssetPrecision: number;
  quotePrecision: number;

  filters: BinanceSymbolFilter[];

  // There are many more fields in the full response (orderTypes, permissions, ...)
  // We can add them later as needed.
};

/**
 * The full response shape from /api/v3/exchangeInfo (simplified).
 */
export type BinanceExchangeInfoResponse = {
  timezone: string;
  serverTime: number;
  symbols: BinanceSymbolInfo[];

  // rateLimits & exchangeFilters exist, but we ignore them for now.
};

/* ----------------------------------------------------------------------------------------------
 * Fetch helper
 * ----------------------------------------------------------------------------------------------*/

/**
 * Fetch exchange info from Binance.
 *
 * This returns the raw typed object that mirrors the API response
 * (subset of fields).
 *
 * Usage:
 *   const info = await getExchangeInfo();
 *   console.log(info.symbols.length);
 */
export async function getExchangeInfo(): Promise<BinanceExchangeInfoResponse> {
  return binanceHttp.get<BinanceExchangeInfoResponse>("/api/v3/exchangeInfo");
}

/* ----------------------------------------------------------------------------------------------
 * Lookups & helpers
 * ----------------------------------------------------------------------------------------------*/

/**
 * Build a simple map from symbol → BinanceSymbolInfo.
 *
 * Why?
 *  - Looking up "BTCUSDT" via array.find(...) is O(n).
 *  - With a map, lookups become O(1) by key.
 *
 * This is the first step towards a "symbol dictionary" you can pass
 * around the app.
 */
export function buildSymbolMap(
  symbols: BinanceSymbolInfo[]
): Record<string, BinanceSymbolInfo> {
  const map: Record<string, BinanceSymbolInfo> = {};

  for (const s of symbols) {
    map[s.symbol] = s;
  }

  return map;
}

/**
 * Convenience helper: given an exchangeInfo object and a symbol string,
 * return the BinanceSymbolInfo (if it exists).
 */
export function getSymbolInfo(
  exchangeInfo: BinanceExchangeInfoResponse,
  symbol: string
): BinanceSymbolInfo | undefined {
  // Binance symbols are usually uppercase ("BTCUSDT").
  // To be safe, we normalise the lookup here.
  const upper = symbol.toUpperCase();
  return exchangeInfo.symbols.find((s) => s.symbol === upper);
}

/* ----------------------------------------------------------------------------------------------
 * Filter extraction helpers (PRICE_FILTER & LOT_SIZE)
 * ----------------------------------------------------------------------------------------------*/

/**
 * Get the PRICE_FILTER for a symbol, if present.
 *
 * PRICE_FILTER contains:
 *   - minPrice
 *   - maxPrice
 *   - tickSize  ← smallest price increment
 */
export function getPriceFilter(
  symbolInfo: BinanceSymbolInfo
): BinanceSymbolFilter | undefined {
  return symbolInfo.filters.find((f) => f.filterType === "PRICE_FILTER");
}

/**
 * Get the LOT_SIZE filter for a symbol, if present.
 *
 * LOT_SIZE contains:
 *   - minQty
 *   - maxQty
 *   - stepSize  ← smallest quantity increments
 */
export function getLotSizeFilter(
  symbolInfo: BinanceSymbolInfo
): BinanceSymbolFilter | undefined {
  return symbolInfo.filters.find((f) => f.filterType === "LOT_SIZE");
}

/* ----------------------------------------------------------------------------------------------
 * Rounding helpers (basic version)
 * ----------------------------------------------------------------------------------------------*/

/**
 * Round a price to the nearest valid tick size for this symbol.
 *
 * NOTE:
 *  - This is a **basic** implementation using floating point math.
 *  - For production trading, you may want to use a decimal library
 *    (e.g. decimal.js) to avoid precision issues.
 */
export function roundPriceToTick(
  symbolInfo: BinanceSymbolInfo,
  rawPrice: number
): number {
  const priceFilter = getPriceFilter(symbolInfo);

  if (!priceFilter?.tickSize) {
    // If no tickSize is defined, just return the raw price.
    // (You might want to throw instead, depending on your needs.)
    return rawPrice;
  }

  const tick = parseFloat(priceFilter.tickSize);

  if (!Number.isFinite(tick) || tick <= 0) {
    return rawPrice;
  }

  const steps = Math.round(rawPrice / tick);
  const rounded = steps * tick;

  // Optional: limit to a reasonable number of decimals for display
  return parseFloat(rounded.toFixed(12));
}

/**
 * Round a quantity to the nearest valid step size for this symbol.
 */
export function roundQtyToStep(
  symbolInfo: BinanceSymbolInfo,
  rawQty: number
): number {
  const lotSizeFilter = getLotSizeFilter(symbolInfo);

  if (!lotSizeFilter?.stepSize) {
    return rawQty;
  }

  const step = parseFloat(lotSizeFilter.stepSize);

  if (!Number.isFinite(step) || step <= 0) {
    return rawQty;
  }

  const steps = Math.round(rawQty / step);
  const rounded = steps * step;

  return parseFloat(rounded.toFixed(12));
}
