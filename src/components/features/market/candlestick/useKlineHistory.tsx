import React from "react";

import {
  getKlinesXm,
  type Candle
} from "@/components/features/market/candlestick/candlestickHelpers";

export function useKlineHistory(symbol: string, interval = "1m") {
  const [candles, setCandles] = React.useState<Candle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await getKlinesXm(symbol, interval);
        if (!cancelled) setCandles(result);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, interval]);

  return { candles, setCandles, loading, error };
}
