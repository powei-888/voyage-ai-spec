# Feature Prompt: Booking Hub

```md
Implement the Booking Hub module for Voyage AI.

Read:

- AGENTS.md
- docs/01-product-prd.md
- docs/03-database-design.md
- docs/05-api-design.md

Scope:

- Booking CRUD
- Booking type enum
- Optional attachment URL
- Optional link to itinerary event

Booking types:

- flight
- hotel
- train
- bus
- restaurant
- activity
- car_rental
- other

Rules:

- Booking can exist without a timeline event.
- Timeline event can exist without a booking.
- MVP does not parse booking documents automatically.
- Keep parser design for future AI draft flow.
```
