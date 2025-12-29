# Quant Dashboard (Learning Project)

A personal learning repository for building a trading dashboard and research workflow using Binance market data.

The focus is on clean architecture, reproducible data pipelines, and testable research and strategy components, while keeping the codebase readable and reviewable by other engineers.

This project is designed to evolve incrementally toward professional quant-developer tooling rather than a finished trading system.

---

## Tech Stack

- Frontend: Next.js (App Router), React, TypeScript
- UI: Tailwind CSS + shadcn/ui (Radix UI primitives + CVA variants)
- State Management: Redux Toolkit
- API / Backend: Node.js (Next.js route handlers, additional services planned)
- Research & Compute: Python (FastAPI-based research service)
- Data Storage (planned): SQLite (local), Postgres (later)

---

## Repository Structure

- apps/web — Next.js UI (dashboard, market lab, backtests)
- apps/api — API routes and server-side proxies (Next.js)
- services — standalone services and experiments (planned)
- packages/shared — shared TypeScript types and utilities
- python/research-service — Python research & compute service (FastAPI)
- db — schemas, migrations, and seed data (planned)
- docs — roadmap, decisions, and architecture notes

---

## UI Components (shadcn/ui)

This repository uses shadcn/ui for UI primitives such as Card, Button, Badge, Input, Table, and Tabs.

Important: shadcn/ui is NOT a runtime dependency or component library.
It is a code generator that copies React components directly into the repository.
Once generated, the components are fully owned by this codebase and can be edited freely.

The generated components live in:

- apps/web/src/ui/_
  (or apps/web/src/components/ui/_ depending on repo configuration)

They are built using:

- Tailwind CSS for styling
- Radix UI for accessible behaviour
- class-variance-authority (CVA) for variants
- cn() utility from lib/utils for class merging

### Adding more UI components

If shadcn is already initialised (components.json exists), new components can be added with:

npx shadcn@latest add alert dialog dropdown-menu tooltip table tabs

This will generate new files inside the configured UI directory.

To verify or change where components are generated, inspect:

- components.json (aliases and ui path)

---

## Python Research Service

A lightweight FastAPI service used for numerical and research-oriented computation.

Current capabilities:

- Health and metadata endpoints (/health, /meta)
- Typed request/response contracts using Pydantic
- CORS-safe local development
- A foundational /compute endpoint designed to evolve into indicators, backtests, and feature generation

The Python service is intentionally minimal and stateless at this stage and will be extended incrementally as research needs grow.

---

## Getting Started

Install dependencies and start the development server:

npm install
npm run dev

Start the Python research service (separately):

cd python/research-service
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pydantic
uvicorn main:app --reload --port 8001

Then open:

http://localhost:3000

---

## Development Principles

- Explicit, modular architecture
- Reproducible data and research workflows
- Clear separation between UI, API, and compute layers
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
