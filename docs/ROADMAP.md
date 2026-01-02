# Quant Dev Learning Roadmap

This roadmap reflects **what’s already built**, and the **next concrete steps** to get to a
relationship-aware strategy engine quickly, without over-engineering.

The guiding principle:

> **Config in Postgres, computation in backend, strategies stay dumb and composable.**

---

## 0) Objectives

- Build practical skills: market data plumbing, indicators, backtesting, and execution simulation.
- Maintain a public portfolio repo with readable architecture and incremental progress.
- Keep modules educational, testable, and reproducible.
- Bias toward **shipping usable strategy experiments**, not academic perfection.

---

## 1) Foundation & Frontend Architecture ✅ DONE

**Status: DONE**

- Monorepo layout established:
  - `apps/` / `packages/` / `python/` / `db/` / `docs/`
- Next.js App Router UI in place
- Tailwind + shadcn/ui integrated
- Consistent layout + navigation
- Chart rendering using Lightweight Charts
- Feature-level component structure (market, candlestick, indicators)

This is solid and does not need revisiting right now.

---

## 2) Market Data Infrastructure ✅ DONE (LIVE + WS)

**Status: DONE**

- Binance REST adapters implemented
- WebSocket adapters for live trades / klines
- Normalised candle model
- Interval handling and symbol selection
- Clock skew handling and exchange info utilities

This is a strong base. Relationship strategies can reuse this directly.

---

## 3) Indicator Layer ✅ DONE (CORE SET)

**Status: DONE**

- MA / EMA
- RSI
- Bollinger Bands
- Typed indicator outputs
- Indicator overlays rendered in chart

Indicators are now “building blocks” and shouldn’t be tightly coupled to strategies.

---

## 4) Strategy Engine (SINGLE-SYMBOL) ⚠️ PARTIALLY DONE

**Status: IN PROGRESS**

- Strategy abstraction exists
- Strategy switcher wired in UI
- Strategies currently assume **single-symbol input**

This is the pivot point for the next phase.

---

## 5) Backtesting Engine (MODULE 1) ⚠️ PARTIALLY DONE

**Status: IN PROGRESS**

- Generic candle model defined
- Equity curve basics started
- Clear task list already defined:
  - Drawdown
  - Sharpe / Sortino
  - Expectancy
  - Fees / slippage

⚠️ Backtester currently assumes single-symbol strategies.
Relationship logic should be added **before** going deep here.

---

# 🔑 NEXT PHASE: RELATIONSHIP-AWARE STRATEGIES (OPTION A – MVP)

## 6) Tracked Symbols (Option A – Minimal Config Layer) 🆕

**Goal:** Avoid duplicating Binance data while enabling relationships.

### MVP Scope

- Do **NOT** mirror all Binance symbols
- Only store symbols your app actively supports

### Table: `tracked_symbols`

- `symbol` (PK, e.g. `BTCUSDT`)
- `enabled` (bool)
- `added_at`

**Notes**

- Binance `exchangeInfo` remains the source of truth for tick size, step size, status
- This table exists purely for:
  - feature scoping
  - UI selection
  - relationship integrity

---

## 7) Symbol Relationships (Big-Brother Model) 🆕

**Goal:** Express ETH ← BTC style dependencies cleanly.

### Table: `symbol_relationships`

- `id`
- `target_symbol` → `tracked_symbols.symbol`
- `impactor_symbol` → `tracked_symbols.symbol`
- `relationship_type`
  - `CONFIRMATION`
  - `LEAD_LAG`
  - `RELATIVE_VALUE`
- `timeframe`
- `params` (jsonb – thresholds, lookbacks)
- `enabled`

### MVP Rules

- Start with **1 impactor per target**
- One timeframe per relationship
- No graph traversal, no chains

This keeps it simple and extendable later.

---

## 8) Relationship Feature Computation (BACKEND) 🆕

**Goal:** Compute reusable features once, server-side.

### Computed On Demand (MVP)

- Rolling correlation (returns)
- Rolling beta
- Simple lead/lag scan (±1–3 bars)
- Optional spread / residual

### Where this lives

- Node backend (Next route handlers or `apps/api`)
- Shared utilities used by:
  - backtests
  - live strategy runs

⚠️ No frontend computation.

---

## 9) Strategy Engine v2 (RELATIONSHIP-AWARE) 🆕

**Upgrade Strategy Interface**
Strategies receive:

- Target candles
- Impactor candles
- Precomputed relationship features

### MVP Strategies

1. **BTC Confirmation Filter**

   - ETH strategy only fires if BTC trend agrees

2. **Simple Lead-Lag Trigger**

   - BTC moves first, ETH hasn’t → short-lived ETH entry

3. **Regime Filter**
   - Disable / downsize strategies when correlation breaks

These are realistic, defensible, and interview-safe.

---

## 10) UI: Relationship Visibility 🆕

**Goal:** Make the system observable.

- Show active relationships for selected symbol
- Display:
  - corr
  - beta
  - lead bars
- Toggle relationships on/off
- No editing UI needed initially (seed via SQL)

---

## 11) Backtesting Engine (MODULE 2) 🔜

Now that strategies can be multi-symbol:

- Run backtests with relationship context
- Measure:
  - edge decay
  - regime sensitivity
  - fee sensitivity

This is where the project starts to look “real”.

---

## 12) Optional Later Extensions (INTENTIONALLY DEFERRED)

- Persist candles to Postgres
- Relationship stats caching
- Python batch recompute jobs
- Sentiment / alternative data
- ML models

⚠️ These are **explicitly not MVP**.

---

## Summary (Why This Path Works)

- No duplicated Binance data
- Minimal DB schema
- Fast path to strategy experimentation
- Clean separation:
  - config (DB)
  - computation (backend)
  - visualisation (frontend)

This gets you to a **credible relationship-aware strategy tracker** quickly, while keeping the door wide open for deeper quant work later.
