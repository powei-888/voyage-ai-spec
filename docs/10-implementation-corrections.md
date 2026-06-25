# 10. Implementation Corrections

This document records corrections discovered during automated review of the foundation spec. These rules override earlier ambiguous wording.

## 1. Receipt confirmation must be idempotent

Problem:

A user may double click the confirm button, or two requests may race.

Required behavior:

- One receipt can create at most one expense.
- If a receipt is already confirmed, the confirm endpoint should return the existing expense.
- Receipt confirmation must run inside a transaction.
- The receipt to created expense relation must be unique.
- The expense to linked receipt relation must be unique.

Recommended schema rules:

```text
receipts.created_expense_id unique nullable
expenses.linked_receipt_id unique nullable
```

Recommended transaction:

```text
read receipt
if receipt is confirmed and created_expense_id exists -> return existing expense
if receipt status is not extracted -> reject
create expense
create expense participants
set receipt status to confirmed
set receipt.created_expense_id
commit
```

## 2. Equal split remainder must be deterministic

Problem:

Some amounts do not divide evenly.

Required behavior:

- Convert amount to the smallest currency unit before splitting when possible.
- The sum of participant shares must equal the original expense amount.
- Remainder allocation must be deterministic.

Rule:

```text
base_share = amount_smallest_unit / participant_count
remainder = amount_smallest_unit % participant_count
```

Allocation order:

1. payer first if payer is in participants
2. remaining participant IDs ascending

Example:

```text
JPY 100 split by 3 members
base share = 33
remainder = 1
shares = 34, 33, 33
```

## 3. Balance API route must avoid dynamic route conflict

Problem:

In routers like NestJS or Express, a dynamic route can accidentally match a static route.

Use one of these safer designs:

```http
GET /api/trips/:tripId/expense-balances
```

or register the static route before dynamic expense detail routes.

Preferred MVP route:

```http
GET /api/trips/:tripId/expense-balances
```

## 4. Event deletion endpoint is required

The API design must include event removal because Event CRUD is in MVP scope.

Preferred route:

```http
DELETE /api/trips/:tripId/events/:eventId
```

MVP behavior:

- Hard deletion is acceptable if no historical references exist.
- If bookings or expenses link to the event, the service should either reject deletion or unlink safely.

Future behavior:

- Add soft delete for audit history.

## 5. Tests required for these corrections

Add tests for:

- duplicate receipt confirmation returns one expense
- two confirmation attempts do not create two expenses
- split shares always sum to original amount
- remainder allocation is stable
- expense balance route does not conflict with expense detail route
- event deletion works or rejects when linked records exist
