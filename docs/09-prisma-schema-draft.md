# 09. Prisma Schema Draft

This is a first implementation-oriented schema draft. It is not final, but Codex can use it as the starting point for v0.1.

## Important implementation notes

- Use Decimal for money values.
- Store confirmed expenses separately from receipt drafts.
- Make receipt to expense confirmation idempotent.
- Use smallest currency unit for split calculation in service logic when possible.
- Keep AI proposals separate from canonical trip data.

## Enums

```prisma
enum TripStatus {
  active
  archived
}

enum TripRole {
  owner
  member
}

enum EventCategory {
  attraction
  restaurant
  hotel
  transport
  activity
  shopping
  free_time
  other
}

enum ExpenseCategory {
  food
  hotel
  transport
  shopping
  ticket
  activity
  other
}

enum ExpenseStatus {
  active
  voided
}

enum ReceiptStatus {
  pending
  processing
  extracted
  confirmed
  failed
}

enum BookingType {
  flight
  hotel
  train
  bus
  restaurant
  activity
  car_rental
  other
}

enum AIProposalStatus {
  pending
  accepted
  rejected
  expired
}
```

## Core models

```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  displayName String
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ownedTrips  Trip[]       @relation("TripOwner")
  memberships TripMember[]
}

model Trip {
  id                 String     @id @default(uuid())
  name               String
  destinationCountry String?
  destinationCity    String?
  startDate          DateTime
  endDate            DateTime
  baseCurrency       String
  budgetAmount       Decimal?
  ownerUserId        String
  status             TripStatus @default(active)
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  owner      User             @relation("TripOwner", fields: [ownerUserId], references: [id])
  members    TripMember[]
  days       ItineraryDay[]
  events     ItineraryEvent[]
  receipts   Receipt[]
  expenses   Expense[]
  bookings   Booking[]
  proposals  AIProposal[]

  @@index([ownerUserId])
  @@index([status])
}

model TripMember {
  id          String   @id @default(uuid())
  tripId      String
  userId      String?
  displayName String
  role        TripRole @default(member)
  joinedAt    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  trip Trip  @relation(fields: [tripId], references: [id])
  user User? @relation(fields: [userId], references: [id])

  @@index([tripId])
  @@index([userId])
}
```

## Itinerary models

```prisma
model ItineraryDay {
  id        String   @id @default(uuid())
  tripId    String
  date      DateTime
  dayIndex  Int
  title     String?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  trip   Trip             @relation(fields: [tripId], references: [id])
  events ItineraryEvent[]

  @@unique([tripId, date])
  @@unique([tripId, dayIndex])
}

model ItineraryEvent {
  id                    String        @id @default(uuid())
  tripId                String
  dayId                 String
  title                 String
  category              EventCategory @default(other)
  startTime             DateTime?
  endTime               DateTime?
  locationName          String?
  address               String?
  latitude              Decimal?
  longitude             Decimal?
  notes                 String?
  estimatedCostAmount   Decimal?
  estimatedCostCurrency String?
  sortOrder             Int           @default(0)
  createdByMemberId     String?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  trip Trip         @relation(fields: [tripId], references: [id])
  day  ItineraryDay @relation(fields: [dayId], references: [id])

  bookings Booking[]
  expenses Expense[]

  @@index([tripId])
  @@index([dayId, sortOrder])
}
```

## Expense and receipt models

```prisma
model Receipt {
  id                  String        @id @default(uuid())
  tripId              String
  uploadedByMemberId  String?
  imageUrl            String
  ocrStatus           ReceiptStatus @default(pending)
  extractedJson       Json?
  confidenceScore     Decimal?
  confirmedByMemberId String?
  confirmedAt         DateTime?
  createdExpenseId    String?       @unique
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  trip           Trip     @relation(fields: [tripId], references: [id])
  createdExpense Expense? @relation("ReceiptCreatedExpense", fields: [createdExpenseId], references: [id])

  @@index([tripId])
  @@index([ocrStatus])
}

model Expense {
  id              String          @id @default(uuid())
  tripId          String
  title           String
  merchant        String?
  amount          Decimal
  currency        String
  category        ExpenseCategory @default(other)
  expenseDate     DateTime?
  payerMemberId   String
  linkedReceiptId String?         @unique
  linkedEventId   String?
  status          ExpenseStatus   @default(active)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  trip         Trip             @relation(fields: [tripId], references: [id])
  receipt      Receipt?         @relation("ReceiptCreatedExpense")
  linkedEvent  ItineraryEvent?  @relation(fields: [linkedEventId], references: [id])
  participants ExpenseParticipant[]

  @@index([tripId])
  @@index([payerMemberId])
  @@index([status])
}

model ExpenseParticipant {
  id          String   @id @default(uuid())
  expenseId   String
  memberId    String
  shareAmount Decimal
  createdAt   DateTime @default(now())

  expense Expense @relation(fields: [expenseId], references: [id])

  @@unique([expenseId, memberId])
}
```

## Booking and AI proposal models

```prisma
model Booking {
  id                 String      @id @default(uuid())
  tripId             String
  type               BookingType
  title              String
  provider           String?
  confirmationCode   String?
  startTime          DateTime?
  endTime            DateTime?
  location           String?
  attachmentUrl      String?
  linkedEventId      String?
  createdByMemberId  String?
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  trip        Trip            @relation(fields: [tripId], references: [id])
  linkedEvent ItineraryEvent? @relation(fields: [linkedEventId], references: [id])

  @@index([tripId])
  @@index([type])
  @@index([startTime])
}

model AIProposal {
  id                String           @id @default(uuid())
  tripId            String
  type              String
  inputText         String?
  summary           String
  proposedJson      Json
  status            AIProposalStatus @default(pending)
  createdByMemberId String?
  appliedByMemberId String?
  appliedAt         DateTime?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  trip Trip @relation(fields: [tripId], references: [id])

  @@index([tripId])
  @@index([type])
  @@index([status])
}
```

## Receipt confirmation transaction rule

The receipt confirmation service must run inside one database transaction:

1. Lock or re-read the receipt.
2. If status is confirmed and createdExpenseId exists, return the existing expense.
3. If status is not extracted, reject confirmation.
4. Create the expense.
5. Create expense participants.
6. Set receipt status to confirmed.
7. Set receipt.createdExpenseId.

The unique fields prevent duplicate expenses from the same receipt.

## Split remainder rule

Use smallest currency unit in service logic.

Example: JPY 100 split by 3 members.

- base share = 33
- remainder = 1
- first participant by stable ordering receives +1
- shares become 34, 33, 33

Stable ordering:

1. payer first if payer is in participants
2. then participant IDs ascending

The sum of participant shares must always equal the expense amount.
