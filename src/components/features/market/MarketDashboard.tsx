"use client";

import React from "react";
import { BINANCE } from "@/lib/exchanges/binance/config";
import {
  BinanceTradeWebSocket,
  type NormalisedTrade
} from "@/lib/exchanges/binance/webSocket";
import { CandlestickChartContainer } from "@/components/features/market/candlestick/CandlestickChartContainer";
import { StrategySelector } from "@/components/features/market/candlestick/StrategySelector";
import type { StrategyId } from "@/types/types";

export function MarketDashboard() {
  // Symbol + interval
  const [selectedSymbol, setSelectedSymbol] = React.useState<string>(
    BINANCE.defaultSymbol.toUpperCase()
  );
  const [interval, setInterval] = React.useState(1);
  const intervalOptions = [1, 3, 5, 15, 30];

  // Strategy
  const [strategyId, setStrategyId] = React.useState<StrategyId>("ma20-cross");

  // Live trade (WS)
  const tradeWsRef = React.useRef<BinanceTradeWebSocket | null>(null);
  const [liveTrade, setLiveTrade] = React.useState<NormalisedTrade | null>(
    null
  );

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

      <header style={{ display: "flex", gap: "1em" }}>
        <label>
          Symbol:
          <input
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
          />
        </label>

        <label>
          Interval:
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          >
            {intervalOptions.map((i) => (
              <option key={i} value={i}>
                {i}m
              </option>
            ))}
          </select>
        </label>

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

      <section>
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
