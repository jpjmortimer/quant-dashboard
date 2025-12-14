import React from "react";
import type { BacktestStats, Trade } from "@/types/types";

type BacktestResultsPanelProps = {
  stats: BacktestStats;
  trades: Trade[];
  startingBalance: number;
};

export function BacktestResultsPanel({
  stats,
  trades,
  startingBalance
}: BacktestResultsPanelProps) {
  // --- Aggregate PnL + cost metrics from trades ---

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
      const gross = t.profitBeforeCosts ?? t.profitAfterCosts ?? t.profit ?? 0;

      const net = t.profitAfterCosts ?? t.profit ?? gross;

      totalGrossPnl += gross;
      totalNetPnl += net;
      totalFees += t.fees ?? 0;
      totalSpread += t.spreadCost ?? 0;
      totalSlippage += t.slippage ?? 0;
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

  // --- Capital & “how big were my trades?” metrics ---

  const capital = React.useMemo(() => {
    if (!trades || trades.length === 0 || startingBalance <= 0) {
      return {
        totalNotional: 0,
        avgNotional: 0,
        maxNotional: 0,
        avgLeverage: 0,
        maxLeverage: 0,
        totalBorrowed: 0,
        avgBorrowedPerTrade: 0
      };
    }

    let totalNotional = 0;
    let maxNotional = 0;
    let totalBorrowed = 0;

    for (const t of trades) {
      const qty = t.qty ?? 1;
      const notional = t.entryPrice * qty; // “value” of the position

      totalNotional += notional;
      if (notional > maxNotional) maxNotional = notional;

      // Rough idea of “how much extra exposure beyond account size”
      const borrowed = Math.max(0, notional - startingBalance);
      totalBorrowed += borrowed;
    }

    const numTrades = trades.length;
    const avgNotional = totalNotional / numTrades;
    const avgLeverage = avgNotional / startingBalance; // e.g. 2× means trade is twice account size
    const maxLeverage = maxNotional / startingBalance;
    const avgBorrowedPerTrade = totalBorrowed / numTrades;

    return {
      totalNotional,
      avgNotional,
      maxNotional,
      avgLeverage,
      maxLeverage,
      totalBorrowed,
      avgBorrowedPerTrade
    };
  }, [trades, startingBalance]);

  const {
    totalNotional,
    avgNotional,
    maxNotional,
    avgLeverage,
    maxLeverage,
    totalBorrowed,
    avgBorrowedPerTrade
  } = capital;

  const format = (value: number, dp = 2) =>
    Number.isFinite(value) ? value.toFixed(dp) : "–";

  const formatX = (value: number, dp = 2) =>
    Number.isFinite(value) ? `${value.toFixed(dp)}×` : "–";

  return (
    <div
      style={{
        fontSize: "0.75rem",
        color: "#e5e7eb",
        backgroundColor: "#020617",
        border: "1px solid #4b5563",
        borderRadius: "4px",
        padding: "0.75rem 0.9rem",
        marginBottom: "0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}
    >
      {/* 1) High-level overview */}
      <section>
        <div style={{ marginBottom: "0.15rem" }}>
          <strong>How did this strategy do overall?</strong>
        </div>
        <p style={{ margin: "0 0 0.35rem", opacity: 0.8 }}>
          A quick summary of wins, losses and risk-adjusted return.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            lineHeight: 1.4
          }}
        >
          <span>
            Trades taken: <strong>{stats.numTrades}</strong>
          </span>
          <span>
            Win rate: <strong>{format(stats.winRatePct, 2)}%</strong>
          </span>
          <span>
            Total return on account:{" "}
            <strong>{format(stats.totalReturnPct, 2)}%</strong>
          </span>
          <span>
            Worst drop from peak (max drawdown):{" "}
            <strong>{format(stats.maxDrawdownPct, 2)}%</strong>
          </span>
          <span>
            Sharpe (return vs choppiness):{" "}
            <strong>
              {stats.sharpe !== null ? format(stats.sharpe, 2) : "–"}
            </strong>
          </span>
          <span>
            Sortino (penalises only downside):{" "}
            <strong>
              {stats.sortino !== null ? format(stats.sortino, 2) : "–"}
            </strong>
          </span>
          <span>
            Average edge per trade:{" "}
            <strong>{format(stats.expectancyPerTradePct, 2)}%</strong>
          </span>
        </div>
      </section>

      {/* 2) Costs */}
      <section>
        <div style={{ marginBottom: "0.15rem" }}>
          <strong>What did fees & execution actually cost me?</strong>
        </div>
        <p style={{ margin: "0 0 0.35rem", opacity: 0.8 }}>
          Gross = before costs. Net = after fees, spread and slippage.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            lineHeight: 1.4
          }}
        >
          <span>
            Profit / loss before costs: <strong>{format(totalGrossPnl)}</strong>
          </span>
          <span>
            Profit / loss after all costs:{" "}
            <strong>{format(totalNetPnl)}</strong>
          </span>
          <span>
            Total fees paid: <strong>{format(totalFees)}</strong>
          </span>
          <span>
            Extra paid in spread: <strong>{format(totalSpread)}</strong>
          </span>
          <span>
            Extra paid in slippage: <strong>{format(totalSlippage)}</strong>
          </span>
          <span>
            All costs combined (fees + spread + slippage):{" "}
            <strong>{format(totalCosts)}</strong>
          </span>
        </div>
      </section>

      {/* 3) Size & “borrowing” */}
      <section>
        <div style={{ marginBottom: "0.15rem" }}>
          <strong>How big were my trades vs my account?</strong>
        </div>
        <p style={{ margin: "0 0 0.35rem", opacity: 0.8 }}>
          Think of “trade size” as the value of the position (price × amount).
          If that’s bigger than your account, you’re effectively using
          leverage/borrowing.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            lineHeight: 1.4
          }}
        >
          <span>
            Account starting size: <strong>{format(startingBalance)}</strong>
          </span>
          <span>
            Typical trade size (average position value):{" "}
            <strong>{format(avgNotional)}</strong>{" "}
            <em>({formatX(avgLeverage)} of account size)</em>
          </span>
          <span>
            Biggest trade taken: <strong>{format(maxNotional)}</strong>{" "}
            <em>({formatX(maxLeverage)} of account size)</em>
          </span>
          <span>
            Total “volume” traded (sum of all position sizes):{" "}
            <strong>{format(totalNotional)}</strong>
          </span>
          <span>
            Extra exposure beyond account per trade (avg):{" "}
            <strong>{format(avgBorrowedPerTrade)}</strong>
          </span>
          <span>
            Extra exposure beyond account across all trades (sum):{" "}
            <strong>{format(totalBorrowed)}</strong>
          </span>
        </div>
      </section>
    </div>
  );
}
