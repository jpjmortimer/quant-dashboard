import type {
  Time,
  CandlestickData,
  SingleValueData
} from "lightweight-charts";
import type { Trade } from "@/types/types";

/**
 * MA20 cross-down long strategy (mean-reversion flavour):
 *
 *  - Entry (LONG): price crosses DOWN through MA20
 *      previous close > previous MA20
 *      AND current close < current MA20
 *
 *  - Exit: price closes back ABOVE MA20
 *      current close > current MA20
 */
export function buildMa20CrossTradesReverse(
  formattedCandles: CandlestickData<Time>[],
  ma20Data: SingleValueData<Time>[],
  maPeriod: number
): Trade[] {
  const result: Trade[] = [];

  if (formattedCandles.length < maPeriod || ma20Data.length === 0) {
    return result;
  }

  // Map exact candle times -> MA20 value (keyed by Time, no number casts)
  const maMap = new Map<Time, number>();
  for (const point of ma20Data) {
    maMap.set(point.time, point.value);
  }

  let inTrade = false;
  let entryPrice = 0;
  let entryTime: Time | null = null;

  // Start from index 1 so we can look at previous candle for the cross
  for (let i = 1; i < formattedCandles.length; i++) {
    const prev = formattedCandles[i - 1];
    const curr = formattedCandles[i];

    const prevClose = prev.close ?? 0;
    const currClose = curr.close ?? 0;

    const prevMa = maMap.get(prev.time);
    const currMa = maMap.get(curr.time);

    // If we don't have MA values for this pair of candles, skip
    if (prevMa === undefined || currMa === undefined) continue;

    if (!inTrade) {
      // ENTRY: cross DOWN through MA20 (inverse of original cross-UP entry)
      const crossedDown = prevClose > prevMa && currClose < currMa;

      if (crossedDown) {
        inTrade = true;
        entryPrice = currClose;
        entryTime = curr.time;
      }

      continue;
    }

    // If we are in a trade, look for EXIT condition:
    // price closes back ABOVE MA20
    const shouldExit = currClose > currMa;

    if (shouldExit && entryTime !== null) {
      const exitPrice = currClose;
      const exitTime = curr.time;
      const profit = exitPrice - entryPrice; // still LONG

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

  // Open trades at the end are left unfinished (same as your original)
  return result;
}
