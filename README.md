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
- Multi-item proxy-purchase orders grouped by external party
- Traditional Chinese receipt line-item translation with immutable OCR originals
- Receipt line-item assignment to proxy-purchase parties without duplicate expenses
- Pending purchase lists, traveler advances, partial collections, and settlement tracking
- Completed repayment records and remaining balance calculation
- On-premise receipt OCR with line-item extraction and Qwen vision confirmation
- Booking hub
- AI proposal review and decision lifecycle
- Local account authentication with expiring server sessions
- Single-use and group trip invitations with expiring links and downloadable QR codes
- Invite-only registration, atomic membership redemption, and owner revocation history
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

The running workspace uses on-premise Qwen 3.5 through Ollama for AI proposals and structured receipt extraction. Images use CUBI EasyOCR plus Qwen vision, while PDFs use the CUBI parser plus Qwen. No receipt or trip content is sent to an external AI provider. Object storage, queues, email verification, and social login remain outside v0.2.

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
- Ollama at http://127.0.0.1:11434 with qwen3.5:9b
- CUBI OCR at http://127.0.0.1:11438
- CUBI PDF parser at http://127.0.0.1:11436

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

### Local AI and OCR

`AI_PROVIDER=local` and `OCR_PROVIDER=local` are the defaults. AI proposals call the configured Ollama model with the current itinerary, expense, budget, and receipt counts, then store the result as a reviewable proposal. Accepting a proposal records the decision but does not let the model mutate canonical trip data.

Receipt images use EasyOCR text plus Qwen vision. PDF receipts use CUBI parser text plus Qwen. Upload returns after durable local storage, then a PostgreSQL-backed single-worker queue performs extraction. Jobs use leases, exponential retry, a configurable attempt limit, and automatic stale-job recovery after a restart. Both paths create editable receipt drafts and require user confirmation before an expense is created.

Each extracted line item keeps its OCR description and stores the Traditional Chinese
translation separately with language, status, source, and model metadata. Users can
retry local Qwen translation or save a manual correction without replacing the source
text.

Trip parties are separated into travelers and external expense parties. External parties cannot sign in, join itinerary events, or pay an expense. They can receive custom expense shares, appear in external receivables, and record repayments to a traveler. Their shares are excluded from trip budget totals and AI budget analysis.

The proxy-purchase workspace keeps each outside party together with one or more requested products. A pending list has no accounting effect. Confirming a purchase atomically creates one shopping expense whose payer is a traveler and whose complete share belongs to the external party. Partial and final collections are canonical settlement records linked back to the order. Deleting a collection recalculates both the order and trip balance; cancelling an uncollected purchase voids its linked expense. Proxy-generated expenses are locked in the generic expense editor so the two views cannot drift.

Receipt items can also be assigned to an existing or newly created external party. These
source-linked orders remain pending until the receipt is confirmed. Receipt confirmation
creates one canonical expense, adds each assigned order total as an external share, splits
only the remainder among travelers, and links every source order to that same expense.
The allocation amount can differ from the OCR line amount for receipt-level discounts or
coupons; the source amount remains in the order note for review.

`LOCAL_LLM_KEEP_ALIVE=0` unloads Qwen after each request so EasyOCR and the language model can share a 16 GB GPU. Voyage serializes its own local inference work; when EasyOCR is temporarily unavailable, image receipts fall back to Qwen vision. Set either provider to `mock` only for isolated development without the local model services.

The API liveness response includes the selected AI provider, OCR provider, and model name. `GET /api/health/ready` additionally checks PostgreSQL, writable upload storage, free disk space, and receipt queue counts; it returns HTTP 503 when a required dependency is unavailable.

### Persistent LAN service

Production builds can run as systemd user services on ports 3100 and 3101. The API unit stores receipt files under `~/.local/share/voyage-ai/uploads`, so uploads survive reboots.

```bash
npm run build
mkdir -p ~/.config/systemd/user ~/.config/voyage-ai
cp deploy/systemd/voyage-api.service deploy/systemd/voyage-web.service deploy/systemd/voyage-backup.service deploy/systemd/voyage-backup.timer ~/.config/systemd/user/
cp deploy/systemd/voyage.env.example ~/.config/voyage-ai/voyage.env
# Replace YOUR_LAN_IP in ~/.config/voyage-ai/voyage.env before starting.
systemctl --user daemon-reload
systemctl --user enable --now voyage-api.service voyage-web.service voyage-backup.timer
```

Enable user lingering once so the services start without an interactive login. This may require administrator authorization:

```bash
loginctl enable-linger "$USER"
```

Check the deployment with `systemctl --user status voyage-api.service voyage-web.service voyage-backup.timer`, `curl http://127.0.0.1:3101/api/health/live`, and `curl http://127.0.0.1:3101/api/health/ready`.

### Backup and restore

The daily timer writes mode-600 archives to `~/.local/share/voyage-ai/backups`. Each archive contains a PostgreSQL custom dump, receipt uploads, a manifest, and SHA-256 checksums. Thirty-day retention is the default. Scripts use host PostgreSQL client tools when installed and otherwise run the matching tools inside the Compose `postgres` service.

```bash
systemctl --user start voyage-backup.service
systemctl --user status voyage-backup.service
scripts/voyage-verify-backup.sh ~/.local/share/voyage-ai/backups/voyage-ai-TIMESTAMP.tar.gz
```

Restores are deliberately manual and destructive. Stop both services, export the production environment, verify the archive, then use the explicit flag:

