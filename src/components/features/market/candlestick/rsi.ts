import type { Candle } from "./candlestickHelpers";

export type RsiPoint = {
  time: number; // Unix seconds (to match your chart's Time)
  value: number; // 0–100
};

/**
 * Wilder-style RSI (default period = 14).
 *
 * Input:  raw Candle[]
 * Output: array of { time, value } where time is in SECONDS since epoch.
 */
export function calculateRsi(candles: Candle[], period = 14): RsiPoint[] {
  if (candles.length < period + 1) {
    return [];
  }

  const closes = candles.map((c) => Number(c.close));
  const timesSec = candles.map((c) => Math.floor(c.openTime / 1000));

  let gainSum = 0;
  let lossSum = 0;

  // Seed average gain & loss using first `period` diffs
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      gainSum += diff;
    } else {
      lossSum -= diff; // diff negative
    }
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const result: RsiPoint[] = [];

  const pushPoint = (idx: number) => {
    if (avgLoss === 0) {
      result.push({ time: timesSec[idx], value: 100 });
      return;
    }
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    result.push({ time: timesSec[idx], value: rsi });
  };

  // First RSI value at index `period`
  pushPoint(period);

  // Subsequent values using Wilder smoothing
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    pushPoint(i);
  }

  return result;
}
