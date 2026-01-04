import type {
  Time,
  CandlestickData,
  SingleValueData
} from "lightweight-charts";
import type { StrategyId, Trade } from "@/types/types";

import { type Candle } from "@/components/features/market/candlestick/candlestickHelpers";

import { buildMa20CrossTrades } from "./buildMa20CrossTrades";
import { buildMa20CrossTradesReverse } from "./buildMa20CrossTradesReverse";
import { buildMa20TpSlTrades } from "./buildMa20TpSlTrades";
import { buildMa20TrailingTrades } from "./buildMa20TrailingTrades";
import { buildImpactedTrades } from "./buildImpactedTrades";

type BuildTradesArgs = {
  strategyId: StrategyId;
  formattedCandles: CandlestickData<Time>[];
  impactorCandles?: Candle[] | undefined;
  impactorSymbol?: string;
  ma20Data: SingleValueData<Time>[];
  maPeriod: number;
};

/**
 * Public entry point: given a strategy id + price data + indicators,
 * return a list of completed trades.
 */
export function buildTradesForStrategy({
  strategyId,
  formattedCandles,
  impactorCandles,
  impactorSymbol,
  ma20Data,
  maPeriod
}: BuildTradesArgs): Trade[] {
  switch (strategyId) {
    case "ma20-cross":
      return buildMa20CrossTrades(formattedCandles, ma20Data, maPeriod);

    case "ma20-cross-rev":
      return buildMa20CrossTradesReverse(formattedCandles, ma20Data, maPeriod);

    case "ma20-cross-tp-sl":
      return buildMa20TpSlTrades(formattedCandles, ma20Data, maPeriod);

    case "ma20-trailing-stop":
      return buildMa20TrailingTrades(formattedCandles, ma20Data, maPeriod);

    case "relational-tracker":
      return buildImpactedTrades(
        formattedCandles,
        impactorCandles,
        impactorSymbol,
        ma20Data,
        maPeriod
      );

    case "none":
    default:
      return [];
  }
}
