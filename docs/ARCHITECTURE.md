# Architecture

This repository is a personal learning project for building a trading dashboard and research workflow using cryptocurrency market data (initially Binance). The emphasis is on **clear system boundaries**, **reproducibility**, and **incremental realism**, rather than production trading claims.

The codebase is intentionally structured to resemble professional trading and research systems while remaining easy to review and extend.

---

## Guiding Principles

- **Clarity over cleverness**
  Prefer explicit modules and readable code over abstraction-heavy designs.

- **Separation of concerns**
  UI, domain logic, data ingestion, and research are isolated into distinct layers.

- **Reproducibility**
  Market data ingestion and backtests should be deterministic and repeatable.

- **Incremental realism**
  Execution constraints, fees, and latency are added gradually and clearly labelled as simulation.

---

## High-Level Layout

The repository uses a standard Next.js `src/` layout for the frontend, with top-level folders reserved for backend services, data, and research.

```txt
src/
  app/                  # Next.js App Router pages and layouts
  components/           # React UI components
  lib/                  # Domain logic (exchange adapters, indicators, strategies, backtests)
  types/                # Shared TypeScript domain types

services/
  api/                  # Standalone Node.js API service
  data/                 # Data ingestion / recording services

packages/
  shared/               # Shared TS types & utilities for multi-app reuse

python/
  research/             # Python research, notebooks, experiments

db/
  schema/               # Database schemas and design notes
  migrations/           # SQL migrations
  seeds/                # Seed data

docs/
  ROADMAP.md
  ARCHITECTURE.md
```

---

## Frontend Application (Next.js)

### `src/app`

- Uses **Next.js App Router**
- Defines pages, layouts, and route-level composition
- Pages should remain **thin**, delegating logic to `src/lib`

Typical routes:

- `/` — dashboard entry
- `/lab` — market data sandbox / experiments
- `/wiki` — internal documentation / notes

### `src/components`

UI components only.

Expected evolution:

- `components/layout/` — page shells, navigation, layout
- `components/features/` — domain features (charts, order book, backtest views)
- `components/ui/` — small reusable primitives

Rule of thumb:

- If it knows about markets → `features`
- If it is generic UI → `ui`
- If it arranges pages → `layout`

---

## Domain & Engine Layer

### `src/lib`

This is the **core logic layer** and should remain framework-agnostic wherever possible.

Expected modules:

- `lib/exchanges/`

  - Exchange-specific adapters (e.g. Binance REST / WebSocket)
  - Symbol metadata, filters, time synchronisation
  - Normalisation into internal domain types

- `lib/indicators/`

  - Pure indicator functions (MA, EMA, RSI, MACD, Bollinger, etc.)
  - Deterministic and easily unit-tested

- `lib/strategies/`

  - Strategy interfaces and implementations
  - Consume candles/ticks and emit signals

- `lib/backtest/`

  - Trade lifecycle and PnL calculation
  - Equity curve, drawdown, metrics
  - Fee/slippage/latency modelling (simulation only)

- `lib/http.ts`
  - Shared HTTP utilities (typed fetch, error handling, retries)

The UI **renders outputs** from this layer rather than embedding business logic in components.

---

## Types

### `src/types`

Canonical TypeScript types for:

- Candles, trades, ticks
- Indicator outputs
- Strategy signals
- Backtest results and metrics

Core domain types should live here to avoid duplication and circular dependencies.

---

## Backend Services

### `services/api`

A **standalone Node.js service**, intentionally decoupled from Next.js.

Purpose:

- API endpoints
- Database access
- Background jobs
- Persistence and orchestration

This is _not_ a Next.js route handler. If server routes are needed inside Next, they will live under `src/app/api`.

Likely evolution:

- Fastify / Express / NestJS
- Independent deployment
- Shared types imported from `packages/shared`

### `services/data`

Planned data-focused services:

- Market data ingestion
- Trade/tick recording
- Batch jobs and workers

Keeping data ingestion outside the UI mirrors real trading infrastructure.

---

## Data & Persistence

### `db/`

Persistence is kept explicit and outside application code:

- `schema/` — SQL schemas and design notes
- `migrations/` — versioned schema changes
- `seeds/` — reproducible seed data
- `sqlite/` — local DB files (gitignored)

Near-term:

- SQLite for local development and reproducible datasets

Later:

- Postgres for larger datasets or multi-user scenarios

---

## Python Research Layer

### `python/research`

This folder is intentionally separate from the TypeScript runtime.

Purpose:

- Exploratory analysis
- Alternative backtest implementations
- Feature engineering
- Notebook-driven research

Python code should be structured as importable modules to avoid notebook sprawl.

---

## Conceptual Data Flow

```txt
Exchange REST / WebSocket
        ↓
Exchange Adapters (lib/exchanges)
        ↓
Normalised Domain Types (src/types)
        ↓
Indicators (lib/indicators)
        ↓
Strategies (lib/strategies)
        ↓
Backtest / Simulation (lib/backtest)
        ↓
UI Rendering (src/app + components)
```

---

## Conventions

- Prefer **pure functions** for indicators and metrics
- Keep **exchange-specific logic** behind adapters
- Avoid “fat” React components
- Name folders by **responsibility**, not technology
- Clearly label simulation vs real-world constraints

---

## Repo Hygiene

The following should never be committed:

- `.next/`
- `.env.local`
- `.DS_Store`, `__MACOSX/`
- Local SQLite files under `db/sqlite/`

These should be covered by `.gitignore`.

---

## Scope Disclaimer

This project is educational.
Execution, arbitrage, and trading logic are implemented for **learning and simulation purposes only**, not live trading.
