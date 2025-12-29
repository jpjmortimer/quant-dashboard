import { binanceHttp } from "@/lib/http";

const API_BASE = "/api";

type RequestOptions = {
  signal?: AbortSignal;
};

/**
 * GET /api/v3/time
 */
export type BinanceServerTimeResponse = {
  serverTime: number;
};

export async function getServerTime(): Promise<BinanceServerTimeResponse> {
  return binanceHttp.get<BinanceServerTimeResponse>(`${API_BASE}/v3/time`);
}

/**
 * GET /api/v3/depth
 * Basic order book snapshot.
 */
export type BinanceOrderBookEntry = [string, string]; // [price, qty]

export type BinanceDepthResponse = {
  lastUpdateId: number;
  bids: BinanceOrderBookEntry[];
  asks: BinanceOrderBookEntry[];
};

/**
 * Prefer this naming in your roadmap: getDepth.
 */
export async function getDepth(
  symbol: string,
  limit: 5 | 10 | 20 | 50 | 100 | 500 | 1000 = 100,
  options?: RequestOptions
): Promise<BinanceDepthResponse> {
  return binanceHttp.get<BinanceDepthResponse>(`${API_BASE}/v3/depth`, {
    params: {
      symbol: symbol.toUpperCase(),
      limit
    },
    signal: options?.signal
  });
}

// Backwards-compatible alias if you like the old name:
export const getOrderBook = getDepth;

/**
 * GET /api/v3/ticker/24hr
 * 24h statistics for a symbol.
 */
export type BinanceTicker24hResponse = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
};

export async function get24hTicker(
  symbol: string,
  options?: RequestOptions
): Promise<BinanceTicker24hResponse> {
  return binanceHttp.get<BinanceTicker24hResponse>(
    `${API_BASE}/v3/ticker/24hr`,
    {
      params: {
        symbol: symbol.toUpperCase()
      },
      signal: options?.signal
    }
  );
}

// Backwards-compatible alias
export const getTicker24h = get24hTicker;

/**
 * GET /api/v3/ticker/bookTicker
 * Best bid/ask for a symbol.
 */
export type BinanceBookTickerResponse = {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
};

export async function getBookTicker(
  symbol: string,
  options?: RequestOptions
): Promise<BinanceBookTickerResponse> {
  return binanceHttp.get<BinanceBookTickerResponse>(
    `${API_BASE}/v3/ticker/bookTicker`,
    {
      params: { symbol: symbol.toUpperCase() },
      signal: options?.signal
    }
  );
}

/**
 * GET /api/v3/aggTrades
 * Compressed / aggregated trades.
 */
export type BinanceAggTrade = {
  a: number; // Aggregate tradeId
  p: string; // Price
  q: string; // Quantity
  f: number; // First tradeId
  l: number; // Last tradeId
  T: number; // Timestamp (ms)
  m: boolean; // Was the buyer the maker?
  M: boolean; // Ignore
};

export type GetAggTradesParams = {
  fromId?: number;
  startTime?: number;
  endTime?: number;
  limit?: number; // default 500; max 1000
};

export async function getAggTrades(
  symbol: string,
  params: GetAggTradesParams = {},
  options?: RequestOptions
): Promise<BinanceAggTrade[]> {
  return binanceHttp.get<BinanceAggTrade[]>(`${API_BASE}/v3/aggTrades`, {
    params: {
      symbol: symbol.toUpperCase(),
      ...params
    },
    signal: options?.signal
  });
}

/**
 * GET /api/v3/klines
 * Candlestick data.
 *
 * Returned shape is an array of arrays:
 * [
 *   [
 *     0  Open time (ms),
 *     1  Open,
 *     2  High,
 *     3  Low,
 *     4  Close,
 *     5  Volume,
 *     6  Close time (ms),
 *     7  Quote asset volume,
 *     8  Number of trades,
 *     9  Taker buy base asset volume,
 *     10 Taker buy quote asset volume,
 *     11 Ignore
 *   ],
 *   ...
 * ]
 */

export type BinanceKlineInterval =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "6h"
  | "8h"
  | "12h"
  | "1d"
  | "3d"
  | "1w"
  | "1M";

export type BinanceKline = [
  number, // open time
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number, // close time
  string, // quote asset volume
  number, // number of trades
  string, // taker buy base asset volume
  string, // taker buy quote asset volume
  string // ignore
];

export type GetKlinesParams = {
  startTime?: number;
  endTime?: number;
  limit?: number; // default 500; max 1000
};

export async function getKlines(
  symbol: string,
  interval: BinanceKlineInterval,
  params: GetKlinesParams = {},
  options?: RequestOptions
): Promise<BinanceKline[]> {
  return binanceHttp.get<BinanceKline[]>(`${API_BASE}/v3/klines`, {
    params: {
      symbol: symbol.toUpperCase(),
      interval,
      ...params
    },
    signal: options?.signal
  });
}