```bash
systemctl --user stop voyage-api.service voyage-web.service
set -a
source ~/.config/voyage-ai/voyage.env
set +a
UPLOAD_DIR="$HOME/.local/share/voyage-ai/uploads" scripts/voyage-restore.sh BACKUP.tar.gz --force
systemctl --user start voyage-api.service voyage-web.service
```

The previous upload directory is retained with a `before-restore` timestamp until an operator removes it.

### Local authentication

The API stores scrypt password hashes and opaque, hashed session tokens. The web app keeps the session token in an HttpOnly cookie and forwards it as a Bearer token from server-side requests. Login failures are limited per IP and email, unknown accounts still execute scrypt verification, each account is capped at ten active sessions, and changing a password revokes every session. Trip-scoped requests still verify membership, and owner-only operations remain protected.

Trip owners create invitations from the member page. A single invitation has one use; a group invitation has an owner-selected limit up to 100. Both expire within 1-30 days and can be revoked immediately. The raw 256-bit invitation token is returned only when it is created; PostgreSQL stores only its SHA-256 hash. Public invitation previews expose only the trip name, destination, dates, inviter, expiry, and remaining capacity. Registration and membership redemption run in one database transaction, and accepting an invitation is idempotent for existing travelers. External proxy-purchase parties are never converted or name-matched into login members.

Set `APP_ORIGIN` to the public HTTPS origin before sharing QR codes. Set `REQUIRE_INVITE_FOR_REGISTRATION=true` on shared deployments to disable open registration. `INVITE_PREVIEW_RATE_LIMIT` and `INVITE_REDEEM_RATE_LIMIT` cap requests per client IP in a ten-minute window. A Cloudflare Access policy in front of the whole hostname must also allow intended invitees to reach `/invite/*`; application invitations cannot bypass an upstream Access block.

Seeded login:

```text
Email: demo@voyage.local
Password: voyage-demo
```

Change `DEMO_USER_PASSWORD` before seeding a shared private deployment. The login form never pre-fills demo credentials. Keep `ALLOW_INSECURE_DEMO_AUTH=false`; the fallback header identity exists only for isolated API development. Enable `COOKIE_SECURE` and `ENABLE_HSTS` only after terminating HTTPS at a trusted reverse proxy.

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

API tests cover liveness/readiness, password hashing and replacement, login limiting, session revocation, invitation hashing and atomic redemption, invite-only registration, deterministic splitting, payer exclusion, rounding, multi-item proxy-purchase totals, adjusted receipt allocations, canonical purchase expenses, partial collections, external receivables, completed repayments, cross-day event movement, voided expenses, OCR queue success/retry/exhaustion, receipt confirmation idempotency, and AI proposal state transitions. Web tests cover date, money, enum formatting, and safe post-login return paths.

### Main API routes

All endpoints use the `/api` prefix and return `{ "data": ..., "meta": ... }` or a structured `{ "error": ... }` response.

```text
POST            /api/auth/register|login|logout|logout-all|change-password
GET             /api/auth/me
GET             /api/health|health/live|health/ready
GET|POST        /api/trips
GET|PATCH       /api/trips/:tripId
POST            /api/trips/:tripId/archive
GET|POST        /api/trips/:tripId/members
GET|POST        /api/trips/:tripId/invites
POST            /api/trips/:tripId/invites/:inviteId/revoke
GET             /api/invites/:token
POST            /api/invites/:token/accept
GET             /api/trips/:tripId/itinerary-days
POST            /api/trips/:tripId/itinerary-days/:dayId/events
POST            /api/trips/:tripId/itinerary-days/:dayId/events/reorder
POST            /api/trips/:tripId/events/:eventId/move
GET|POST        /api/trips/:tripId/expenses
GET             /api/trips/:tripId/expenses/balances
GET|POST        /api/trips/:tripId/proxy-purchases
PATCH|DELETE    /api/trips/:tripId/proxy-purchases/:purchaseId
POST            /api/trips/:tripId/proxy-purchases/:purchaseId/confirm
GET|POST        /api/trips/:tripId/receipts
PATCH|DELETE    /api/trips/:tripId/receipts/:receiptId
POST            /api/trips/:tripId/receipts/:receiptId/retry
POST            /api/trips/:tripId/receipts/:receiptId/translate
PATCH           /api/trips/:tripId/receipts/:receiptId/translations
POST            /api/trips/:tripId/receipts/:receiptId/proxy-purchases
POST            /api/trips/:tripId/receipts/:receiptId/confirm
GET|POST        /api/trips/:tripId/settlements
DELETE          /api/trips/:tripId/settlements/:settlementId
GET|POST        /api/trips/:tripId/bookings
GET|POST        /api/trips/:tripId/ai-proposals
POST            /api/trips/:tripId/ai-proposals/:proposalId/accept
POST            /api/trips/:tripId/ai-proposals/:proposalId/reject
```

### Receipt and AI boundaries

Receipt upload accepts JPEG, PNG, WebP, or PDF files up to 8 MB. Local OCR and Qwen create an editable draft with merchant, total, date, category, normalized purchase line items, and separate Traditional Chinese translations. Users can manually correct translations and assign selected items to external proxy-purchase parties. Only explicit receipt confirmation creates the canonical expense; all source-linked proxy orders share that expense instead of creating duplicates. `Expense.linkedReceiptId` remains the single unique receipt-to-expense relation, so repeated confirmation returns the same expense.

AI requests create stored proposals. Accept and reject are explicit state transitions. The local Qwen provider never calls an external API or mutates trip data directly; prompts include the current itinerary, budget, category totals, and pending receipt count.
