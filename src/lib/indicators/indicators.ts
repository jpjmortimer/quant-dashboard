import type { Time } from "lightweight-charts";

export type TimeValuePoint = {
  time: Time;
  value: number;
};

/**
 * Simple Moving Average (SMA)
 *
 * Given a list of { time, value } points, return a list of
 * { time, value } where each value is the SMA over the last N points.
 */
export function calculateSma(
  data: TimeValuePoint[],
  period: number
): TimeValuePoint[] {
  const result: TimeValuePoint[] = [];
  if (period <= 0 || data.length < period) return result;

  let runningSum = 0;

  for (let i = 0; i < data.length; i++) {
    runningSum += data[i].value;

    if (i >= period) {
      runningSum -= data[i - period].value;
    }

    if (i >= period - 1) {
      result.push({
        time: data[i].time,
        value: runningSum / period
      });
    }
  }

  return result;
}

/**
 * Exponential Moving Average (EMA)
 *
 * Standard EMA with smoothing factor:
 *   k = 2 / (period + 1)
 * Seeded with an SMA over the first N points.
 */
export function calculateEma(
  data: TimeValuePoint[],
  period: number
): TimeValuePoint[] {
  const result: TimeValuePoint[] = [];
  if (period <= 0 || data.length < period) return result;

  const k = 2 / (period + 1);

  // Seed EMA with SMA of first N points
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].value;
  }
  let prevEma = sum / period;

  // First EMA point
  result.push({
    time: data[period - 1].time,
    value: prevEma
  });

  // Roll forward
  for (let i = period; i < data.length; i++) {
    const value = data[i].value;
    const ema = value * k + prevEma * (1 - k);
    prevEma = ema;

    result.push({
      time: data[i].time,
      value: ema
    });
  }

  return result;
}

/**
 * Bollinger Bands
 *
 * Given a list of { time, value } and a period + stdDev multiplier,
 * return middle/upper/lower bands as time series.
 */
export function calculateBollinger(
  data: TimeValuePoint[],
  period: number,
  stdMultiplier: number
): {
  middle: TimeValuePoint[];
  upper: TimeValuePoint[];
  lower: TimeValuePoint[];
} {
  const middle: TimeValuePoint[] = [];
  const upper: TimeValuePoint[] = [];
  const lower: TimeValuePoint[] = [];

  if (period <= 0 || data.length < period) {
    return { middle, upper, lower };
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;

    const windowSlice = data.slice(i - period + 1, i + 1);
    const values = windowSlice.map((p) => p.value);

    const mean = values.reduce((acc, v) => acc + v, 0) / values.length;

    const variance =
      values.reduce((acc, v) => {
        const diff = v - mean;
        return acc + diff * diff;
      }, 0) / values.length;

    const stdDev = Math.sqrt(variance);
    const time = data[i].time;

    middle.push({ time, value: mean });
    upper.push({ time, value: mean + stdMultiplier * stdDev });
    lower.push({ time, value: mean - stdMultiplier * stdDev });
  }

  return { middle, upper, lower };
}
