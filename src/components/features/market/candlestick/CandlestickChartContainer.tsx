import { useKlineHistory } from "./useKlineHistory";
import { useKlineWebSocket } from "./useKlineWebSocket";
import { CandlestickChart } from "./CandlestickChart";

import { type StrategyId } from "@/types/types";

export type CandlestickChartContainerProps = {
  selectedSymbol: string;
  interval: number;
  strategyId: StrategyId;
};

export function CandlestickChartContainer({
  selectedSymbol,
  interval,
  strategyId
}: CandlestickChartContainerProps) {
  const { candles, setCandles, loading, error } = useKlineHistory(
    selectedSymbol,
    interval
  );

  // live updates
  useKlineWebSocket(selectedSymbol, interval, setCandles);

  if (loading && candles.length === 0) return <div>Loading 1m candles…</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ height: 400 }}>
      <CandlestickChart candles={candles} strategyId={strategyId} />
    </div>
  );
}
