# 05. API Design

## API style

MVP uses REST APIs.

Base path:

```text
/api
```

Standard response:

```json
{
  "data": {},
  "meta": {}
}
```

Standard error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request.",
    "details": {}
  }
}
```

## Trips

```http
POST /api/trips
GET /api/trips
GET /api/trips/:tripId
PATCH /api/trips/:tripId
POST /api/trips/:tripId/archive
```

Create trip request:

```json
{
  "name": "Japan 2026",
  "destinationCountry": "Japan",
  "destinationCity": "Tokyo",
  "startDate": "2026-07-10",
  "endDate": "2026-07-15",
  "baseCurrency": "JPY",
  "budgetAmount": 80000
}
```

## Members

```http
GET /api/trips/:tripId/members
POST /api/trips/:tripId/members
PATCH /api/trips/:tripId/members/:memberId
```

## Trip invitations

```http
GET  /api/trips/:tripId/invites
POST /api/trips/:tripId/invites
POST /api/trips/:tripId/invites/:inviteId/revoke
GET  /api/invites/:token
POST /api/invites/:token/accept
```

Only an owner can list, create, or revoke invitations. The public preview route returns a
limited trip summary and computed status without exposing itinerary, member, expense, or
receipt data. Creation accepts `single` or `group`, a 1-30 day expiry, and at most 100
uses. It returns the raw token once; later list responses contain usage and redemption
history but never the token. Accepting a valid invitation creates a traveler membership,
increments the use count, and writes a redemption record in one transaction. Existing
members receive an idempotent success without consuming another use.

## Itinerary

```http
GET /api/trips/:tripId/itinerary-days
POST /api/trips/:tripId/itinerary-days/:dayId/events
PATCH /api/trips/:tripId/events/:eventId
POST /api/trips/:tripId/itinerary-days/:dayId/events/reorder
```

Create event request:

```json
{
  "title": "Asakusa Temple",
  "category": "attraction",
  "startTime": "2026-07-11T09:00:00+09:00",
  "endTime": "2026-07-11T11:00:00+09:00",
  "locationName": "Senso-ji",
  "address": "Tokyo",
  "notes": "Morning visit",
  "estimatedCostAmount": 0,
  "estimatedCostCurrency": "JPY"
}
```

## Expenses

```http
GET /api/trips/:tripId/expenses
POST /api/trips/:tripId/expenses
GET /api/trips/:tripId/expenses/:expenseId
PATCH /api/trips/:tripId/expenses/:expenseId
GET /api/trips/:tripId/expenses/balances
```

Create expense request:

```json
{
  "title": "Dinner",
  "merchant": "Restaurant",
  "amount": 3000,
  "currency": "JPY",
  "category": "food",
  "expenseDate": "2026-07-11",
  "payerMemberId": "member-id",
  "participantMemberIds": ["member-a", "member-b", "member-c"]
}
```

Balance response example:

```json
{
  "data": {
    "members": [
      {
        "memberId": "member-a",
        "paidAmount": 3000,
        "shareAmount": 1000,
        "balance": 2000
      }
    ]
  }
}
```

## Proxy purchases

```http
GET    /api/trips/:tripId/proxy-purchases
POST   /api/trips/:tripId/proxy-purchases
PATCH  /api/trips/:tripId/proxy-purchases/:purchaseId
POST   /api/trips/:tripId/proxy-purchases/:purchaseId/confirm
DELETE /api/trips/:tripId/proxy-purchases/:purchaseId
```

Create a pending list or include both `payerMemberId` and `purchasedAt` to record an immediate purchase:

```json
{
  "newExternalName": "Amy's mother",
  "items": [
    { "description": "Skincare set", "quantity": 2, "unitPrice": "350" },
    { "description": "Matcha cookies", "quantity": 1, "unitPrice": "420" }
  ],
  "payerMemberId": "traveler-member-id",
  "purchasedAt": "2026-08-01"
}
```

Confirming a pending order creates one custom-split shopping expense. Collections use the settlements endpoint with `proxyPurchaseId`; the API rejects generic or excessive collection attempts while that order remains open.

## Receipts

```http
POST /api/trips/:tripId/receipts
GET /api/trips/:tripId/receipts/:receiptId
POST /api/trips/:tripId/receipts/:receiptId/retry
POST /api/trips/:tripId/receipts/:receiptId/translate
PATCH /api/trips/:tripId/receipts/:receiptId/translations
POST /api/trips/:tripId/receipts/:receiptId/proxy-purchases
POST /api/trips/:tripId/receipts/:receiptId/confirm
```

Upload uses multipart form data.

Upload returns a `pending` record after durable storage. Clients poll while `ocrStatus`
is `pending` or `processing`. A failed job includes attempt metadata and can be queued
again with the retry endpoint.

Manual translation correction:

```json
{
  "items": [
    { "index": 0, "translatedDescription": "樂敦 C Cube 眼藥水" }
  ]
}
```

Assign extracted items to one proxy-purchase party:

```json
{
  "externalMemberId": "external-a",
  "itemIndexes": [0, 2],
  "itemAmounts": [
    { "index": 0, "amount": "620" },
    { "index": 2, "amount": "300" }
  ],
  "note": "日本藥妝"
}
```

The item indexes are resolved from stored extraction data. Duplicate assignments are
rejected. Optional allocation amounts handle receipt-level discounts without replacing
the OCR amount. These orders remain requested until receipt confirmation.

Confirm receipt request:

```json
{
  "title": "Lunch",
  "merchant": "Cafe",
  "amount": 1500,
  "currency": "JPY",
  "category": "food",
  "expenseDate": "2026-07-11",
  "payerMemberId": "member-a",
  "participantMemberIds": ["member-a", "member-b"]
}
```

## Operations and account security

```http
GET  /api/health/live
GET  /api/health/ready
POST /api/auth/change-password
POST /api/auth/logout-all
```

Readiness returns HTTP 503 when PostgreSQL, upload storage, disk capacity, or queue reads
are unavailable. Changing a password revokes all active sessions.
When `REQUIRE_INVITE_FOR_REGISTRATION=true`, `POST /api/auth/register` requires an
`inviteToken`; account creation and invitation redemption succeed or roll back together.

## Bookings

```http
GET /api/trips/:tripId/bookings
POST /api/trips/:tripId/bookings
PATCH /api/trips/:tripId/bookings/:bookingId
```

## AI proposals

```http
GET /api/trips/:tripId/ai-proposals
POST /api/trips/:tripId/ai-proposals
POST /api/trips/:tripId/ai-proposals/:proposalId/accept
POST /api/trips/:tripId/ai-proposals/:proposalId/reject
```

Create proposal request:

```json
{
  "type": "itinerary_check",
  "inputText": "Check if day 2 is too packed."
}
```

## API implementation notes

- All trip-scoped APIs must verify trip membership.
- Invitation management requires owner access; public previews must remain summary-only.
- Invitation tokens must be generated from 256 random bits and stored only as SHA-256 hashes.
- DTO validation is required.
- Use pagination for list APIs when data can grow.
- AI proposal accept endpoint should validate proposal status before applying.
