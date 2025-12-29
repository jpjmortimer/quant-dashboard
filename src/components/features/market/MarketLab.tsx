"use client";

import React from "react";
import { logBinanceConfig, BINANCE } from "@/lib/exchanges/binance/config";
import { HttpError } from "@/lib/http";
import {
  getServerTime,
  calculateClockSkewMs
} from "@/lib/exchanges/binance/time";
import { getExchangeInfo } from "@/lib/exchanges/binance/exchangeInfo";
import { getTicker24h, getOrderBook } from "@/lib/exchanges/binance/marketData";

type ApiStatus = "idle" | "ok" | "down";

type ExchangeInfoSummary = {
  timezone: string;
  symbols: number;
};

type OrderBookTop = {
  bid: [string, string] | null;
  ask: [string, string] | null;
};

function formatError(err: unknown): string {
  if (err instanceof HttpError) return `${err.kind}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

async function postPythonCompute(signal?: AbortSignal) {
  const res = await fetch("http://localhost:8001/compute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      candles: [
        { time: 1, open: 100, high: 105, low: 95, close: 102, volume: 10 },
        { time: 2, open: 102, high: 110, low: 101, close: 108, volume: 12 }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Python HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

export function MarketLab() {
  const [symbol, setSymbol] = React.useState(
    BINANCE.defaultSymbol.toUpperCase()
  );

  const [apiStatus, setApiStatus] = React.useState<ApiStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const [skew, setSkew] = React.useState<string>("Checking…");
  const [exchangeInfo, setExchangeInfo] =
    React.useState<ExchangeInfoSummary | null>(null);

  const [ticker, setTicker] = React.useState<unknown>(null);
  const [orderBook, setOrderBook] = React.useState<OrderBookTop | null>(null);

  const [pythonResponse, setPythonResponse] = React.useState<string>(
    "Waiting for python endpoint…"
  );

  // Startup diagnostics (runs once)
  React.useEffect(() => {
    const controller = new AbortController();

    async function loadStartup() {
      setError(null);
      logBinanceConfig();

      // Python probe (independent)
      try {
        const data = await postPythonCompute(controller.signal);
        setPythonResponse(JSON.stringify(data));
      } catch (err) {
        setPythonResponse(formatError(err));
      }

      // Binance time + exchange info (independent; don’t let one break the other)
      try {
        const serverTime = await getServerTime();
        const skewMs = calculateClockSkewMs(Date.now(), serverTime);
        setSkew(`${skewMs} ms`);
      } catch (err) {
        setSkew("Error");
        setError((prev) => prev ?? `Clock skew: ${formatError(err)}`);
      }

      try {
        const info = await getExchangeInfo();
        setExchangeInfo({
          timezone: info.timezone,
          symbols: info.symbols.length
        });
      } catch (err) {
        setError((prev) => prev ?? `Exchange info: ${formatError(err)}`);
      }
    }

    loadStartup();

    return () => controller.abort();
  }, []);

  // REST probes per symbol
  React.useEffect(() => {
    const controller = new AbortController();

    async function loadSymbol() {
      setError(null);

      try {
        const [ticker24h, depth] = await Promise.all([
          getTicker24h(symbol, { signal: controller.signal }),
          getOrderBook(symbol, 10, { signal: controller.signal })
        ]);

        setApiStatus("ok");
        setTicker(ticker24h);
        setOrderBook({
          bid: depth.bids?.[0] ?? null,
          ask: depth.asks?.[0] ?? null
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        // Decide whether the API is down vs just a “bad request”
        if (err instanceof HttpError && err.kind === "network")
          setApiStatus("down");

        setError(formatError(err));
        // Optional: keep last good data visible, or clear it:
        // setTicker(null);
        // setOrderBook(null);
      }
    }

    loadSymbol();
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

      {apiStatus === "down" && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid",
            borderRadius: 8
          }}
        >
          Binance API unreachable (are you pointing at a local proxy that isn’t
          running?).
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid",
            borderRadius: 8
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

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

      <section>
        <h2>Python Response</h2>
        <pre>{pythonResponse}</pre>
      </section>
    </>
  );
}
