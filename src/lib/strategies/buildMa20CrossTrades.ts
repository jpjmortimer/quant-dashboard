/**
 * MA20 cross strategy:
 *
 *  - Entry: price crosses UP through MA20
 *      previous close < previous MA20
 *      AND current close > current MA20
 *
 *  - Exit: price closes back BELOW MA20
 *      current close < current MA20
 *
 * This is *deliberately simple* and only meant for learning.
 */

import type {
  Time,
  CandlestickData,
  SingleValueData
} from "lightweight-charts";

import type { Trade } from "@/types/types";

export function buildMa20CrossTrades(
  formattedCandles: CandlestickData<Time>[],
  ma20Data: SingleValueData<Time>[],
  maPeriod: number
): Trade[] {
  const result: Trade[] = [];

  if (formattedCandles.length < maPeriod || ma20Data.length === 0) {
    return result;
  }

  // Build a lookup: UTCTimestamp (number seconds) -> MA20 value
  const maMap = new Map<number, number>();
  for (const point of ma20Data) {
    const key = point.time as number;
    maMap.set(key, point.value);
  }

  let inTrade = false;
  let entryPrice = 0;
  let entryTime: Time | null = null;

  // Start from index 1 so we can look at previous candle for the cross-up
  for (let i = 1; i < formattedCandles.length; i++) {
    const prev = formattedCandles[i - 1];
    const curr = formattedCandles[i];

    const prevTime = prev.time as number;
    const currTime = curr.time as number;

    const prevClose = prev.close ?? 0;
    const currClose = curr.close ?? 0;

    const prevMa = maMap.get(prevTime);
    const currMa = maMap.get(currTime);

    // If we don't have MA values for this pair of candles, skip
    if (prevMa === undefined || currMa === undefined) continue;

    if (!inTrade) {
      // ENTRY condition:
      // Previous close below MA, current close above MA -> cross UP through MA
      const crossedUp = prevClose < prevMa && currClose > currMa;

      if (crossedUp) {
        inTrade = true;
        entryPrice = currClose;
        entryTime = curr.time;
      }

      continue;
    }

    // If we are in a trade, look for EXIT condition:
    // price closes back below MA20
    const shouldExit = currClose < currMa;

    if (shouldExit && entryTime !== null) {
      const exitPrice = currClose;
      const exitTime = curr.time;
      const profit = exitPrice - entryPrice;

      result.push({
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        profit
      });

      // Reset position state
      inTrade = false;
      entryTime = null;
      entryPrice = 0;
    }
  }

  // Note: if inTrade is still true at the end, we leave it open
  // and do not include it in result. In a live system you'd
  // decide how to handle currently-open positions.

  return result;
}
