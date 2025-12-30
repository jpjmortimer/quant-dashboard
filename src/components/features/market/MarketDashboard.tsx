// MarketDashboard.tsx
// - fetch symbol universe from getExchangeInfo().symbols
// - feed into <SymbolSelector />
// - ensure selectedSymbol is valid once symbols load
// - keep WS reconnect behaviour the same
//
// NOTE: This assumes your getExchangeInfo() returns objects like:
// { symbols: Array<{ symbol: string; status: string; quoteAsset: string; ... }> }

"use client";

import React from "react";
import { BINANCE } from "@/lib/exchanges/binance/config";
import { getExchangeInfo } from "@/lib/exchanges/binance/exchangeInfo";
import {
  BinanceTradeWebSocket,
  type NormalisedTrade
} from "@/lib/exchanges/binance/webSocket";
import { CandlestickChartContainer } from "@/components/features/market/candlestick/CandlestickChartContainer";
import { StrategySelector } from "@/components/features/market/candlestick/StrategySelector";
import type { StrategyId } from "@/types/types";
import { SymbolSelector } from "@/components/features/market/SymbolSelector";
import {
  IntervalSelector,
  type Interval
} from "@/components/features/market/IntervalSelector";

export function MarketDashboard() {
  // Symbol + interval
  const [selectedSymbol, setSelectedSymbol] = React.useState<string>(
    BINANCE.defaultSymbol.toUpperCase()
  );

  const [interval, setInterval] = React.useState<Interval>("1m");

  // ✅ symbol universe from exchangeInfo
  const [symbols, setSymbols] = React.useState<string[]>([]);
  const [symbolsLoading, setSymbolsLoading] = React.useState<boolean>(true);
  const [symbolsError, setSymbolsError] = React.useState<string | null>(null);

  // Strategy
  const [strategyId, setStrategyId] = React.useState<StrategyId>("ma20-cross");

  // Live trade (WS)
  const tradeWsRef = React.useRef<BinanceTradeWebSocket | null>(null);
  const [liveTrade, setLiveTrade] = React.useState<NormalisedTrade | null>(
    null
  );

  // Load symbol universe once
  React.useEffect(() => {
    let cancelled = false;

    async function loadSymbols() {
      try {
        setSymbolsLoading(true);
        setSymbolsError(null);

        const info = await getExchangeInfo();

        // OPTION A: all symbols
        // const all = info.symbols.map((s) => s.symbol);

        // OPTION B (recommended): only TRADING + USDT quote
        const filtered = info.symbols
          .filter((s) => s.status === "TRADING" && s.quoteAsset === "USDT")
          .map((s) => s.symbol);

        if (cancelled) return;

        setSymbols(filtered);

        // Ensure current selectedSymbol exists in list
        setSelectedSymbol((prev) => {
          const next = prev?.toUpperCase?.() ?? "";
          if (filtered.includes(next)) return next;

          const def = BINANCE.defaultSymbol.toUpperCase();
          if (filtered.includes(def)) return def;

          return filtered[0] ?? next;
        });
      } catch (err) {
        if (cancelled) return;
        setSymbolsError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setSymbolsLoading(false);
      }
    }

    loadSymbols();
    return () => {
      cancelled = true;
    };
  }, []);

  // WebSocket: trade stream per symbol
  React.useEffect(() => {
    if (!selectedSymbol) return;

    const wsSymbol = selectedSymbol.toLowerCase();
    let backoff = 500;
    let closedByUser = false;
    let retryTimer: number | null = null;

    const connect = () => {
      const ws = new BinanceTradeWebSocket({
        symbol: wsSymbol,
        onTrade: setLiveTrade,
        onOpen: () => {
          backoff = 500;
          setLiveTrade(null);
        },
        onClose: () => {
          if (!closedByUser) {
            backoff = Math.min(10_000, backoff * 2);
            retryTimer = window.setTimeout(connect, backoff);
          }
        }
      });

      tradeWsRef.current = ws;
      ws.connect();
    };

    connect();

    return () => {
      closedByUser = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      tradeWsRef.current?.close();
      tradeWsRef.current = null;
    };
  }, [selectedSymbol]);

  return (
    <>
      <h1>Market Dashboard — {selectedSymbol}</h1>

      <header className="mb-6 flex flex-wrap gap-4">
        {symbolsLoading ? (
          <div className="text-sm opacity-70">Loading symbols…</div>
        ) : symbolsError ? (
          <div className="text-sm text-red-600">
            Symbol list failed: {symbolsError}
          </div>
        ) : symbols.length === 0 ? (
          <div className="text-sm opacity-70">No symbols available.</div>
        ) : (
          <SymbolSelector
            symbols={symbols}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
          />
        )}

        <IntervalSelector interval={interval} setInterval={setInterval} />

        <StrategySelector
          strategyId={strategyId}
          setStrategyId={setStrategyId}
        />
      </header>

      <CandlestickChartContainer
        selectedSymbol={selectedSymbol}
        interval={interval}
        strategyId={strategyId}
      />

      <section className="mt-6">
        <h2>Live Trade</h2>
        {!liveTrade ? (
          <p>Waiting for trade…</p>
        ) : (
          <pre>{JSON.stringify(liveTrade, null, 2)}</pre>
        )}
      </section>
    </>
  );
}
