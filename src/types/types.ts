import type { Time } from "lightweight-charts";

export type HoverInfo = {
  timeLabel: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  ma20?: number;
  ema20?: number;
  bbUpper?: number;
  bbLower?: number;
  rsi14?: number;
};

/**
 * Generic OHLC candle used by the backtest engine.
 * Map your existing Candle type to this shape when you feed the engine.
 */
export type BacktestCandle = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

// -----------------------------
// Strategy selection
// -----------------------------

export type StrategyId =
  | "none"
  | "ma20-cross"
  | "ma20-cross-rev"
  | "ma20-cross-tp-sl"
  | "ma20-trailing-stop";

export type StrategySelectorProps = {
  strategyId: StrategyId;
  setStrategyId: (id: StrategyId) => void;
};

// ---------------------------------
// Trade model (extended but compat)
// ---------------------------------

/**
 * Basic "trade" object for backtesting.
 *
 * NOTE:
 * - Existing code that only uses entry/exit + profit still works.
 * - New fields are optional so you can fill them in incrementally.
 */
export type Trade = {
  entryTime: Time;
  exitTime: Time;
  entryPrice: number;
  exitPrice: number;

  /**
   * Profit IN CURRENCY TERMS for this trade.
   *
   * In the new backtester:
   * - `profit` can be the net P&L after costs for the whole position
   *   (qty included), but we also expose more detailed fields below.
   */
  profit: number;

  // ---------- optional metadata (filled by strategy / backtester) ----------

  symbol?: string;
  side?: "long" | "short";

  /** Position size in units of the asset (e.g. BTC). */
  qty?: number;

  /** Net percentage return on this trade, based on notional. */
  pnlPct?: number;

  /** Total trading fees paid on this trade (both sides). */
  fees?: number;

  /** Gross P&L before *any* costs (currency). */
  profitBeforeCosts?: number;

  /** Slippage cost in currency. */
  slippage?: number;

  /** Spread cost in currency. */
  spreadCost?: number;

  /** Net P&L after all costs (currency). */
  profitAfterCosts?: number;
};

// ------------------------------
// Backtest configuration types
// ------------------------------

export type PositionSizingConfig =
  | {
      mode: "fixed_fraction"; // fraction of equity *per trade*
      fractionOfEquity: number; // e.g. 1 = 100% of equity, 0.5 = 50%, 2 = 200% (uses leverage)
    }
  | {
      mode: "fixed_notional"; // same notional every trade
      notional: number;
    };

export type BacktestConfig = {
  startingBalance: number;
  baseCurrency: string; // e.g. "USDT"

  // Execution cost parameters
  feeRate: number; // e.g. 0.0004 = 4 bps per side
  slippageBps: number; // per *round-trip* or per side depending on your implementation
  spreadBps: number; // per round-trip spread cost

  // Leverage constraints
  maxLeverage: number; // e.g. 1 = no leverage, 3 = up to 3x gross notional vs equity
  allowShort: boolean;

  positionSizing: PositionSizingConfig;
};

// ------------------------------
// Orders, positions, equity
// ------------------------------

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";

export type Order = {
  id: number;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  price?: number; // for limit orders
  time: Time;
};

export type PositionSide = "long" | "short";

export type Position = {
  id: number;
  symbol: string;
  side: PositionSide;
  qty: number;
  entryPrice: number;
  entryTime: Time;
  realisedPnl: number;
  feesPaid: number;
};

export type EquityPoint = {
  time: Time;
  equity: number;
  cash: number;
  positionValue: number;
};

// ------------------------------
// Backtest engine state/result
// ------------------------------

export type BacktestState = {
  config: BacktestConfig;

  cash: number;
  equity: number;
  positions: Position[];
  openOrders: Order[];

  tradeLog: Trade[];
  equityCurve: EquityPoint[];

  nextOrderId: number;
  nextTradeId: number;
};

export type BacktestStats = {
  // core performance
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  sortino: number | null;

  // expectancy / distribution
  winRatePct: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  expectancyPerTradePct: number;
  riskOfRuinPct: number | null;

  // raw PnL distribution
  numTrades: number;
  totalPnl: number;
  avgPnl: number;
  maxWin: number;
  maxLoss: number;
  numWins: number;
  numLosses: number;

  // execution / cost layer (optional for simpler engines)
  totalGrossPnl?: number;
  totalNetPnl?: number;
  totalFees?: number;
  totalSpreadCost?: number;
  totalSlippage?: number;
  totalExecutionCosts?: number;

  // leverage / exposure (optional)
  avgLeverage?: number | null;
  peakLeverage?: number | null;
};

export type BacktestResult = {
  config: BacktestConfig;
  stats: BacktestStats;
  equityCurve: EquityPoint[];
  trades: Trade[];
  drawdowns?: unknown;
  returnSeries?: number[];
};

// --- portfolio-level types ---

export type SymbolBacktestResult = BacktestResult & {
  symbol: string;
};

export type PortfolioBacktestResult = {
  baseCurrency: string;
  startingBalance: number;
  resultsBySymbol: Record<string, SymbolBacktestResult>;
  portfolioEquityCurve: EquityPoint[];
  portfolioStats: BacktestStats;
};

// ------------------------------
// Strategy interface
// ------------------------------

export type StrategyContext = {
  state: BacktestState;
  candle: BacktestCandle;
  /**
   * Pre-computed indicators at this candle.
   * e.g. { rsi14: 63.2, ma20: 43210.1 }
   */
  indicators: Record<string, number | undefined>;
};

export type StrategySignalType =
  | "hold"
  | "enter_long"
  | "exit_long"
  | "enter_short"
  | "exit_short"
  | "flat";

export type StrategySignal = {
  type: StrategySignalType;
};

export type StrategyFn = (ctx: StrategyContext) => StrategySignal;
