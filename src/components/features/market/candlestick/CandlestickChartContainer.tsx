"use client";

import * as React from "react";

import { useKlineHistory } from "./useKlineHistory";
import { useKlineWebSocket } from "./useKlineWebSocket";
import { CandlestickChart } from "./CandlestickChart";

import { type StrategyId } from "@/types/types";
import { type Interval } from "@/components/features/market/IntervalSelector";

type RelationshipRow = {
  symbol: string;
  impactor_symbol: string;
  weight: number;
};

type RelationshipsResponse = {
  symbols: RelationshipRow[];
};

async function getTopImpactorSymbol(
  baseSymbol: string,
  signal?: AbortSignal
): Promise<string | null> {
  const res = await fetch(
    `/api/symbol-relationships?symbol=${encodeURIComponent(baseSymbol)}`,
    { signal, cache: "no-store" }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`symbol-relationships HTTP ${res.status}: ${text}`);
  }

  const data = (await res.json()) as RelationshipsResponse;

  const rows = (data.symbols ?? [])
    .filter((r) => r.symbol === baseSymbol && r.impactor_symbol)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  return rows[0]?.impactor_symbol ?? null;
}

export type CandlestickChartContainerProps = {
  selectedSymbol: string;
  interval: Interval;
  strategyId: StrategyId;
};

export function CandlestickChartContainer({
  selectedSymbol,
  interval,
  strategyId
}: CandlestickChartContainerProps) {
  // Base candles (existing)
  const {
    candles,
    setCandles,
    loading: baseLoading,
    error: baseError
  } = useKlineHistory(selectedSymbol, interval);

  useKlineWebSocket(selectedSymbol, interval, setCandles);

  // Discover impactor symbol
  const [impactorSymbol, setImpactorSymbol] = React.useState<string | null>(
    null
  );
  const [impactorMetaError, setImpactorMetaError] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setImpactorMetaError(null);
        setImpactorSymbol(null);

        const s = await getTopImpactorSymbol(selectedSymbol, controller.signal);
        if (!controller.signal.aborted) setImpactorSymbol(s);
      } catch (e) {
        if (!controller.signal.aborted) {
          setImpactorMetaError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => controller.abort();
  }, [selectedSymbol]);

  // Impactor candles (NEW) — fetched via the same hook
  const {
    candles: impactorCandles,
    loading: impactorLoading,
    error: impactorError
  } = useKlineHistory(impactorSymbol, interval, { enabled: !!impactorSymbol });

  if (baseLoading && candles.length === 0)
    return <div>Loading {interval} candles…</div>;
  if (baseError) return <div>Error: {baseError}</div>;

  return (
    <div className="space-y-2">
      {impactorMetaError ? (
        <div className="text-sm text-amber-500">
          Impactor lookup error: {impactorMetaError}
        </div>
      ) : null}

      {impactorError ? (
        <div className="text-sm text-amber-500">
          Impactor candles error: {impactorError}
        </div>
      ) : null}

      <CandlestickChart
        candles={candles}
        strategyId={strategyId}
        impactorCandles={impactorCandles}
        impactorSymbol={impactorSymbol ?? undefined}
      />

      {/* Optional: tiny debug note */}
      {impactorSymbol ? (
        <div className="text-xs text-muted-foreground">
          Overlay: {impactorSymbol} {impactorLoading ? "(loading…)" : ""}
        </div>
      ) : null}
    </div>
  );
}
