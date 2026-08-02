# 02. User Flow

## Flow 1: Create a trip

```text
Home
  -> Create Trip
  -> Enter name / destination / dates / currency / budget
  -> Add members later or now
  -> Trip Dashboard
```

Minimum required fields:

- name
- start date
- end date

Optional fields:

- country
- city
- budget
- base currency

## Flow 2: Plan daily timeline

```text
Trip Dashboard
  -> Timeline
  -> Select Day
  -> Add Event
  -> Enter title / time / location / category
  -> Save
```

Fast event creation should be supported.

A user should be able to create an event with only a title, then enrich it later.

## Flow 3: Upload receipt and create expense

```text
Trip Dashboard
  -> Expenses
  -> Upload Receipt
  -> Receipt Draft Created
  -> OCR Processing
  -> Review Extracted Fields
  -> Review Original and Traditional Chinese Line Items
  -> Assign Selected Items to Proxy-purchase Parties
  -> User Edits If Needed
  -> Confirm
  -> One Canonical Expense Created
  -> Linked Proxy-purchase Orders Marked Purchased
```

Important rule:

The receipt draft and the final expense are different states.

The OCR result is not trusted until the user confirms it.

The OCR item description remains unchanged. Local Qwen translation and manual corrections
are stored in separate fields. One extracted item can belong to at most one active
proxy-purchase order. Confirmation adds those external shares to the receipt expense and
splits only the remaining amount among travelers.

## Flow 4: Add manual expense

```text
Expenses
  -> Add Expense
  -> Enter title / amount / payer / participants / category
  -> Save
  -> Balance Updated
```

MVP split method:

- equal split

Future versions:

- custom amount
- custom percentage
- personal item

## Flow 5: Manage proxy purchases

```text
Proxy Purchases
  -> Choose an existing external party or create one inline
  -> Add one or more products with quantity and unit price
  -> Save as a pending purchase list or record an immediate purchase
  -> Select the traveler who advanced payment
  -> Canonical shopping expense and external receivable created
  -> Record partial or final collections
  -> Order and trip balance update together
```

Important rules:

- A pending list does not affect expenses or balances.
- Purchased item totals are immutable; corrections happen before purchase or by cancelling an uncollected order.
- Collections are settlement records linked to one proxy-purchase order.
- External shares remain outside the traveler trip budget.

## Flow 6: Add booking

```text
Trip Dashboard
  -> Booking Hub
  -> Add Booking
  -> Select type
  -> Enter provider / confirmation code / time / location
  -> Optionally link to timeline event
  -> Save
```

Future travel inbox flow:

```text
Upload PDF or screenshot
  -> AI detects booking type
  -> Booking draft created
  -> User confirms
  -> Booking linked to timeline
```

## Flow 7: AI itinerary suggestion

```text
Timeline
  -> Ask AI: Check if Day 2 is too packed
  -> AI analyzes events
  -> AI creates proposal
  -> User previews proposed changes
  -> User accepts or rejects
  -> If accepted, changes are applied
```

AI should not directly modify timeline events.

## Flow 8: End-of-trip memory

Future version:

```text
Trip ends
  -> AI gathers timeline / photos / notes / expenses
  -> Draft travel replay
  -> User edits
  -> Publish private memory page
```

## Main navigation

Recommended MVP navigation:

- Dashboard
- Timeline
- Expenses
- Proxy Purchases
- Receipts
- Bookings
- AI
- Members
- Settings

## Dashboard layout

The dashboard should answer:

- Where are we going?
- What is today?
- What is next?
- How much has been recorded?
- Are there pending receipt confirmations?
- Are there pending AI proposals?
- Are there important bookings today?
