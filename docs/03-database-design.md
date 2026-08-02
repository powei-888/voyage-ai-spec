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
`kind=external` rows are accounting-only proxy-purchase parties. Invitation redemption
always creates or reuses a `kind=traveler` row and never merges by display name.

Indexes:

- trip_id
- user_id
- trip_id + display_name

### trip_invites

Represents a revocable, expiring capability for joining one trip.

Fields:

- id: uuid, primary key
- trip_id: uuid
- token_hash: unique SHA-256 digest
- mode: enum single / group
- max_uses: integer 1-100
- use_count: integer
- expires_at: timestamp
- revoked_at: timestamp nullable
- created_by_member_id: uuid

The raw token is never persisted. A database check keeps use_count between zero and
max_uses and forces single invitations to have exactly one use.

### trip_invite_redemptions

Records which authenticated user consumed an invitation and when. The `(invite_id,
user_id)` pair is unique. `member_id` can become null if an owner later removes that
traveler, preserving the invitation audit record without blocking member removal.

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
- ocr_attempt_count: non-negative integer
- ocr_max_attempts: integer from 1 to 10
- ocr_next_attempt_at: timestamp
- ocr_started_at: timestamp nullable
- ocr_completed_at: timestamp nullable
- ocr_lease_expires_at: timestamp nullable
- ocr_last_error: text nullable
- confirmed_by_member_id: uuid nullable
- confirmed_at: timestamp nullable
- created_at: timestamp
- updated_at: timestamp

Important:

A receipt can exist without an expense. Expense creation happens only after confirmation.

Workers claim rows optimistically by `id + updated_at`. Completion and failure updates
also require the exact lease timestamp so an expired worker cannot overwrite a newer run.

Each `extracted_json.items[]` entry stores the immutable OCR `description`,
`translatedDescription`, `originalLanguage`, `translationStatus`,
`translationSource`, and `translationModel` alongside quantity and amount fields.

Indexes:

- trip_id
- ocr_status
- ocr_status + ocr_next_attempt_at
- ocr_lease_expires_at

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
- source_receipt_id: uuid nullable
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

### proxy_purchases

Groups one or more requested products under an external expense party.

Fields:

- id: uuid, primary key
- trip_id: uuid
- external_member_id: uuid
- payer_member_id: uuid nullable
- expense_id: uuid nullable, unique
- status: enum requested / purchased / cancelled
- currency: string
- note: text nullable
- purchased_at: date nullable
- created_by_member_id: uuid nullable
- created_at: timestamp
- updated_at: timestamp

State rules:

- requested has no payer, expense, or purchase date
- purchased requires a traveler payer, canonical expense, and purchase date
- cancelled retains its historical links; a purchased order's expense is voided
- settled is derived when linked settlements equal the order total, not stored as a second state

### proxy_purchase_items

Represents the individual products in a proxy-purchase order.

Fields:

- id: uuid, primary key
- proxy_purchase_id: uuid
- description: string
- quantity: positive integer
- unit_price: decimal
- amount: decimal, calculated from quantity and unit price
- note: string nullable
- sort_order: integer
- source_receipt_id: uuid nullable
- source_receipt_item_index: non-negative integer nullable
- created_at: timestamp
- updated_at: timestamp

Constraint:

- unique source_receipt_id + source_receipt_item_index
- source receipt and item index are both null or both present

### settlements

Represents an actual repayment between two trip accounting parties.

Fields:

- id: uuid, primary key
- trip_id: uuid
- from_member_id: uuid
- to_member_id: uuid
- amount: decimal
- currency: string
- note: string nullable
- settled_at: date
- proxy_purchase_id: uuid nullable
- created_by_member_id: uuid nullable
- created_at: timestamp

When `proxy_purchase_id` is present, sender, receiver, currency, and remaining amount must match that order. This is the canonical source for partial and complete proxy-purchase collections.

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
- A proxy-purchase order is not a second balance ledger; its expense and settlements are canonical.
- Several receipt-linked proxy-purchase orders can share the receipt's single canonical expense.
- A receipt-linked order is purchased only inside receipt confirmation; it cannot create a second expense.
- OCR originals are never replaced by translated or manually corrected text.
- Do not delete financial records silently. Use status when historical context matters.
