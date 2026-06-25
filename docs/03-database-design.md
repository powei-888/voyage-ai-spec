# 03. Database Design

## Design goals

The database should support:

- trip workspace
- members and roles
- day-by-day itinerary
- expenses and split calculation
- receipt OCR draft flow
- booking hub
- AI proposal preview and confirmation

The schema should separate canonical records from AI drafts.

## Entity overview

```text
User
  -> TripMember
  -> Trip
       -> ItineraryDay
       -> ItineraryEvent
       -> Expense
       -> Receipt
       -> Booking
       -> AIProposal
```

## Tables

### users

Represents an application user.

Fields:

- id: uuid, primary key
- email: string, unique
- display_name: string
- avatar_url: string nullable
- created_at: timestamp
- updated_at: timestamp

### trips

Represents a travel workspace.

Fields:

- id: uuid, primary key
- name: string
- destination_country: string nullable
- destination_city: string nullable
- start_date: date
- end_date: date
- base_currency: string
- budget_amount: decimal nullable
- owner_user_id: uuid
- status: enum active / archived
- created_at: timestamp
- updated_at: timestamp

Indexes:

- owner_user_id
- start_date
- status

### trip_members

Represents a user's membership in a trip.

Fields:

- id: uuid, primary key
- trip_id: uuid
- user_id: uuid nullable
- display_name: string
- role: enum owner / member
- joined_at: timestamp nullable
- created_at: timestamp
- updated_at: timestamp

Notes:

user_id is nullable to support invited members who do not have accounts yet.

Indexes:

- trip_id
- user_id
- trip_id + display_name

### itinerary_days

Represents a day in a trip.

Fields:

- id: uuid, primary key
- trip_id: uuid
- date: date
- day_index: integer
- title: string nullable
- notes: text nullable
- created_at: timestamp
- updated_at: timestamp

Constraints:

- unique trip_id + date
- unique trip_id + day_index

### itinerary_events

Represents an event in a day.

Fields:

- id: uuid, primary key
- trip_id: uuid
- day_id: uuid
- title: string
- category: enum attraction / restaurant / hotel / transport / activity / shopping / free_time / other
- start_time: timestamp nullable
- end_time: timestamp nullable
- location_name: string nullable
- address: string nullable
- latitude: decimal nullable
- longitude: decimal nullable
- notes: text nullable
- estimated_cost_amount: decimal nullable
- estimated_cost_currency: string nullable
- sort_order: integer
- created_by_member_id: uuid nullable
- created_at: timestamp
- updated_at: timestamp

Indexes:

- trip_id
- day_id
- day_id + sort_order
- category

### event_participants

Represents members participating in an itinerary event.

Fields:

- id: uuid, primary key
- event_id: uuid
- member_id: uuid
- created_at: timestamp

Constraint:

- unique event_id + member_id

### receipts

Represents an uploaded receipt image and OCR result.

Fields:

- id: uuid, primary key
- trip_id: uuid
- uploaded_by_member_id: uuid nullable
- image_url: string
- ocr_status: enum pending / processing / extracted / confirmed / failed
- extracted_json: jsonb nullable
- confidence_score: decimal nullable
- confirmed_by_member_id: uuid nullable
- confirmed_at: timestamp nullable
- created_expense_id: uuid nullable
- created_at: timestamp
- updated_at: timestamp

Important:

A receipt can exist without an expense. Expense creation happens only after confirmation.

Indexes:

- trip_id
- ocr_status
- created_expense_id

### expenses

Represents confirmed trip expense.

Fields:

- id: uuid, primary key
- trip_id: uuid
- title: string
- merchant: string nullable
- amount: decimal
- currency: string
- category: enum food / hotel / transport / shopping / ticket / activity / other
- expense_date: date nullable
- payer_member_id: uuid
- linked_receipt_id: uuid nullable
- linked_event_id: uuid nullable
- status: enum active / voided
- created_by_member_id: uuid nullable
- created_at: timestamp
- updated_at: timestamp

Indexes:

- trip_id
- payer_member_id
- linked_receipt_id
- linked_event_id
- status

### expense_participants

Represents each member's share in an expense.

Fields:

- id: uuid, primary key
- expense_id: uuid
- member_id: uuid
- share_amount: decimal
- created_at: timestamp

Constraint:

- unique expense_id + member_id

### bookings

Represents a booking record.

Fields:

- id: uuid, primary key
- trip_id: uuid
- type: enum flight / hotel / train / bus / restaurant / activity / car_rental / other
- title: string
- provider: string nullable
- confirmation_code: string nullable
- start_time: timestamp nullable
- end_time: timestamp nullable
- location: string nullable
- attachment_url: string nullable
- linked_event_id: uuid nullable
- created_by_member_id: uuid nullable
- created_at: timestamp
- updated_at: timestamp

Indexes:

- trip_id
- type
- linked_event_id
- start_time

### ai_proposals

Represents a proposed AI action.

Fields:

- id: uuid, primary key
- trip_id: uuid
- type: enum itinerary_check / itinerary_update / expense_summary / receipt_review / booking_parse / memory_draft
- input_text: text nullable
- summary: text
- proposed_json: jsonb
- status: enum pending / accepted / rejected / expired
- created_by_member_id: uuid nullable
- applied_by_member_id: uuid nullable
- applied_at: timestamp nullable
- created_at: timestamp
- updated_at: timestamp

Indexes:

- trip_id
- type
- status

## Split calculation

MVP uses equal split.

Algorithm:

1. For each active expense, read amount, payer, and participants.
2. Divide amount equally among participants.
3. Store calculated participant share in expense_participants.
4. Aggregate each member's paid amount.
5. Aggregate each member's share amount.
6. Balance = paid amount - share amount.

Positive balance means the member paid more than their share.
Negative balance means the member consumed more than they paid.

## Important modeling rules

- Receipt is not the same as Expense.
- AIProposal is not the same as applied data.
- Booking can exist without a timeline event.
- Timeline event can exist without a booking.
- A member can exist without a user account.
- Do not delete financial records silently. Use status when historical context matters.
