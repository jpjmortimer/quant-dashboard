import React from "react";
import type { BacktestStats, Trade } from "@/types/types";

type BacktestResultsPanelProps = {
  strategyId: string;
  impactorSymbol?: string;
  stats: BacktestStats;
  trades: Trade[];
  startingBalance: number;
};

type Side = "long" | "short" | "unknown";

type BacktestSummary = {
  meta: {
    strategyId: string;
    impactorSymbol?: string;
    startingBalance: number;
    numTrades: number;
  };

  performance: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    sharpe: number | null;
    sortino: number | null;
    expectancyPerTradePct: number;
    winRatePct: number; // from stats
    winRatePctFromTrades: number; // cross-check
  };

  pnl: {
    totalGrossPnl: number;
    totalNetPnl: number;
    totalFees: number;
    totalSpread: number;
    totalSlippage: number;
    totalCosts: number;
    costDragPctOfGross: number;
  };

  tradeDistribution: {
    numWins: number;
    numLosses: number;
    avgWinPnl: number;
    avgLossPnl: number;
    medianTradePnl: number;
    bestTrade: null | {
      profitAfterCosts: number;
      pnlPct?: number;
      side: Side;
      entryTime: Trade["entryTime"];
      exitTime: Trade["exitTime"];
    };
    worstTrade: null | {
      profitAfterCosts: number;
      pnlPct?: number;
      side: Side;
      entryTime: Trade["entryTime"];
      exitTime: Trade["exitTime"];
    };
  };

  exposure: {
    grossExposureTotal: number;
    avgExposure: number;
    maxExposure: number;

    longCount: number;
    shortCount: number;
    unknownSideCount: number;

    longExposureTotal: number;
    shortExposureTotal: number;
    netExposureProxy: number;

    avgExposureMultipleOfAccount: number;
    maxExposureMultipleOfAccount: number;
  };

  facts: string[];
};

function safeNumber(x: unknown, fallback = 0): number {
  return Number.isFinite(x as number) ? (x as number) : fallback;
}

function tradeNetPnl(t: Trade): number {
  return safeNumber(t.profitAfterCosts ?? t.profit ?? t.profitBeforeCosts ?? 0);
}

function tradeGrossPnl(t: Trade): number {
  return safeNumber(t.profitBeforeCosts ?? t.profitAfterCosts ?? t.profit ?? 0);
}

function tradeSide(t: Trade): Side {
  const s = t.side;
  if (s === "long" || s === "short") return s;
  return "unknown";
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function fmt(value: number, dp = 2): string {
  return Number.isFinite(value) ? value.toFixed(dp) : "–";
}

function fmtPct(value: number, dp = 2): string {
  return Number.isFinite(value) ? `${value.toFixed(dp)}%` : "–";
}

function fmtX(value: number, dp = 2): string {
  return Number.isFinite(value) ? `${value.toFixed(dp)}×` : "–";
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      {label}: <strong className="font-semibold">{value}</strong>
    </span>
  );
}

