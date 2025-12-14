# Quant Dev Learning Roadmap

This repository is a personal learning project focused on building a trading dashboard and research workflow using Binance market data. The goal is to practise real-world quant-dev skills (data, tooling, testing, and simulation) while keeping the codebase clear, modular, and easy to review.

## 0) Objectives

- Build practical skills: market data plumbing, indicators, backtesting, and execution simulation.
- Maintain a public portfolio repo with readable architecture and incremental progress.
- Keep modules educational and testable, with an emphasis on reproducibility and good engineering habits.

## 1) Foundation & Frontend Architecture

Focus: a clean, navigable Next.js app with sensible boundaries.

- Establish monorepo layout (`apps/`, `packages/`, `python/`, `db/`, `docs/`).
- Next.js (App Router) UI with a consistent layout and theme.
- Core pages:
  - Dashboard (charts + controls)
  - Lab (market data sandbox)
  - Backtests (initial results + stubs)
  - Docs (wiki-style notes)
- Shared TypeScript types/utilities in `packages/shared`.
- README + architecture notes.

## 2) Market Data Pipeline

Focus: reliable and reproducible OHLCV data.

- Historical loader (REST) into SQLite/Postgres.
- WebSocket trade/tick capture (optional recorder mode).
- Candle stitching, de-duplication, and gap handling.
- Resampling (1m → 5m/15m/1h).
- Versioned datasets for repeatable backtests.

## 3) Backtesting Engine

Focus: core evaluation metrics and correctness.

- Strategy interface (`onBarClose` first).
- Trade lifecycle + PnL and equity curve.
- Drawdown / max drawdown.
- Sharpe / Sortino.
- Expectancy and win/loss distribution.
- Basic fees + slippage modelling.
- Indicators refactored into pure, reusable modules.

## 4) Strategy Toolkit

Focus: make strategies easy to define and compare.

- Unified hooks (`onCandle`, `onTick`, `onBarClose`).
- Indicator library: RSI, MACD, ATR, VWAP, Donchian, ADX.
- Long/short support and parameterised configs.
- Walk-forward + out-of-sample testing.

## 5) Execution & Simulation Layer

Focus: move beyond “signal-only” backtests.

- Market vs limit orders.
- Spread/fees/slippage and latency modelling.
- Partial fills (simplified) and risk limits.
- Kill-switch and safety constraints for simulations.

## 6) Risk & Portfolio

- Position limits and exposure (% capital at risk).
- Multi-symbol portfolio PnL aggregation.
- Volatility scaling and basic correlation views.

## 7) Arbitrage (Educational Module)

This module is scoped as simulation/learning only.

- Triangular graph exploration and pricing checks.
- Fees/slippage awareness and stale-feed handling.
- Simulated routing and hedging constraints.

## 8) Real-Time Reliability

- WebSocket reconnection + heartbeat monitoring.
- Snapshot + incremental update patterns.
- Structured logging and diagnostics.

## 9) Modelling (Optional)

- Feature engineering (returns/volatility/order flow proxies).
- Simple models with walk-forward validation.

## 10) Engineering Polish

- Config system (YAML/JSON).
- CI tests for indicators/strategies.
- Benchmarks and performance notes.
- Lightweight docs and decision records (ADRs).
