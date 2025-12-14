import type { Time } from "lightweight-charts";
import {
  type Trade,
  type EquityPoint,
  type BacktestConfig,
  type BacktestStats,
  type BacktestResult
} from "@/types/types";

type RunBacktestFromTradesOptions = {
  trades: Trade[];
  startingBalance?: number; // default 1_000
  baseCurrency?: string; // e.g. "USDT"
  feeRate?: number;
  spreadBps?: number;
  slippageBps?: number;
};

// ---- simple helpers ----

function buildConfig(
  startingBalance: number,
  baseCurrency: string
): BacktestConfig {
  return {
    startingBalance,
    baseCurrency,

    // Execution costs (tweak later / expose in UI)
    feeRate: 0.0004, // 4 bps per side as an example
    slippageBps: 10, // 0.10% per side
    spreadBps: 5, // 0.05% per side

    // Leverage & sizing
    maxLeverage: 2, // up to 2x notional vs equity
    allowShort: false,
    positionSizing: {
      mode: "fixed_fraction",
      // 100% of equity per trade; if you want to see leverage,
      // try 2.0 (200% of equity, capped by maxLeverage)
      fractionOfEquity: 1
    }
  };
}

function computeMaxDrawdownPct(equityCurve: EquityPoint[]): number {
  if (equityCurve.length === 0) return 0;

  let peak = equityCurve[0].equity;
  let maxDD = 0;

  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = (point.equity - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  return maxDD * 100;
}

function computeReturnSeries(equityCurve: EquityPoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    const curr = equityCurve[i].equity;
    if (prev <= 0) continue;
    returns.push(curr / prev - 1);
  }
  return returns;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) * (v - m), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function computeSharpeAndSortino(returns: number[]): {
  sharpe: number | null;
  sortino: number | null;
} {
  if (returns.length < 2) return { sharpe: null, sortino: null };

  const avg = mean(returns);
  const stdev = stdDev(returns);
  if (stdev === 0) return { sharpe: null, sortino: null };

  const sharpe = (avg / stdev) * Math.sqrt(returns.length);

  const negative = returns.filter((r) => r < 0);
  const downsideDev = stdDev(negative);
  const sortino =
    negative.length === 0 || downsideDev === 0
      ? null
      : (avg / downsideDev) * Math.sqrt(returns.length);

  return { sharpe, sortino };
}

/**
 * Core simulation:
 * - sorts trades in time
 * - applies position sizing + leverage
 * - computes fees, spread, slippage
 * - builds equity curve
 * - returns enriched trades & cost totals
 */
