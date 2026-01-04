# Quant Dashboard (Learning Project)

A personal R&D project for building a **professional-grade trading research dashboard** using live exchange data, local compute services, and relational market models.

The focus is on **clean architecture**, **reproducible data pipelines**, and **testable strategy logic**, while keeping the codebase readable and reviewable by other engineers.

This is **not** a production trading system. It is a structured learning and experimentation environment designed to evolve incrementally toward quant-developer tooling.

---

## Tech Stack

### Frontend

- **Next.js (App Router)**
- **React + TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Lightweight Charts** (TradingView) for candlesticks, indicators, and overlays

### Backend / Services

- **Node.js** compute service (Nest-style architecture)
- **Python** research service (indicators, experiments, backtests)
- **PostgreSQL** (local, Dockerised)

### Infrastructure

- **Docker** (local Postgres + services)
- **TablePlus** (database inspection)
- **REST + WebSockets** (Binance market data)
- **SQLite → Postgres** migration path (planned)

---

## Repository Structure

quant-dashboard/
│
├─ src/
│ ├─ app/
│ │ ├─ market-dashboard/
│ │ │ └─ page.tsx
│ │ │ # Primary trading dashboard (charts + strategies)
│ │ │
│ │ ├─ lab/
│ │ │ └─ page.tsx
│ │ │ # Market Lab (diagnostics, experiments, DB inspection)
│ │ │
│ │ ├─ api/
│ │ │ ├─ tracked-symbols/
│ │ │ │ └─ route.ts
│ │ │ ├─ symbol-relationships/
│ │ │ │ └─ route.ts
│ │ │ └─ ...
│ │ │
│ │ └─ ...
│ │
│ ├─ components/
│ │ ├─ features/
│ │ │ └─ market/
│ │ │ ├─ SymbolSelector.tsx
│ │ │ ├─ CandlestickChart.tsx
│ │ │ ├─ CandlestickChartContainer.tsx
│ │ │ └─ ...
│ │ │
│ │ └─ ui/
│ │ └─ ... # shadcn/ui components
│ │
│ ├─ lib/
│ │ ├─ exchanges/
│ │ │ └─ binance/
│ │ │ ├─ marketData.ts
│ │ │ ├─ exchangeInfo.ts
│ │ │ ├─ time.ts
│ │ │ └─ config.ts
│ │ │
│ │ ├─ strategies/
│ │ │ └─ ... # Pure strategy logic (no UI, no IO)
│ │ │
│ │ ├─ api/
│ │ │ └─ ... # Client-side fetch helpers
│ │ │
│ │ └─ service.ts
│ │
│ └─ types/
│ └─ types.ts
│
├─ node/
│ └─ src/
│ └─ ... # Node compute service
│
├─ python/
│ └─ research/
│ └─ src/
│ └─ ... # Python indicators / experiments
│
├─ docker/
│ └─ docker-compose.yml # Local infrastructure (Postgres, services)
│
├─ db/
│ ├─ schema/
│ └─ migrations/
│
├─ packages/
│ └─ shared/ # Shared types / utils (future)
│
└─ README.md

---

## Application Surfaces

### Market Dashboard

The **primary user-facing dashboard**:

- Candlestick charts via Lightweight Charts
- Strategy selection and overlays
- Designed to stay clean and production-oriented

This is where validated strategies ultimately live.

---

### Market Lab

A **diagnostic and experimentation environment** used to:

- Validate Binance REST and WebSocket connectivity
- Check local ↔ exchange clock skew
- Inspect ticker and order book responses
- Verify Python and Node compute bridges
- Debug Postgres-backed data (tracked symbols, relationships)

The Lab is intentionally verbose and transparent.

---

## Data Model (MVP)

### Tracked Symbols

Defines which symbols the app actively supports.

**Table:** `public.tracked_symbols`

- `symbol` (TEXT, PK, uppercase)
- `enabled` (BOOLEAN)
- `added_at` (TIMESTAMPTZ)

Used for:

- UI scoping
- Strategy selection
- Avoiding duplication of full exchange metadata

---

### Symbol Relationships

Describes how symbols influence one another.

**Table:** `public.symbol_relationships`

- `symbol`
- `impactor_symbol`
- `weight`
- `enabled`
- `added_at`

Enables **relationship-aware strategies** such as:

- BTC → ETH tracking
- Lead / lag analysis
- Correlation and divergence detection

---

## Strategy Architecture

Strategies are:

- **Pure functions**
- Isolated from UI, network, and database access
- Fed with prepared candle data and parameters
- Swappable via a strategy dropdown

Example (planned):

- **Relational Tracker** — compares a base symbol against weighted impactors from `symbol_relationships`

Data acquisition and orchestration happens outside the strategy layer.

---

## Philosophy

- Prefer **clarity over cleverness**
- Separate data acquisition from computation
- Keep strategies deterministic and testable
- Build incrementally toward professional quant tooling

This repository is designed to be read by:

- Hiring managers
- Quant developers
- Engineers reviewing architectural decisions

---

## Status

Active, ongoing learning project.

Features are added deliberately, with emphasis on:

- correctness
- debuggability
- architectural hygiene
