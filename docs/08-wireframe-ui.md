# 08. Wireframe and UI Flow

This document defines the first UI direction for Voyage AI. It is intentionally low-fidelity so Codex or a designer can implement without overfitting visual details.

## Navigation model

Main sections inside a trip:

```text
Dashboard
Timeline
Expenses
Receipts
Bookings
AI
Members
Settings
```

## Page: Trip list

Purpose: show all trips owned by or shared with the user.

```text
+------------------------------------------------+
| Voyage AI                         Create Trip  |
+------------------------------------------------+
| Japan 2026                                     |
| Tokyo | 2026-07-10 ~ 2026-07-15 | 4 members   |
| Next: Flight to Tokyo                          |
+------------------------------------------------+
| Korea Weekend                                  |
| Seoul | 2026-09-01 ~ 2026-09-04 | 2 members   |
+------------------------------------------------+
```

Primary action:

- Create Trip

## Page: Trip dashboard

Purpose: answer what is happening today and what needs attention.

```text
+------------------------------------------------+
| Japan 2026                         Members 4   |
| Tokyo | Jul 10 - Jul 15 | Budget JPY 80000    |
+------------------------------------------------+
| Today                                             |
| 09:00 Asakusa Temple                             |
| 12:00 Lunch                                      |
| 15:00 Hotel Check-in                             |
+------------------------------------------------+
| Pending                                          |
| 2 receipts need review                           |
| 1 AI proposal waiting                            |
+------------------------------------------------+
| Money                                            |
| Recorded: JPY 32000                              |
| Balance: view settlement                         |
+------------------------------------------------+
| Bookings                                         |
| Hotel: Sakura Hotel | Code: ABC123               |
+------------------------------------------------+
```

## Page: Timeline

Purpose: manage day-by-day itinerary.

```text
Day tabs: Day 1 | Day 2 | Day 3 | Day 4

Day 2 - 2026-07-11

09:00 - 11:00  Asakusa Temple       attraction
12:00 - 13:00  Lunch                food
15:00 - 16:00  Hotel Check-in       hotel

[Add Event]
```

Event card should show:

- time range
- title
- category
- location
- linked booking indicator
- linked expense indicator

## Page: Event detail

```text
Title
Category
Start time
End time
Location
Participants
Estimated cost
Notes
Linked booking
Linked expenses

[Save]
[Remove Event]
```

## Page: Expenses

Purpose: track shared trip costs.

```text
Total recorded: JPY 32000

Balances
Wei      +1200
Amy      -600
Tom      -600

Expenses
Dinner          JPY 3000   paid by Wei
Taxi            JPY 1200   paid by Amy
Hotel deposit   JPY 20000  paid by Wei

[Add Expense]
[Upload Receipt]
```

## Page: Receipt review

Purpose: make OCR safe through double check.

```text
Receipt image preview

Extracted fields
Merchant: Cafe Example
Amount:   1500
Currency: JPY
Date:     2026-07-11
Category: food
Confidence: 0.94

Payer: Wei
Participants: Wei, Amy, Tom

[Confirm and Create Expense]
[Save Draft]
[Discard]
```

Rule:

The confirm button must be idempotent. Double click must not create duplicate expenses.

## Page: Booking hub

```text
Bookings

Flight | TPE -> NRT | 2026-07-10 08:00 | Code: FL123
Hotel  | Sakura Hotel | Jul 10 - Jul 15 | Code: ABC123
Train  | Tokyo -> Osaka | Jul 13 10:00

[Add Booking]
```

## Page: AI proposals

```text
Pending AI Proposals

1. Day 2 may be too packed
   AI suggests moving Hotel Check-in later.

   [Preview]
   [Accept]
   [Reject]
```

AI proposal preview should show before and after state when possible.

## Mobile priority

The mobile experience should prioritize:

1. Today timeline
2. Upload receipt
3. Confirm receipt
4. View booking code
5. View balances
6. Add quick expense

## Empty states

Each core page needs a useful empty state:

- No trips: create your first trip
- No events: add your first event
- No expenses: add expense or upload receipt
- No bookings: add flight, hotel, or activity booking
- No AI proposals: ask AI to check your itinerary
