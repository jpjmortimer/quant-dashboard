"use client";

import React from "react";
import { logBinanceConfig, BINANCE } from "@/lib/exchanges/binance/config";
import { HttpError } from "@/lib/http";
import {
  getServerTime,
  calculateClockSkewMs
} from "@/lib/exchanges/binance/time";
import {
  getExchangeInfo,
  buildSymbolMap,
  getSymbolInfo,
  roundPriceToTick,
  roundQtyToStep
} from "@/lib/exchanges/binance/exchangeInfo";
import {
  getTicker24h,
  getBookTicker,
  getOrderBook,
  getAggTrades,
  getKlines
} from "@/lib/exchanges/binance/marketData";

export function MarketLab() {
  const [symbol, setSymbol] = React.useState(
    BINANCE.defaultSymbol.toUpperCase()
  );

  const [skew, setSkew] = React.useState<string>("Checking…");
  const [exchangeInfo, setExchangeInfo] = React.useState<any>(null);
  const [ticker, setTicker] = React.useState<any>(null);
  const [orderBook, setOrderBook] = React.useState<any>(null);

  // Startup diagnostics
  React.useEffect(() => {
    logBinanceConfig();

    (async () => {
      try {
        const serverTime = await getServerTime();
        const skewMs = calculateClockSkewMs(Date.now(), serverTime);
        setSkew(`${skewMs} ms`);
      } catch {
        setSkew("Error");
      }
    })();

    (async () => {
      try {
        const info = await getExchangeInfo();
        setExchangeInfo({
          timezone: info.timezone,
          symbols: info.symbols.length
        });
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // REST probes per symbol
  React.useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const [ticker24h, depth] = await Promise.all([
          getTicker24h(symbol, { signal: controller.signal }),
          getOrderBook(symbol, 10, { signal: controller.signal })
        ]);

        setTicker(ticker24h);
        setOrderBook({
          bid: depth.bids[0],
          ask: depth.asks[0]
        });
      } catch (err) {
        if (!(err instanceof HttpError)) return;
        console.error(err);
      }
    })();

    return () => controller.abort();
  }, [symbol]);

  return (
    <>
      <h1>Market Lab</h1>

      <label>
        Symbol:
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        />
      </label>

      <section>
        <h2>Clock Skew</h2>
        <pre>{skew}</pre>
      </section>

      <section>
        <h2>Exchange Info</h2>
        <pre>{JSON.stringify(exchangeInfo, null, 2)}</pre>
      </section>

      <section>
        <h2>24h Ticker</h2>
        <pre>{JSON.stringify(ticker, null, 2)}</pre>
      </section>

      <section>
        <h2>Order Book (Top)</h2>
        <pre>{JSON.stringify(orderBook, null, 2)}</pre>
      </section>
    </>
  );
}
