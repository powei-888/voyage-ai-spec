# 01. Product Requirements Document

## Product goal

Voyage AI helps groups manage the complete travel lifecycle in one workspace.

The product should reduce confusion before, during, and after a trip.

## MVP modules

### 1. Trip Workspace

Users can create a trip.

Required fields:

- name
- destination country
- destination city
- start date
- end date
- base currency
- budget
- owner

Core actions:

- create trip
- edit trip
- archive trip
- view trip dashboard

Dashboard should show:

- current day
- upcoming event
- total recorded expenses
- member count
- booking count
- pending AI proposals
- pending receipt confirmations

### 2. Members

Each trip has members.

Roles:

- owner
- member

Owner can:

- edit trip settings
- invite members
- remove members
- archive trip

Member can:

- edit itinerary
- add expenses
- upload receipts
- add bookings
- comment or vote in future versions

### 3. Timeline

The timeline is organized by day.

Each event belongs to one trip day.

Event fields:

- title
- category
- start time
- end time
- location name
- address
- notes
- estimated cost
- participants

Event categories:

- attraction
- restaurant
- hotel
- transport
- activity
- shopping
- free time
- other

Core actions:

- add event
- edit event
- delete event
- reorder event
- link booking
- link expense

### 4. Expenses

Expense records represent real trip costs.

Expense fields:

- title
- merchant
- amount
- currency
- category
- expense date
- payer member
- participants
- linked receipt
- linked event
- status

Expense categories:

- food
- hotel
- transport
- shopping
- ticket
- activity
- other

MVP split method:

- equal split

Future split methods:

- custom amount
- custom percentage
- exclude member
- personal item

### 5. Receipt OCR

Users can upload receipt images.

The MVP uses a mock OCR provider, but the system must define a provider interface.

OCR fields to extract:

- merchant
- amount
- currency
- date
- category suggestion
- confidence score

Required flow:

```text
Upload -> Receipt Draft -> OCR Extract -> Review Screen -> User Confirm -> Expense Created
```

The system must not create a final expense before user confirmation.

### 6. Booking Hub

Users can manually add bookings.

Booking types:

- flight
- hotel
- train
- bus
- restaurant
- activity
- car rental
- other

Booking fields:

- type
- title
- provider
- confirmation code
- start time
- end time
- location
- attachment URL
- linked event

MVP does not parse email automatically. Future versions can add travel inbox and email parsing.

### 7. AI Proposals

AI suggestions should be stored as proposals.

Proposal fields:

- type
- input text
- proposed JSON
- summary
- status
- created by
- applied by

Statuses:

- pending
- accepted
- rejected
- expired

Supported MVP proposal types:

- itinerary conflict check
- itinerary relaxation suggestion
- expense categorization suggestion
- budget summary
- receipt extraction review

## UX requirements

### Confirmation-first design

High-impact actions require preview and confirmation.

Examples:

- OCR result creates a draft first.
- AI itinerary changes create a proposal first.
- Booking parser creates a draft first.

### Mobile-first

Many travel actions happen during the trip.

Important mobile flows:

- check today timeline
- upload receipt
- confirm OCR result
- add quick expense
- view booking code
- check balance

### Low-friction entry

The system should allow quick creation first and structured completion later.

Example:

A user can create an event with only a title, then add time and location later.

## MVP acceptance criteria

- User can create a trip.
- User can add members.
- User can create day-by-day events.
- User can add expenses.
- User can calculate equal split results.
- User can upload receipt and review extracted fields.
- User can confirm OCR result into an expense.
- User can add booking records.
- AI proposals are stored separately from canonical data.
