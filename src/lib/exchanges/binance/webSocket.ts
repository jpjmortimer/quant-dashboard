/**
 * Very small Binance WebSocket helper focused on the trade stream.
 *
 * Goal:
 *   - Hide the URL building and raw WebSocket details.
 *   - Give you a clean API:
 *       - connect()
 *       - close()
 *       - onMessage handler with typed trade data
 *
 * We start simple: one connection, one stream (e.g. btcusdt@trade).
 */

import { BINANCE } from "./config";

/* ----------------------------------------------------------------------------------------------
 * Types for the trade stream (subset of Binance payload)
 * ----------------------------------------------------------------------------------------------*/

/**
 * Binance trade stream message for `<symbol>@trade`.
 *
 * Docs show fields like:
 * {
 *   "e": "trade",     // Event type
 *   "E": 123456789,   // Event time
 *   "s": "BNBBTC",    // Symbol
 *   "t": 12345,       // Trade ID
 *   "p": "0.001",     // Price
 *   "q": "100",       // Quantity
 *   "b": 88,          // Buyer order ID
 *   "a": 50,          // Seller order ID
 *   "T": 123456785,   // Trade time
 *   "m": true,        // Is the buyer the market maker?
 *   "M": true         // Ignore
 * }
 *
 * We only type what we care about for now, but we keep the shapes obvious.
 */
export type BinanceTradeEvent = {
  e: "trade";
  E: number;
  s: string;
  t: number;
  p: string;
  q: string;
  b: number;
  a: number;
  T: number;
  m: boolean;
  M: boolean;
};

/**
 * A small "normalised" version of the trade for easier use in app code.
 * Converts strings → numbers where it makes sense.
 */
export type NormalisedTrade = {
  symbol: string;
  price: number;
  quantity: number;
  tradeId: number;
  tradeTime: number; // ms since epoch
  isBuyerMaker: boolean;
};

/* ----------------------------------------------------------------------------------------------
 * URL helpers
 * ----------------------------------------------------------------------------------------------*/

/**
 * Build a trade stream path for a symbol.
 *
 * Binance expects:
 *   <lowercaseSymbol>@trade
 *
 * e.g.
 *   "btcusdt@trade"
 */
export function buildTradeStreamName(symbol: string): string {
  return `${symbol.toLowerCase()}@trade`;
}

/**
 * Build the full WebSocket URL for a single stream.
 *
 * Example:
 *   BINANCE.wsUrl = "wss://stream.binance.com:9443"
 *   symbol = "btcusdt"
 *
 *   → wss://stream.binance.com:9443/ws/btcusdt@trade
 */
export function buildTradeWsUrl(symbol: string): string {
  const base = BINANCE.wsUrl.replace(/\/+$/, "");
  const streamName = buildTradeStreamName(symbol);
  return `${base}/ws/${streamName}`;
}

/* ----------------------------------------------------------------------------------------------
 * BinanceTradeWebSocket — small wrapper around WebSocket
 * ----------------------------------------------------------------------------------------------*/

export type TradeMessageHandler = (trade: NormalisedTrade) => void;
export type WsStatusHandler = (event: Event) => void;
export type WsErrorHandler = (event: Event) => void;

/**
 * Thin wrapper around browser WebSocket for a single trade stream.
 *
 * Responsibilities:
 *   - Open a WebSocket connection to `<symbol>@trade`.
 *   - Parse incoming JSON.
 *   - Normalise it into a friendly NormalisedTrade object.
 *   - Call the provided `onTrade` callback.
 *
 * Not responsible for:
 *   - Automatic reconnect (we can add later).
 *   - Subscribing/unsubscribing multiple streams in one connection.
 */
export class BinanceTradeWebSocket {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly onTrade: TradeMessageHandler;
  private readonly onOpen?: WsStatusHandler;
  private readonly onClose?: WsStatusHandler;
  private readonly onError?: WsErrorHandler;

  constructor(options: {
    symbol?: string;
    onTrade: TradeMessageHandler;
    onOpen?: WsStatusHandler;
    onClose?: WsStatusHandler;
    onError?: WsErrorHandler;
  }) {
    const symbol = (options.symbol ?? BINANCE.defaultSymbol).toLowerCase();
    this.url = buildTradeWsUrl(symbol);
    this.onTrade = options.onTrade;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onError = options.onError;
  }

  /**
   * Open the WebSocket connection.
   *
   * Safe to call multiple times:
   *   - If already open, it does nothing.
   */
  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      // Already connected or in progress.
      return;
    }

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = (event) => {
      console.log("[BinanceTradeWebSocket] connected:", this.url);
      this.onOpen?.(event);
    };

    ws.onmessage = (event) => {
      // Binance sends JSON strings
      try {
        const data = JSON.parse(event.data as string) as BinanceTradeEvent;

        // Basic validation: ensure it's the trade event shape we expect
        if (data.e !== "trade") {
          // If you later multiplex streams, you’ll inspect event types here.
          return;
        }

        const normalised: NormalisedTrade = {
          symbol: data.s,
          price: Number(data.p),
          quantity: Number(data.q),
          tradeId: data.t,
          tradeTime: data.T,
          isBuyerMaker: data.m
        };

        this.onTrade(normalised);
      } catch (error) {
        console.error("[BinanceTradeWebSocket] Failed to parse message", {
          error,
          raw: event.data
        });
      }
    };

    ws.onerror = (event) => {
      console.error("[BinanceTradeWebSocket] error", event);
      this.onError?.(event);
    };

    ws.onclose = (event) => {
      console.warn(
        `[BinanceTradeWebSocket] closed (code=${event.code}, reason="${event.reason}, was clean=${event.wasClean}")`
      );
      console.warn("[BinanceTradeWebSocket] event: ", event);
      this.onClose?.(event);
      this.ws = null;
    };
  }

  /**
   * Close the WebSocket connection if it is open.
   */
  close(): void {
    if (!this.ws) return;
    if (
      this.ws.readyState === WebSocket.CLOSING ||
      this.ws.readyState === WebSocket.CLOSED
    ) {
      return;
    }
    this.ws.close();
  }
}
