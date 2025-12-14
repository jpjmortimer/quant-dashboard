import type {
  Time,
  CandlestickData,
  SingleValueData
} from "lightweight-charts";
import type { Trade } from "@/types/types";

export function buildMa20TrailingTrades(
  formattedCandles: CandlestickData<Time>[],
  ma20Data: SingleValueData<Time>[],
  maPeriod: number
): Trade[] {
  const trades: Trade[] = [];

  if (formattedCandles.length < maPeriod || ma20Data.length === 0) {
    return trades;
  }

  const TRAIL_PCT = 0.01; // 1% drop from highest close since entry

  // time → MA20 map
  const maMap = new Map<number, number>();
  for (const point of ma20Data) {
    const key = point.time as number;
    maMap.set(key, point.value);
  }

  let inTrade = false;
  let entryPrice = 0;
  let entryTime: Time | null = null;
  let highestCloseSinceEntry = 0;

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
        highestCloseSinceEntry = currClose;
      }

      continue;
    }

    // Update trailing high
    if (currClose > highestCloseSinceEntry) {
      highestCloseSinceEntry = currClose;
    }

    const trailStopLevel = highestCloseSinceEntry * (1 - TRAIL_PCT);
    const hitTrailStop = currClose <= trailStopLevel;

    if (hitTrailStop && entryTime !== null) {
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
      highestCloseSinceEntry = 0;
    }
  }

  return trades;
}