function simulateEquityWithSizing(
  rawTrades: Trade[],
  config: BacktestConfig
): {
  equityCurve: EquityPoint[];
  enrichedTrades: Trade[];
  totalGrossPnl: number;
  totalNetPnl: number;
  totalFees: number;
  totalSpreadCost: number;
  totalSlippage: number;
  avgLeverage: number;
  peakLeverage: number;
} {
  if (rawTrades.length === 0) {
    return {
      equityCurve: [],
      enrichedTrades: [],
      totalGrossPnl: 0,
      totalNetPnl: 0,
      totalFees: 0,
      totalSpreadCost: 0,
      totalSlippage: 0,
      avgLeverage: 0,
      peakLeverage: 0
    };
  }

  // sort by entry time ascending
  const trades = [...rawTrades].sort((a, b) => {
    const ta = a.entryTime as number;
    const tb = b.entryTime as number;
    return ta - tb;
  });

  let equity = config.startingBalance;
  const equityCurve: EquityPoint[] = [];

  const enrichedTrades: Trade[] = [];

  let totalGrossPnl = 0;
  let totalNetPnl = 0;
  let totalFees = 0;
  let totalSpreadCost = 0;
  let totalSlippage = 0;

  let leverageSum = 0;
  let leverageCount = 0;
  let peakLeverage = 0;

  // initial equity point at first trade entry
  const firstEntryTime = trades[0].entryTime as Time;
  equityCurve.push({
    time: firstEntryTime,
    equity,
    cash: equity,
    positionValue: 0
  });

  for (const t of trades) {
    const side: "long" | "short" = t.side ?? "long";

    const entryPrice = t.entryPrice;
    const exitPrice = t.exitPrice;
    if (entryPrice <= 0 || exitPrice <= 0) {
      // skip nonsense trades
      continue;
    }

    // ---- 1) determine notional and qty for this trade ----

    const equityBefore = equity;
    if (equityBefore <= 0) {
      // account blown up; we still push flat equity and skip
      equityCurve.push({
        time: t.exitTime as Time,
        equity,
        cash: equity,
        positionValue: 0
      });
      continue;
    }

    let desiredNotional: number;
    if (config.positionSizing.mode === "fixed_fraction") {
      desiredNotional = equityBefore * config.positionSizing.fractionOfEquity;
    } else {
      desiredNotional = config.positionSizing.notional;
    }

    const maxNotional = equityBefore * config.maxLeverage;
    const notional = Math.min(Math.max(desiredNotional, 0), maxNotional);

    const qty = notional / entryPrice;

    // actual leverage used for this trade
    const tradeLeverage = notional / equityBefore;
    leverageSum += tradeLeverage;
    leverageCount += 1;
    if (tradeLeverage > peakLeverage) peakLeverage = tradeLeverage;

    // ---- 2) gross PnL (before costs) ----

    const priceMovePerUnit =
      side === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;

    const grossPnl = priceMovePerUnit * qty;

    // ---- 3) execution costs (fees + spread + slippage) ----

    const entryNotional = qty * entryPrice;
    const exitNotional = qty * exitPrice;

    const feeRate = config.feeRate ?? 0;
    const slippageFrac = (config.slippageBps ?? 0) / 10_000;
    const spreadFrac = (config.spreadBps ?? 0) / 10_000;

    const fees = feeRate * (entryNotional + exitNotional);
    const slippage = slippageFrac * (entryNotional + exitNotional);
    const spreadCost = spreadFrac * (entryNotional + exitNotional);

    const totalCost = fees + slippage + spreadCost;
    const netPnl = grossPnl - totalCost;

    totalGrossPnl += grossPnl;
    totalNetPnl += netPnl;
    totalFees += fees;
    totalSpreadCost += spreadCost;
    totalSlippage += slippage;

    equity += netPnl;

    const pnlPct = notional !== 0 ? (netPnl / notional) * 100 : 0;

    // ---- 4) record enriched trade & equity point ----

    const enriched: Trade = {
      ...t,
      side,
      qty,
      profitBeforeCosts: grossPnl,
      fees,
      spreadCost,
      slippage,
      profitAfterCosts: netPnl,
      profit: netPnl, // treat `profit` as NET in the rest of the app
      pnlPct
    };

    enrichedTrades.push(enriched);

    equityCurve.push({
      time: t.exitTime as Time,
      equity,
      cash: equity,
      positionValue: 0
    });
  }

  const avgLeverage = leverageCount > 0 ? leverageSum / leverageCount : 0;

  return {
    equityCurve,
    enrichedTrades,
    totalGrossPnl,
    totalNetPnl,
    totalFees,
    totalSpreadCost,
    totalSlippage,
    avgLeverage,
    peakLeverage
  };
}

// trade-level stats (using NET profit; you can adjust if you prefer gross)
function computeTradeStats(trades: Trade[]): {
  winRatePct: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  expectancyPerTradePct: number;

  totalPnl: number;
  avgPnl: number;
  maxWin: number;
  maxLoss: number;
  numWins: number;
  numLosses: number;
} {
  if (trades.length === 0) {
    return {
      winRatePct: 0,
      avgWinPct: 0,
      avgLossPct: 0,
      profitFactor: 0,
      expectancyPerTradePct: 0,
      totalPnl: 0,
      avgPnl: 0,
      maxWin: 0,
      maxLoss: 0,
      numWins: 0,
      numLosses: 0
    };
  }

  const winners = trades.filter((t) => (t.profit ?? 0) > 0);
  const losers = trades.filter((t) => (t.profit ?? 0) <= 0);

  const numWins = winners.length;
  const numLosses = losers.length;

  const winRatePct = (numWins / trades.length) * 100;

  // % move based on trade notional (entryPrice * qty)
  const toPct = (t: Trade) => {
    const qty = t.qty ?? 1;
    const notional = qty * t.entryPrice;
    if (!notional) return 0;
    return ((t.profit ?? 0) / notional) * 100;
  };

  const avgWinPct =
    numWins > 0 ? winners.reduce((acc, t) => acc + toPct(t), 0) / numWins : 0;

  const avgLossPct =
    numLosses > 0
      ? losers.reduce((acc, t) => acc + toPct(t), 0) / numLosses
      : 0;

  const totalPnl = trades.reduce((acc, t) => acc + (t.profit ?? 0), 0);
  const avgPnl = totalPnl / trades.length;

  const maxWin = Math.max(...trades.map((t) => t.profit ?? 0));
  const maxLoss = Math.min(...trades.map((t) => t.profit ?? 0));

  const grossProfit = winners.reduce((acc, t) => acc + (t.profit ?? 0), 0);
  const grossLoss = losers.reduce((acc, t) => acc + (t.profit ?? 0), 0); // negative
  const profitFactor = grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : 0;

  const pWin = numWins / trades.length;
  const pLoss = 1 - pWin;
  const expectancyPerTradePct = avgWinPct * pWin + avgLossPct * pLoss; // avgLossPct is negative

  return {
    winRatePct,
    avgWinPct,
    avgLossPct,
    profitFactor,
    expectancyPerTradePct,
    totalPnl,
    avgPnl,
    maxWin,
    maxLoss,
    numWins,
    numLosses
  };
}

