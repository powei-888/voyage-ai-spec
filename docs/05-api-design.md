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

## Receipts

```http
POST /api/trips/:tripId/receipts
GET /api/trips/:tripId/receipts/:receiptId
POST /api/trips/:tripId/receipts/:receiptId/confirm
```

Upload uses multipart form data.

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
- DTO validation is required.
- Use pagination for list APIs when data can grow.
- AI proposal accept endpoint should validate proposal status before applying.
