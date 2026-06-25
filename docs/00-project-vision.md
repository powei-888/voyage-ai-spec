# 00. Project Vision

## Product name

Voyage AI

## One-line description

An AI-native travel collaboration workspace for planning, managing, recording, and remembering trips.

## Problem

Travel is not only about deciding where to go.

The real chaos usually comes from:

- changing daily plans
- scattered booking information
- receipts and shared costs
- group discussions across different apps
- people asking the same questions repeatedly
- photos that never become organized memories
- budget uncertainty during the trip

Many travel apps solve only one slice of this problem. Voyage AI treats the trip as a single workspace.

## Product thesis

The next generation travel product should not be only an AI itinerary generator.

It should support the full trip lifecycle:

```text
Plan -> Coordinate -> Record -> Settle -> Remember
```

AI is useful only when the system has structured trip data. Therefore, Voyage AI focuses on turning messy travel artifacts into structured records.

## Target users

Primary users:

- couples
- families
- friend groups
- student trips
- small company trips

Typical group size:

- 1 to 10 people for MVP
- 1 to 30 people in future versions

## Differentiation

Voyage AI is different from simple AI travel planners because it covers the full trip lifecycle.

Traditional trip planner:

```text
User asks AI -> AI generates itinerary -> user edits manually
```

Voyage AI:

```text
Trip workspace -> timeline -> receipts -> shared costs -> bookings -> AI proposals -> travel memory
```

## Core design philosophy

### 1. AI should assist, not override

AI suggestions should be previewed and confirmed.

### 2. Timeline is the source of context

A trip is organized by days and events. Other records should be linkable to the timeline.

### 3. Expense records need confirmation

OCR and AI extraction can be wrong. Creating a final expense from OCR should require user review.

### 4. Collaboration is a first-class feature

Trips often involve multiple people. The product should make shared decisions, shared costs, and shared memories easier.

### 5. The trip continues after it ends

After a trip, the product should turn timeline, photos, receipts, and notes into a replayable memory.

## MVP outcome

The MVP should prove that Voyage AI can:

1. Create and manage a trip workspace
2. Organize itinerary by day
3. Record shared expenses
4. Calculate equal split results
5. Turn a receipt image into a draft expense
6. Require user confirmation before finalizing OCR results
7. Store bookings and link them to timeline events
8. Represent AI suggestions as proposals

## Success criteria

A successful MVP should answer these questions:

- Can a group understand the whole trip from one dashboard?
- Can users add and edit daily plans quickly?
- Can users upload a receipt and confirm an expense with less effort?
- Can the system clearly show member balances?
- Can AI suggest changes without taking control away from users?
- Can Codex implement features from this spec without guessing the product direction?
