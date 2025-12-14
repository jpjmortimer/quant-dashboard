import type { Time } from "lightweight-charts";
import {
  type Trade,
  type EquityPoint,
  type BacktestResult,
  type BacktestStats,
  type PortfolioBacktestResult,
  type SymbolBacktestResult
} from "@/types/types";
import { runBacktestFromTrades } from "./fromTrades";

// --- merge helpers ---

function mergeEquityCurves(
  curvesBySymbol: Record<string, EquityPoint[]>
): EquityPoint[] {
  const allTimes = new Set<Time>();

  Object.values(curvesBySymbol).forEach((curve) => {
    curve.forEach((pt) => allTimes.add(pt.time));
  });

  const sortedTimes = Array.from(allTimes).sort(
    (a, b) => (a as number) - (b as number)
  );

  const lastEquityBySymbol: Record<string, number> = {};
  const portfolioCurve: EquityPoint[] = [];

  for (const t of sortedTimes) {
    let totalEquity = 0;

    for (const [symbol, curve] of Object.entries(curvesBySymbol)) {
      // find last point at or before t
      const ptsUpToT = curve.filter(
        (pt) => (pt.time as number) <= (t as number)
      );
      if (ptsUpToT.length > 0) {
        const lastPt = ptsUpToT[ptsUpToT.length - 1];
        lastEquityBySymbol[symbol] = lastPt.equity;
      }

      totalEquity += lastEquityBySymbol[symbol] ?? 0;
    }

    portfolioCurve.push({
      time: t,
      equity: totalEquity,
      cash: totalEquity,
      positionValue: 0
    });
  }

  return portfolioCurve;
}

