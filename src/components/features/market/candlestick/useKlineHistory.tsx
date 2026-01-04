import React from "react";

import {
  getKlinesXm,
  type Candle
} from "@/components/features/market/candlestick/candlestickHelpers";

export function useKlineHistory(
  symbol: string | null | undefined,
  interval = "1m",
  opts?: { enabled?: boolean }
) {
  const enabled = opts?.enabled ?? true;

  const [candles, setCandles] = React.useState<Candle[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled || !symbol) {
      // when disabled, reset to a clean state
      setCandles([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // If getKlinesXm doesn't accept a signal, that's fine — we still guard with abort below.
        const result = await getKlinesXm(symbol, interval);

        if (!controller.signal.aborted) {
          setCandles(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError((err as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [symbol, interval, enabled]);

  return { candles, setCandles, loading, error };
}
