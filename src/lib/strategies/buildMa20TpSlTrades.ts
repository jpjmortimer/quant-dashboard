import type {
  Time,
  CandlestickData,
  SingleValueData
} from "lightweight-charts";
import type { Trade } from "@/types/types";

export function buildMa20TpSlTrades(
  formattedCandles: CandlestickData<Time>[],
  ma20Data: SingleValueData<Time>[],
  maPeriod: number
): Trade[] {
  const trades: Trade[] = [];

  if (formattedCandles.length < maPeriod || ma20Data.length === 0) {
    return trades;
  }

  // Config – tweak later / make user-configurable
  const TAKE_PROFIT_PCT = 0.01; // +1%
  const STOP_LOSS_PCT = 0.005; // -0.5%

  // Build time → MA20 map
  const maMap = new Map<number, number>();
  for (const point of ma20Data) {
    const key = point.time as number;
    maMap.set(key, point.value);
  }

  let inTrade = false;
  let entryPrice = 0;
  let entryTime: Time | null = null;

  // Iterate candles from index 1 to detect cross-up entries
  for (let i = 1; i < formattedCandles.length; i++) {
    const prev = formattedCandles[i - 1];
    const curr = formattedCandles[i];

    const prevTime = prev.time as number;
    const currTime = curr.time as number;

    const prevClose = prev.close ?? 0;
    const currClose = curr.close ?? 0;

    const prevMa = maMap.get(prevTime);
    const currMa = maMap.get(currTime);

    if (prevMa === undefined || currMa === undefined) continue;

    if (!inTrade) {
      // ENTRY: cross UP through MA20
      const crossedUp = prevClose < prevMa && currClose > currMa;

      if (crossedUp) {
        inTrade = true;
        entryPrice = currClose;
        entryTime = curr.time;
      }

      continue;
    }

    // We are in a trade – check TP/SL based on CLOSE
    const tpLevel = entryPrice * (1 + TAKE_PROFIT_PCT);
    const slLevel = entryPrice * (1 - STOP_LOSS_PCT);

    const hitTP = currClose >= tpLevel;
    const hitSL = currClose <= slLevel;

    if ((hitTP || hitSL) && entryTime !== null) {
      const exitPrice = currClose;
      const exitTime = curr.time;
      const profit = exitPrice - entryPrice;

      trades.push({
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        profit
      });

      inTrade = false;
      entryTime = null;
      entryPrice = 0;
    }
  }

  return trades;
}