function aggregateStats(
  startingBalance: number,
  portfolioCurve: EquityPoint[],
  allTrades: Trade[],
  perSymbolResults: Record<string, SymbolBacktestResult>
): BacktestStats {
  if (portfolioCurve.length === 0) {
    // fall back to zeros
    const zeroStats = Object.values(perSymbolResults)[0]?.stats;
    if (zeroStats) {
      return { ...zeroStats, numTrades: 0, totalPnl: 0, totalNetPnl: 0 };
    }

    // ultra-defensive
    return {
      totalReturnPct: 0,
      cagrPct: 0,
      maxDrawdownPct: 0,
      sharpe: null,
      sortino: null,
      winRatePct: 0,
      avgWinPct: 0,
      avgLossPct: 0,
      profitFactor: 0,
      expectancyPerTradePct: 0,
      riskOfRuinPct: null,
      numTrades: 0,
      totalPnl: 0,
      avgPnl: 0,
      maxWin: 0,
      maxLoss: 0,
      numWins: 0,
      numLosses: 0,
      totalGrossPnl: 0,
      totalNetPnl: 0,
      totalFees: 0,
      totalSpreadCost: 0,
      totalSlippage: 0,
      totalExecutionCosts: 0,
      avgLeverage: null,
      peakLeverage: null
    };
  }

  const firstEquity = portfolioCurve[0].equity;
  const lastEquity = portfolioCurve[portfolioCurve.length - 1].equity;
  const totalReturnPct = ((lastEquity - firstEquity) / firstEquity) * 100;

  // reuse logic from your single-asset backtester where possible;
  // here we do a light-weight recompute using the equity curve:

  // simple max drawdown
  let peak = portfolioCurve[0].equity;
  let maxDD = 0;
  for (const pt of portfolioCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = (pt.equity - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  const maxDrawdownPct = maxDD * 100;

  // simple per-trade distribution
  const winners = allTrades.filter((t) => (t.profitAfterCosts ?? t.profit) > 0);
  const losers = allTrades.filter((t) => (t.profitAfterCosts ?? t.profit) <= 0);

  const numTrades = allTrades.length;
  const numWins = winners.length;
  const numLosses = losers.length;

  const totalNetPnl = allTrades.reduce(
    (acc, t) => acc + (t.profitAfterCosts ?? t.profit),
    0
  );
  const avgPnl = numTrades > 0 ? totalNetPnl / numTrades : 0;
  const maxWin =
    numTrades > 0
      ? Math.max(...allTrades.map((t) => t.profitAfterCosts ?? t.profit))
      : 0;
  const maxLoss =
    numTrades > 0
      ? Math.min(...allTrades.map((t) => t.profitAfterCosts ?? t.profit))
      : 0;

  const winRatePct = numTrades > 0 ? (numWins / numTrades) * 100 : 0;

  // aggregate costs & leverage from symbol stats
  let totalGrossPnl = 0;
  let totalFees = 0;
  let totalSpreadCost = 0;
  let totalSlippage = 0;
  let totalExecutionCosts = 0;

  const leverageValues: number[] = [];

  Object.values(perSymbolResults).forEach((res) => {
    totalGrossPnl += res.stats.totalGrossPnl ?? 0;
    totalFees += res.stats.totalFees ?? 0;
    totalSpreadCost += res.stats.totalSpreadCost ?? 0;
    totalSlippage += res.stats.totalSlippage ?? 0;
    totalExecutionCosts += res.stats.totalExecutionCosts ?? 0;

    if (res.stats.avgLeverage != null) {
      leverageValues.push(res.stats.avgLeverage);
    }
    if (res.stats.peakLeverage != null) {
      leverageValues.push(res.stats.peakLeverage);
    }
  });

  const avgLeverage =
    leverageValues.length > 0
      ? leverageValues.reduce((a, b) => a + b, 0) / leverageValues.length
      : null;
  const peakLeverage =
    leverageValues.length > 0 ? Math.max(...leverageValues) : null;

  // we keep some fields (Sharpe, Sortino, risk-of-ruin) null for now, or you
  // can back-compute later from the portfolio return series.
  return {
    totalReturnPct,
    cagrPct: 0,
    maxDrawdownPct,
    sharpe: null,
    sortino: null,
    winRatePct,
    avgWinPct: 0,
    avgLossPct: 0,
    profitFactor: 0,
    expectancyPerTradePct: 0,
    riskOfRuinPct: null,
    numTrades,
    totalPnl: totalNetPnl,
    avgPnl,
    maxWin,
    maxLoss,
    numWins,
    numLosses,
    totalGrossPnl,
    totalNetPnl,
    totalFees,
    totalSpreadCost,
    totalSlippage,
    totalExecutionCosts,
    avgLeverage,
    peakLeverage
  };
}

// --- public API ---

export function runPortfolioBacktest(options: {
  tradesBySymbol: Record<string, Trade[]>;
  startingBalance?: number;
  baseCurrency?: string;
}): PortfolioBacktestResult {
  const {
    tradesBySymbol,
    startingBalance = 10_000,
    baseCurrency = "USDT"
  } = options;

  const symbols = Object.keys(tradesBySymbol);
  if (symbols.length === 0) {
    return {
      baseCurrency,
      startingBalance,
      resultsBySymbol: {},
      portfolioEquityCurve: [],
      portfolioStats: aggregateStats(startingBalance, [], [], {})
    };
  }

  const perSymbolStart = startingBalance / symbols.length;

  const resultsBySymbol: Record<string, SymbolBacktestResult> = {};
  const curvesBySymbol: Record<string, EquityPoint[]> = {};
  const allTrades: Trade[] = [];

  for (const symbol of symbols) {
    const trades = tradesBySymbol[symbol];
    const result: BacktestResult = runBacktestFromTrades({
      trades,
      startingBalance: perSymbolStart,
      baseCurrency
    });

    resultsBySymbol[symbol] = {
      ...result,
      symbol
    };

    curvesBySymbol[symbol] = result.equityCurve;
    allTrades.push(...trades);
  }

  const portfolioEquityCurve = mergeEquityCurves(curvesBySymbol);
  const portfolioStats = aggregateStats(
    startingBalance,
    portfolioEquityCurve,
    allTrades,
    resultsBySymbol
  );

  return {
    baseCurrency,
    startingBalance,
    resultsBySymbol,
    portfolioEquityCurve,
    portfolioStats
  };
}
