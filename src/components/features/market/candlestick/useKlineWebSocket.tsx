import React from "react";
import { buildKlineWsUrl, mapWsKlineToCandle } from "./candlestickHelpers";
import type { Candle, BinanceKlineWsMessage } from "./candlestickHelpers";

export function useKlineWebSocket(
  symbol: string,
  interval = "1m",
  updateCandles: React.Dispatch<React.SetStateAction<Candle[]>>
) {
  React.useEffect(() => {
    const url = buildKlineWsUrl(symbol);
    const ws = new WebSocket(url);

    ws.onopen = () => console.log("[KlineWS] open", url);
    ws.onerror = (e) => console.error("[KlineWS] error", e);
    ws.onclose = (e) => console.log("[KlineWS] close", e.code, e.reason);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BinanceKlineWsMessage;
        const newCandle = mapWsKlineToCandle(data);

        updateCandles((prev) => {
          if (prev.length === 0) return [newCandle];

          const last = prev[prev.length - 1];

          // same openTime = update existing candle (forming or final)
          if (last.openTime === newCandle.openTime) {
            const updated = [...prev];
            updated[updated.length - 1] = newCandle;
            return updated;
          }

          // new bar
          return [...prev, newCandle];
        });
      } catch (err) {
        console.error("[KlineWS] parse error", err);
      }
    };

    return () => ws.close(1000, "component unmount");
  }, [symbol, interval, updateCandles]);
}