export function BacktestResultsPanel({
  strategyId,
  impactorSymbol,
  stats,
  trades,
  startingBalance
}: BacktestResultsPanelProps) {
  console.log("strategy: ", strategyId);
  console.log("trades: ", trades);
  // --- Totals (PnL + costs) ---
  const totals = React.useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalGrossPnl: 0,
        totalNetPnl: 0,
        totalFees: 0,
        totalSpread: 0,
        totalSlippage: 0
      };
    }

    let totalGrossPnl = 0;
    let totalNetPnl = 0;
    let totalFees = 0;
    let totalSpread = 0;
    let totalSlippage = 0;

    for (const t of trades) {
      totalGrossPnl += tradeGrossPnl(t);
      totalNetPnl += tradeNetPnl(t);
      totalFees += safeNumber(t.fees ?? 0);
      totalSpread += safeNumber(t.spreadCost ?? 0);
      totalSlippage += safeNumber(t.slippage ?? 0);
    }

    return {
      totalGrossPnl,
      totalNetPnl,
      totalFees,
      totalSpread,
      totalSlippage
    };
  }, [trades]);

  const { totalGrossPnl, totalNetPnl, totalFees, totalSpread, totalSlippage } =
    totals;

  const totalCosts = totalFees + totalSpread + totalSlippage;

  const costDragPctOfGross = React.useMemo(() => {
    const denom = Math.max(Math.abs(totalGrossPnl), 1e-9);
    return (totalCosts / denom) * 100;
  }, [totalCosts, totalGrossPnl]);

  // --- Exposure (short-aware) ---
  const exposure = React.useMemo(() => {
    if (!trades || trades.length === 0 || startingBalance <= 0) {
      return {
        grossExposureTotal: 0,
        avgExposure: 0,
        maxExposure: 0,

        longCount: 0,
        shortCount: 0,
        unknownSideCount: 0,

        longExposureTotal: 0,
        shortExposureTotal: 0,
        netExposureProxy: 0,

        avgExposureMultipleOfAccount: 0,
        maxExposureMultipleOfAccount: 0
      };
    }

    let grossExposureTotal = 0;
    let maxExposure = 0;

    let longCount = 0;
    let shortCount = 0;
    let unknownSideCount = 0;

    let longExposureTotal = 0;
    let shortExposureTotal = 0;

    for (const t of trades) {
      const qty = safeNumber(t.qty ?? 1);
      const notional = safeNumber(t.entryPrice) * qty;

      grossExposureTotal += notional;
      if (notional > maxExposure) maxExposure = notional;

      const s = tradeSide(t);
      if (s === "long") {
        longCount++;
        longExposureTotal += notional;
      } else if (s === "short") {
        shortCount++;
        shortExposureTotal += notional;
      } else {
        unknownSideCount++;
      }
    }

    const avgExposure = grossExposureTotal / trades.length;
    const netExposureProxy = longExposureTotal - shortExposureTotal;

    return {
      grossExposureTotal,
      avgExposure,
      maxExposure,

      longCount,
      shortCount,
      unknownSideCount,

      longExposureTotal,
      shortExposureTotal,
      netExposureProxy,

      avgExposureMultipleOfAccount: avgExposure / startingBalance,
      maxExposureMultipleOfAccount: maxExposure / startingBalance
    };
  }, [trades, startingBalance]);

  // --- Distribution + best/worst ---
  const distribution = React.useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        numWins: 0,
        numLosses: 0,
        avgWinPnl: 0,
        avgLossPnl: 0,
        medianTradePnl: 0,
        bestTrade: null as BacktestSummary["tradeDistribution"]["bestTrade"],
        worstTrade: null as BacktestSummary["tradeDistribution"]["worstTrade"]
      };
    }

    const pnls = trades.map(tradeNetPnl);
    const wins = trades.filter((t) => tradeNetPnl(t) > 0);
    const losses = trades.filter((t) => tradeNetPnl(t) <= 0);

    const avgWinPnl =
      wins.length === 0
        ? 0
        : wins.reduce((a, t) => a + tradeNetPnl(t), 0) / wins.length;

    const avgLossPnl =
      losses.length === 0
        ? 0
        : losses.reduce((a, t) => a + tradeNetPnl(t), 0) / losses.length;

    let best: Trade | null = null;
    let worst: Trade | null = null;

    for (const t of trades) {
      const net = tradeNetPnl(t);
      if (!best || net > tradeNetPnl(best)) best = t;
      if (!worst || net < tradeNetPnl(worst)) worst = t;
    }

    const bestTrade = best
      ? {
          profitAfterCosts: tradeNetPnl(best),
          pnlPct: best.pnlPct,
          side: tradeSide(best),
          entryTime: best.entryTime,
          exitTime: best.exitTime
        }
      : null;

    const worstTrade = worst
      ? {
          profitAfterCosts: tradeNetPnl(worst),
          pnlPct: worst.pnlPct,
          side: tradeSide(worst),
          entryTime: worst.entryTime,
          exitTime: worst.exitTime
        }
      : null;

    return {
      numWins: wins.length,
      numLosses: losses.length,
      avgWinPnl,
      avgLossPnl,
      medianTradePnl: median(pnls),
      bestTrade,
      worstTrade
    };
  }, [trades]);

  // --- Win rate cross-check (from trades) ---
  const winRatePctFromTrades = React.useMemo(() => {
    if (!trades || trades.length === 0) return 0;
    const wins = trades.filter((t) => tradeNetPnl(t) > 0).length;
    return (wins / trades.length) * 100;
  }, [trades]);

  // --- Prompt-friendly summary object ---
  const backtestSummary: BacktestSummary = React.useMemo(() => {
    const numTrades = trades?.length ?? 0;

    const facts: string[] = [
      `Strategy: ${strategyId}${
        impactorSymbol ? ` (impactor: ${impactorSymbol})` : ""
      }`,
      `Trades: ${numTrades}, win rate (from trades): ${winRatePctFromTrades.toFixed(
        2
      )}%`,
      `Net PnL: ${totalNetPnl.toFixed(2)}; Gross PnL: ${totalGrossPnl.toFixed(
        2
      )}; Costs: ${totalCosts.toFixed(2)} (${costDragPctOfGross.toFixed(
        2
      )}% of gross)`,
      `Total return: ${safeNumber(stats.totalReturnPct).toFixed(
        2
      )}%; Max drawdown: ${safeNumber(stats.maxDrawdownPct).toFixed(2)}%`,
      `Longs: ${exposure.longCount}, Shorts: ${exposure.shortCount}, Unknown: ${exposure.unknownSideCount}`,
      `Avg exposure: ${exposure.avgExposure.toFixed(
        2
      )} (${exposure.avgExposureMultipleOfAccount.toFixed(
        2
      )}×); Max exposure: ${exposure.maxExposure.toFixed(
        2
      )} (${exposure.maxExposureMultipleOfAccount.toFixed(2)}×)`,
      `Avg win: ${distribution.avgWinPnl.toFixed(
        2
      )}; Avg loss: ${distribution.avgLossPnl.toFixed(
        2
      )}; Median: ${distribution.medianTradePnl.toFixed(2)}`
    ];

    return {
      meta: {
        strategyId,
        impactorSymbol,
        startingBalance,
        numTrades
      },
      performance: {
        totalReturnPct: safeNumber(stats.totalReturnPct),
        maxDrawdownPct: safeNumber(stats.maxDrawdownPct),
        sharpe: stats.sharpe ?? null,
        sortino: stats.sortino ?? null,
        expectancyPerTradePct: safeNumber(stats.expectancyPerTradePct),
        winRatePct: safeNumber(stats.winRatePct),
        winRatePctFromTrades
      },
      pnl: {
        totalGrossPnl,
        totalNetPnl,
        totalFees,
        totalSpread,
        totalSlippage,
        totalCosts,
        costDragPctOfGross
      },
      tradeDistribution: distribution,
      exposure,
      facts
    };
  }, [
    strategyId,
    impactorSymbol,
    startingBalance,
    trades,
    stats,
    totalGrossPnl,
    totalNetPnl,
    totalFees,
    totalSpread,
    totalSlippage,
    totalCosts,
    costDragPctOfGross,
    exposure,
    distribution,
    winRatePctFromTrades
  ]);

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-md border border-slate-600 bg-slate-950 p-3 text-xs text-slate-200">
      {/* 1) High-level */}
      <section>
        <div className="mb-4">
          <strong className="text-slate-100">{strategyId}</strong>
          {impactorSymbol ? (
            <p className="mt-1 text-slate-300">Impactor: {impactorSymbol}</p>
          ) : null}
        </div>

        <div className="mb-1">
          <strong className="text-slate-100">
            How did this strategy do overall?
          </strong>
        </div>
        <p className="mb-2 text-slate-300">
          A quick summary of wins, losses and risk-adjusted return.
        </p>

        <div className="flex flex-wrap gap-3 leading-snug">
          <Metric label="Trades taken" value={stats.numTrades} />
          <Metric
            label="Win rate (stats)"
            value={fmtPct(stats.winRatePct, 2)}
          />
          <Metric
            label="Win rate (from trades)"
            value={fmtPct(winRatePctFromTrades, 2)}
          />
          <Metric
            label="Total return"
            value={fmtPct(stats.totalReturnPct, 2)}
          />
          <Metric
            label="Max drawdown"
            value={fmtPct(stats.maxDrawdownPct, 2)}
          />
          <Metric
            label="Sharpe"
            value={stats.sharpe !== null ? fmt(stats.sharpe, 2) : "–"}
          />
          <Metric
            label="Sortino"
            value={stats.sortino !== null ? fmt(stats.sortino, 2) : "–"}
          />
          <Metric
            label="Expectancy / trade"
            value={fmtPct(stats.expectancyPerTradePct, 2)}
          />
        </div>
      </section>

      {/* 2) Costs */}
      <section>
        <div className="mb-1">
          <strong className="text-slate-100">
            What did fees & execution actually cost me?
          </strong>
        </div>
        <p className="mb-2 text-slate-300">
          Gross = before costs. Net = after fees, spread and slippage.
        </p>

        <div className="flex flex-wrap gap-3 leading-snug">
          <Metric label="Gross PnL" value={fmt(totalGrossPnl)} />
          <Metric label="Net PnL" value={fmt(totalNetPnl)} />
          <Metric label="Fees" value={fmt(totalFees)} />
          <Metric label="Spread" value={fmt(totalSpread)} />
          <Metric label="Slippage" value={fmt(totalSlippage)} />
          <Metric label="Total costs" value={fmt(totalCosts)} />
          <Metric
            label="Costs as % of gross"
            value={fmtPct(costDragPctOfGross, 2)}
          />
        </div>
      </section>

      {/* 3) Exposure */}
      <section>
        <div className="mb-1">
          <strong className="text-slate-100">
            Exposure & trade sizing (short-aware)
          </strong>
        </div>
        <p className="mb-2 text-slate-300">
          We report gross exposure (price × qty). We don’t infer “borrowed” here
          because shorts and margin behave differently across venues.
        </p>

        <div className="flex flex-wrap gap-3 leading-snug">
          <Metric label="Starting balance" value={fmt(startingBalance)} />
          <Metric
            label="Avg exposure"
            value={
              <>
                {fmt(exposure.avgExposure)}{" "}
                <em className="text-slate-400">
                  ({fmtX(exposure.avgExposureMultipleOfAccount)})
                </em>
              </>
            }
          />
          <Metric
            label="Max exposure"
            value={
              <>
                {fmt(exposure.maxExposure)}{" "}
                <em className="text-slate-400">
                  ({fmtX(exposure.maxExposureMultipleOfAccount)})
                </em>
              </>
            }
          />
          <Metric
            label="Total gross exposure"
            value={fmt(exposure.grossExposureTotal)}
          />
          <Metric
            label="Longs"
            value={
              <>
                {exposure.longCount}{" "}
                <span className="text-slate-400">
                  ({fmt(exposure.longExposureTotal)})
                </span>
              </>
            }
          />
          <Metric
            label="Shorts"
            value={
              <>
                {exposure.shortCount}{" "}
                <span className="text-slate-400">
                  ({fmt(exposure.shortExposureTotal)})
                </span>
              </>
            }
          />
          <Metric
            label="Net exposure proxy"
            value={fmt(exposure.netExposureProxy)}
          />
        </div>
      </section>

      {/* 4) Distribution + LLM payload */}
      <section>
        <div className="mb-1">
          <strong className="text-slate-100">Trade distribution</strong>
        </div>
        <p className="mb-2 text-slate-300">
          Sanity checks: are wins larger than losses? is the median trade
          positive? what were the extremes?
        </p>

        <div className="flex flex-wrap gap-3 leading-snug">
          <Metric label="Wins" value={distribution.numWins} />
          <Metric label="Losses" value={distribution.numLosses} />
          <Metric label="Avg win" value={fmt(distribution.avgWinPnl)} />
          <Metric label="Avg loss" value={fmt(distribution.avgLossPnl)} />
          <Metric
            label="Median trade"
            value={fmt(distribution.medianTradePnl)}
          />
          <Metric
            label="Best trade"
            value={
              distribution.bestTrade
                ? fmt(distribution.bestTrade.profitAfterCosts)
                : "–"
            }
          />
          <Metric
            label="Worst trade"
            value={
              distribution.worstTrade
                ? fmt(distribution.worstTrade.profitAfterCosts)
                : "–"
            }
          />
        </div>

        <details className="mt-2">
          <summary className="cursor-pointer text-slate-300 hover:text-slate-100">
            Backtest summary object (for LLM / copy)
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700 bg-slate-900 p-3 text-[11px] leading-snug text-slate-200">
            {JSON.stringify(backtestSummary, null, 2)}
          </pre>
        </details>
      </section>
    </div>
  );
}
