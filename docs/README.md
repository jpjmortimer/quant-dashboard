# Quant Dashboard (Learning Project)

A personal learning repository for building a trading dashboard and research workflow using Binance market data.

The focus is on clean architecture, reproducible data pipelines, and testable research and strategy components, while keeping the codebase readable and reviewable by other engineers.

This project is designed to evolve incrementally toward professional quant-developer tooling rather than a finished trading system.

---

## Tech Stack

- Frontend: Next.js (App Router), React, TypeScript
- UI: Tailwind CSS + shadcn/ui (Radix UI primitives + CVA variants)
- State Management: Redux Toolkit
- API / Orchestration: Node.js + NestJS
- Research & Compute: Python (FastAPI-based research service)
- Data Storage (planned): SQLite (local), Postgres (later)

---

## Repository Structure

.
├─ apps/
│ ├─ web/ # Next.js UI (dashboard, market lab, backtests)
│ └─ api/ # Next.js route handlers / server-side proxies
├─ node/ # Node / NestJS research & diagnostics service
├─ python/ # Python research & compute service (FastAPI)
├─ packages/
│ └─ shared/ # Shared TypeScript types & utilities
├─ db/ # Schemas, migrations, seed data (planned)
├─ docs/ # Roadmap, decisions, architecture notes

---

## UI Components (shadcn/ui)

This repository uses shadcn/ui for UI primitives such as Card, Button, Badge, Input, Table, and Tabs.

Important: shadcn/ui is NOT a runtime dependency or component library.
It is a code generator that copies React components directly into the repository.
Once generated, the components are fully owned by this codebase and can be edited freely.

The generated components live in:

- apps/web/src/components/ui/

They are built using:

- Tailwind CSS for styling
- Radix UI for accessible behaviour
- class-variance-authority (CVA) for variants
- cn() utility from lib/utils for class merging

### Adding more UI components

If shadcn is already initialised (components.json exists), new components can be added with:

npx shadcn@latest add alert dialog dropdown-menu tooltip table tabs

To verify or change where components are generated, inspect:

- components.json (aliases and ui path)

---

## Node Research Service (NestJS)

A lightweight NestJS service used as a diagnostics and orchestration layer.

Current capabilities:

- Health and metadata endpoints (/health, /meta)
- Aggregated diagnostics endpoint (/diag)
- Typed request/response contracts
- A foundational /compute endpoint mirroring the Python service
- Designed to evolve into a gateway for Python compute, persistence, and scheduling

Default local port:

http://localhost:3001

---

## Python Research Service (FastAPI)

A lightweight FastAPI service used for numerical and research-oriented computation.

Current capabilities:

- Health and metadata endpoints (/health, /meta)
- Typed request/response contracts using Pydantic
- CORS-safe local development
- A foundational /compute endpoint designed to evolve into indicators, backtests, and feature generation

The Python service is intentionally minimal and stateless at this stage and will be extended incrementally as research needs grow.

Default local port:

http://localhost:8001

---

## Service Topology (Local Development)

Browser (Next.js UI) -> http://localhost:3000
Node / NestJS -> http://localhost:3001
Python FastAPI -> http://localhost:8001

---

## Getting Started

Install dependencies and start the frontend:

npm install
npm run dev

Then open:

http://localhost:3000

---

### Python Research Service

cd services/research-python
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pydantic
uvicorn main:app --reload --port 8001

---

### Node Research Service (NestJS)

cd services/research-node
npm install
npm run start:dev

---

## Development Principles

- Explicit, modular architecture
- Reproducible data and research workflows
- Clear separation between UI, orchestration, and compute layers
- Small, readable commits
- Educational focus over production trading claims

---

## Commit Style

Commits follow a lightweight conventional format:

- feat: new functionality
- fix: bug fixes
- refactor: internal restructuring without behaviour change
- test: add or update tests
- docs: documentation updates
- chore: tooling, config, or housekeeping

Examples:

- feat(web): add symbol switcher
- fix(api): proxy binance exchangeInfo via server
- refactor(shared): normalise candle types

---

## Notes

This repository is a learning and portfolio project.

Market data ingestion, strategy logic, and execution-style components are implemented strictly for educational and simulation purposes only.
