# Quant Dashboard (Learning Project)

A personal learning repository for building a trading dashboard and research workflow using Binance market data.
The focus is on clean architecture, reproducible data pipelines, and testable strategy and backtesting modules.

This project is designed to evolve incrementally toward professional quant-developer tooling and to remain readable and reviewable by other engineers.

---

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript
- **State Management:** Redux Toolkit
- **Backend (planned):** Node.js (API and data services)
- **Research & Modelling (planned):** Python (indicators, backtests, experiments)
- **Data Storage (planned):** SQLite (local), Postgres (later)

---

## Repository Structure

- `apps/web` — Next.js UI (dashboard, lab, backtests)
- `apps/api` — Node.js API (planned)
- `services/data` — market data ingestion and recording services (planned)
- `packages/shared` — shared TypeScript types and utilities
- `python/research` — Python research and backtesting modules (planned)
- `db` — schemas, migrations, and seed data (planned)
- `docs` — roadmap and architecture notes

---

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Then open:

```
http://localhost:3000
```

---

## Development Principles

- Explicit, modular architecture
- Reproducible data and backtests
- Clear separation between UI, data, and research layers
- Small, readable commits
- Educational focus over production trading claims

---

## Commit Style

Commits follow a lightweight conventional format:

- `feat:` new functionality
- `fix:` bug fixes
- `refactor:` internal restructuring without behaviour change
- `test:` add or update tests
- `docs:` documentation updates
- `chore:` tooling, config, or housekeeping

Examples:

- `feat(web): add symbol switcher`
- `fix(data): handle websocket reconnect backoff`
- `refactor(shared): normalise candle types`

---

## Notes

This repository is a **learning and portfolio project**.
Execution, arbitrage, and strategy modules are implemented for **educational and simulation purposes only**.
