import type {
  Time,
  CandlestickData,
  SingleValueData
} from "lightweight-charts";
import { type Candle } from "@/components/features/market/candlestick/candlestickHelpers";
import type { Trade } from "@/types/types";

type OpenTrade = {
  side: "long" | "short";
  entryTime: Time;
  entryPrice: number;
};

function safe(n: unknown, fallback = 0): number {
  return Number.isFinite(n as number) ? (n as number) : fallback;
}

const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;

const DEFAULTS = {
  // These are in *main price units* because your overlay scales into main units.
  ENTRY_SPREAD: 15, // enter when |spread| is big
  EXIT_SPREAD: 5, // exit when spread converges near 0

  // Ignore bars where impactor barely moved (avoid churn)
  MIN_IMPACTOR_MOVE_PCT: 0.0003,

  // Optional
  ALLOW_SHORT: true,

  // Minimum overlap required to compute k robustly
  MIN_ALIGNED_POINTS: 5
};

function pctReturn(prevClose: number, close: number): number {
  if (!Number.isFinite(prevClose) || prevClose === 0) return 0;
  return (close - prevClose) / prevClose;
}

/**
 * Align impactor candles to the main timeline by timestamp, and compute k such that:
 *   mean(mainClose) ~= mean(impClose * k)
 *
 * This matches your chart overlay logic.
 */
function buildAlignedSeriesAndK(
  formattedCandles: CandlestickData<Time>[],
  impactorCandles: Candle[]
): {
  aligned: Array<{
    time: Time;
    mainClose: number;
    impClose: number;
  }>;
  k: number | null;
} {
  // Map impactor time -> close (seconds)
  const impactorCloseByTime = new Map<number, number>();
  for (const c of impactorCandles) {
    const t = Math.floor(Number(c.openTime) / 1000);
    const close = Number(c.close);
    if (Number.isFinite(t) && Number.isFinite(close)) {
      impactorCloseByTime.set(t, close);
    }
  }

  // Align on main timeline
  const aligned: Array<{ time: Time; mainClose: number; impClose: number }> =
    [];
  for (const c of formattedCandles) {
    const tNum = c.time as number;
    const mainClose = safe(c.close);
    const impClose = impactorCloseByTime.get(tNum);

    if (!Number.isFinite(mainClose)) continue;
    if (impClose === undefined) continue;
    if (!Number.isFinite(impClose)) continue;

    aligned.push({ time: c.time, mainClose, impClose });
  }

  if (aligned.length < DEFAULTS.MIN_ALIGNED_POINTS) {
    return { aligned, k: null };
  }

  const meanLittle = mean(aligned.map((p) => p.mainClose));
  const meanBig = mean(aligned.map((p) => p.impClose));

  if (
    !Number.isFinite(meanLittle) ||
    !Number.isFinite(meanBig) ||
    meanBig === 0
  )
    return { aligned, k: null };

  const k = meanLittle / meanBig;
  return { aligned, k };
}

export function buildImpactedTrades(
  formattedCandles: CandlestickData<Time>[],
  impactorCandles: Candle[] | undefined,
  impactorSymbol: string | undefined,
  _ma20Data: SingleValueData<Time>[],
  _maPeriod: number
): Trade[] {
  const trades: Trade[] = [];

  if (!impactorCandles || impactorCandles.length < 2) return trades;
  if (!formattedCandles || formattedCandles.length < 2) return trades;

  const { aligned, k } = buildAlignedSeriesAndK(
    formattedCandles,
    impactorCandles
  );
  if (!k || aligned.length < 2) return trades;

  let open: OpenTrade | null = null;

  for (let i = 1; i < aligned.length; i++) {
    const prev = aligned[i - 1];
    const curr = aligned[i];

    const prevMain = prev.mainClose;
    const currMain = curr.mainClose;

    const prevImp = prev.impClose;
    const currImp = curr.impClose;

    // Noise filter based on impactor movement (same idea you had)
    const impMove = Math.abs(pctReturn(prevImp, currImp));
    if (impMove < DEFAULTS.MIN_IMPACTOR_MOVE_PCT) continue;

    // The *same* scaled impactor line you plot:
    const currImpScaled = currImp * k;

    // Spread in main-price units:
    //  <0 => main below scaled impact line  (your green long entries)
    //  >0 => main above scaled impact line  (short entries)
    const spread = currMain - currImpScaled;

    // -----------------------
    // EXIT: wait for convergence (spread near 0)
    // -----------------------
    if (open) {
      const hitConvergence = Math.abs(spread) <= DEFAULTS.EXIT_SPREAD;

      if (hitConvergence) {
        const exitPrice = currMain;
        const exitTime = curr.time;

        const profit =
          open.side === "long"
            ? exitPrice - open.entryPrice
            : open.entryPrice - exitPrice;

        trades.push({
          entryTime: open.entryTime,
          exitTime,
          entryPrice: open.entryPrice,
          exitPrice,
          profit,
          side: open.side,
          symbol: impactorSymbol ? `vs ${impactorSymbol}` : undefined
        });

        open = null;
      }

      continue;
    }

    // -----------------------
    // ENTRY: spread extremes
    // -----------------------
    const longSignal = spread <= -DEFAULTS.ENTRY_SPREAD;
    const shortSignal = DEFAULTS.ALLOW_SHORT && spread >= DEFAULTS.ENTRY_SPREAD;

    if (longSignal) {
      open = {
        side: "long",
        entryTime: curr.time,
        entryPrice: currMain
      };
      continue;
    }

    if (shortSignal) {
      open = {
        side: "short",
        entryTime: curr.time,
        entryPrice: currMain
      };
      continue;
    }
  }

  return trades;
}