// ---- build full BacktestStats from equity + trades ----

function buildStats(
  trades: Trade[],
  equityCurve: EquityPoint[],
  startingBalance: number,
  costTotals: {
    totalGrossPnl: number;
    totalNetPnl: number;
    totalFees: number;
    totalSpreadCost: number;
    totalSlippage: number;
    avgLeverage: number;
    peakLeverage: number;
  }
): BacktestStats {
  const {
    totalGrossPnl,
    totalNetPnl,
    totalFees,
    totalSpreadCost,
    totalSlippage,
    avgLeverage,
    peakLeverage
  } = costTotals;

  const returns = computeReturnSeries(equityCurve);
  const { sharpe, sortino } = computeSharpeAndSortino(returns);
  const maxDrawdownPct = computeMaxDrawdownPct(equityCurve);

  const finalEquity =
    equityCurve.length > 0
      ? equityCurve[equityCurve.length - 1].equity
      : startingBalance;

  const totalReturnPct =
    startingBalance > 0 ? (finalEquity / startingBalance - 1) * 100 : 0;

  const {
    winRatePct,
    avgWinPct,
    avgLossPct,
    profitFactor,
    expectancyPerTradePct,
    totalPnl,
    avgPnl,
    maxWin,
    maxLoss,
    numWins,
    numLosses
  } = computeTradeStats(trades);

  // super simple risk-of-ruin toy model (as before)
  const lossProb = 1 - winRatePct / 100;
  const avgLossAbs = Math.abs(avgLossPct);
  const ruinThreshold = 50; // -50% equity
  const lossesToRuin =
    avgLossAbs > 0 ? Math.ceil(ruinThreshold / avgLossAbs) : Infinity;
  const riskOfRuinPct =
    isFinite(lossesToRuin) && lossesToRuin > 0
      ? Math.pow(lossProb, lossesToRuin) * 100
      : 0;

  const stats: BacktestStats = {
    // core perf
    totalReturnPct,
    cagrPct: 0, // you can upgrade this later if you track time span
    maxDrawdownPct,
    sharpe,
    sortino,

    // trade stats
    winRatePct,
    avgWinPct,
    avgLossPct,
    profitFactor,
    expectancyPerTradePct,
    riskOfRuinPct,
    numTrades: trades.length,
    totalPnl,
    avgPnl,
    maxWin,
    maxLoss,
    numWins,
    numLosses,

    // execution costs summary
    totalGrossPnl,
    totalNetPnl,
    totalFees,
    totalSpreadCost,
    totalSlippage,
    totalExecutionCosts: totalFees + totalSpreadCost + totalSlippage,

    // leverage summary (if your BacktestStats doesn’t have these yet,
    // you can either add them or ignore these fields)
    avgLeverage,
    peakLeverage
  };

  return stats;
}

// ---- public API ----

export function runBacktestFromTrades(
  options: RunBacktestFromTradesOptions
): BacktestResult {
  const { trades, startingBalance = 1_000, baseCurrency = "USDT" } = options;

  const config = buildConfig(startingBalance, baseCurrency);

  const simulation = simulateEquityWithSizing(trades, config);

  const stats = buildStats(
    simulation.enrichedTrades,
    simulation.equityCurve,
    startingBalance,
    {
      totalGrossPnl: simulation.totalGrossPnl,
      totalNetPnl: simulation.totalNetPnl,
      totalFees: simulation.totalFees,
      totalSpreadCost: simulation.totalSpreadCost,
      totalSlippage: simulation.totalSlippage,
      avgLeverage: simulation.avgLeverage,
      peakLeverage: simulation.peakLeverage
    }
  );

  const result: BacktestResult = {
    config,
    stats,
    equityCurve: simulation.equityCurve,
    trades: simulation.enrichedTrades,
    drawdowns: undefined,
    returnSeries: undefined
  };

  return result;
}
