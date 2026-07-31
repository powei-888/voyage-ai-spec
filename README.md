# Voyage AI

AI-native travel collaboration platform.

Plan smarter. Travel together. Remember forever.

Voyage AI is a product specification repository for a serious travel collaboration system. It is not only an AI itinerary demo. The goal is to design one workspace where a trip can be planned, managed, recorded, analyzed, and remembered through structured data and AI-assisted workflows.

## Core idea

AI should reduce travel chaos, but users must stay in control.

## MVP scope

- Trip workspace
- Member management
- Day-by-day timeline
- Expense records
- Equal split calculation
- Receipt OCR confirmation flow with mock OCR first
- Booking hub
- AI proposal model
- Codex-ready implementation prompts

## Preferred stack

- React or Next.js
- NestJS
- PostgreSQL
- Prisma
- S3-compatible object storage
- Queue-based workers
- Docker-first deployment

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

This repository is bootstrapped as an npm workspaces monorepo.

```text
apps/web          Next.js TypeScript app
apps/api          NestJS TypeScript API
packages/shared   Shared TypeScript types and constants
```

### Prerequisites

- Node.js 20+
- npm 10+
- Docker with Docker Compose

### Setup

```bash
cp .env.example .env
npm install
npm run db:up
npm run prisma:generate
```

### Run locally

```bash
npm run dev:web
npm run dev:api
```

Default local services:

- Web: http://localhost:3000
- Web health: http://localhost:3000/health
- API health: http://localhost:3001/api/health
- PostgreSQL: localhost:5432

### Checks

```bash
npm run prisma:validate
npm run typecheck
npm run test
npm run build
```
