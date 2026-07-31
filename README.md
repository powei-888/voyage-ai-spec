# Voyage AI

AI-native travel collaboration platform.

Plan smarter. Travel together. Remember forever.

Voyage AI v0.2 is a practical travel collaboration workspace where a group can plan a trip, manage bookings, record shared costs, review receipt extraction, and decide on AI proposals without giving automation direct control of canonical data.

## Core idea

AI should reduce travel chaos, but users must stay in control.

## MVP scope

- Trip workspace
- Member management
- Day-by-day timeline
- Expense records
- Equal and custom split calculation
- Completed repayment records and remaining balance calculation
- Receipt OCR confirmation flow with mock OCR first
- Booking hub
- AI proposal review and decision lifecycle
- Local account authentication with expiring server sessions
- Drag-and-drop itinerary ordering and cross-day moves
- Responsive operational UI with Traditional Chinese copy
- Basic trip membership and owner access rules
- Codex-ready implementation prompts and architecture documentation

## Stack

- Next.js 16, React 19, and TypeScript
- NestJS 11 and TypeScript
- Prisma 5 and PostgreSQL 16
- npm workspaces monorepo
- Jest and ts-jest
- Docker Compose for local PostgreSQL

Real AI, OCR, object storage, queues, email verification, and social login remain outside v0.2. Provider and storage interfaces keep integrations replaceable; the running workspace uses deterministic local analysis, mock OCR, controlled receipt storage, and password-based accounts intended for a trusted private network.

## Documentation

- docs/00-project-vision.md
- docs/01-product-prd.md
- docs/02-user-flow.md
- docs/03-database-design.md
- docs/04-system-design.md
- docs/05-api-design.md
- docs/06-ai-design.md
- docs/07-roadmap.md
- AGENTS.md
- prompts/codex-bootstrap.md


## Development

```text
apps/web                    Next.js application and server actions
apps/api                    NestJS REST API and Prisma schema
apps/api/prisma/migrations  Versioned PostgreSQL migrations
packages/shared             Shared API and domain types
```

### Prerequisites

- Node.js 20+
- npm 10+
- Docker with Docker Compose

### Setup

```bash
cp .env.example .env
npm ci
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The seed creates a demo user, a populated Tokyo trip, members, itinerary events, an expense, a booking, and a pending proposal. Re-running the seed is safe.

### Run locally

Start each process in a separate terminal:

```bash
npm run dev:api
npm run dev:web
```

Default local services:

- Web: http://localhost:3000
- Web health: http://localhost:3000/health
- API health: http://localhost:3001/api/health
- PostgreSQL: localhost:5432

Root scripts load `.env` through `dotenv-cli`. If port 5432 is occupied, update both `POSTGRES_PORT` and the port inside `DATABASE_URL`, then restart PostgreSQL.

### Local authentication

The API stores scrypt password hashes and opaque, hashed session tokens. The web app keeps the session token in an HttpOnly cookie and forwards it as a Bearer token from server-side requests. Trip-scoped requests still verify membership, and owner-only operations remain protected.

Seeded login:

```text
Email: demo.local
Password: voyage-demo
```

Change `DEMO_USER_PASSWORD` before seeding a shared private deployment. Keep `ALLOW_INSECURE_DEMO_AUTH=false`; the fallback header identity exists only for isolated API development.

### Useful commands

```bash
npm run db:up              # start PostgreSQL
npm run db:down            # stop Compose services
npm run prisma:migrate     # apply or create development migrations
npm run prisma:seed        # create or refresh deterministic demo records
npm run db:reset           # reset the configured database and seed it
```

### Verification

```bash
npm ci
npm run prisma:validate
npm run prisma:generate
npm run typecheck
npm run test
npm run build
```

API tests cover health, password hashing, deterministic equal and custom splitting, payer exclusion, rounding, completed repayments, cross-day event movement, voided expenses, receipt confirmation idempotency, and AI proposal state transitions. Web tests cover date, money, and enum formatting.

### Main API routes

All endpoints use the `/api` prefix and return `{ "data": ..., "meta": ... }` or a structured `{ "error": ... }` response.

```text
POST            /api/auth/register|login|logout
GET             /api/auth/me
GET|POST        /api/trips
GET|PATCH       /api/trips/:tripId
POST            /api/trips/:tripId/archive
GET|POST        /api/trips/:tripId/members
GET             /api/trips/:tripId/itinerary-days
POST            /api/trips/:tripId/itinerary-days/:dayId/events
POST            /api/trips/:tripId/itinerary-days/:dayId/events/reorder
POST            /api/trips/:tripId/events/:eventId/move
GET|POST        /api/trips/:tripId/expenses
GET             /api/trips/:tripId/expenses/balances
GET|POST        /api/trips/:tripId/receipts
PATCH|DELETE    /api/trips/:tripId/receipts/:receiptId
POST            /api/trips/:tripId/receipts/:receiptId/confirm
GET|POST        /api/trips/:tripId/settlements
DELETE          /api/trips/:tripId/settlements/:settlementId
GET|POST        /api/trips/:tripId/bookings
GET|POST        /api/trips/:tripId/ai-proposals
POST            /api/trips/:tripId/ai-proposals/:proposalId/accept
POST            /api/trips/:tripId/ai-proposals/:proposalId/reject
```

### Receipt and AI boundaries

Receipt upload accepts JPEG, PNG, WebP, or PDF files up to 8 MB. Mock OCR creates an editable draft; only explicit confirmation creates the canonical expense. `Expense.linkedReceiptId` is the single unique receipt-to-expense relation, so repeated confirmation returns the same expense.

AI requests create stored proposals. Accept and reject are explicit state transitions. The deterministic provider never calls an external API or mutates trip data directly; itinerary checks inspect actual event time ranges, and expense summaries inspect current budget and category totals.
