import { BINANCE } from "@/lib/exchanges/binance/config";

/**
 * Build a Binance WebSocket kline stream URL.
 *
 * Example:
 *   wss://stream.binance.com:9443/ws/btcusdt@kline_1m
 */
export function buildKlineWsUrl(symbol: string, interval = "1m"): string {
  const lower = symbol.toLowerCase();
  return `${BINANCE.wsUrl}/ws/${lower}@kline_${interval}`;
}

/**
 * Normalised candle shape used by the app.
 * Exchange-agnostic.
 */
export interface Candle {
  openTime: number; // ms
  closeTime: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closed: boolean; // true once final
}

/**
 * Raw Binance REST kline response (tuple form).
 * https://developers.binance.com/docs/binance-spot-api-docs/rest-api#klinecandlestick-data
 */
export type BinanceKlineRest = [
  number, // openTime
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number // closeTime
  // ...rest ignored
];

/**
 * Raw Binance WebSocket kline message.
 */
export interface BinanceKlineWsMessage {
  e: "kline";
  E: number;
  s: string;
  k: {
    t: number; // open time
    T: number; // close time
    s: string; // symbol
    i: string; // interval (e.g. "1m")
    o: string; // open
    c: string; // close
    h: string; // high
    l: string; // low
    v: string; // volume
    x: boolean; // is this kline closed?
  };
}

/**
 * Map REST kline tuple → domain Candle.
 * REST klines are always final.
 */
export function mapRestKlineToCandle(k: BinanceKlineRest): Candle {
  return {
    openTime: k[0],
    closeTime: k[6],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closed: true
  };
}

/**
 * Map WebSocket kline message → domain Candle.
 * May be partial until `x === true`.
 */
export function mapWsKlineToCandle(msg: BinanceKlineWsMessage): Candle {
  const k = msg.k;

  return {
    openTime: k.t,
    closeTime: k.T,
    open: Number(k.o),
    high: Number(k.h),
    low: Number(k.l),
    close: Number(k.c),
    volume: Number(k.v),
    closed: k.x
  };
}

/**
 * Fetch historical klines via REST.
 *
 * NOTE:
 * - Prefer setting BINANCE.restUrl to "/api/binance" and proxy via Next.js
 *   to avoid CORS issues.
 */
export async function getKlinesXm(
  symbol: string,
  intervalMinutes = "1m",
  limit = 500
): Promise<Candle[]> {
  const upperSymbol = symbol.toUpperCase();

  const url =
    `${BINANCE.restUrl}/api/v3/klines` +
    `?symbol=${upperSymbol}` +
    `&interval=${intervalMinutes}` +
    `&limit=${limit}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Klines error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as BinanceKlineRest[];
  return data.map(mapRestKlineToCandle);
}
