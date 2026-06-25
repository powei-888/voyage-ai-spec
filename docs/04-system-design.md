# 04. System Design

## Architecture goal

Voyage AI should be built as a modular web application that can later grow into a full product.

The MVP should stay simple, but the boundaries must be clear.

## Preferred architecture

```text
Frontend Web App
  -> Backend API
      -> Application Services
      -> Repositories
      -> PostgreSQL
      -> Object Storage
      -> Queue
          -> OCR Worker
          -> AI Worker
```

## Suggested stack

Frontend:

- React or Next.js
- TypeScript
- component-based UI

Backend:

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- REST API first

Storage:

- S3-compatible object storage for receipts, attachments, and future photos

AI:

- provider interface for LLM
- provider interface for OCR or vision extraction
- mock provider for MVP

Jobs:

- queue for OCR and AI tasks
- workers for long-running extraction

## Backend modules

Recommended NestJS modules:

```text
src/modules/trips
src/modules/members
src/modules/itinerary
src/modules/expenses
src/modules/receipts
src/modules/bookings
src/modules/ai-proposals
src/common
src/infra
```

## Layering

Each module should use clear layering:

```text
controller -> service -> repository -> database
```

DTOs and validation should be explicit.

Do not put business rules inside controllers.

Do not let frontend directly calculate canonical split results unless it is only for preview.

## AI boundary

AI services should live behind an application service.

Example:

```text
ReceiptController
  -> ReceiptService
      -> OcrProvider interface
      -> ReceiptRepository
```

Frontend should never call an AI provider directly.

## OCR processing options

MVP option:

```text
Upload -> create receipt row -> mock OCR immediately -> extracted_json -> review screen
```

Production option:

```text
Upload -> create receipt row -> enqueue OCR job -> worker extracts fields -> update receipt -> notify frontend
```

The service interface should support both.

## AI proposal processing

AI-generated changes should be represented as proposals.

```text
User asks for help
  -> AI service analyzes trip context
  -> AIProposal created
  -> frontend renders preview
  -> user accepts or rejects
  -> service applies accepted proposal
```

## Error handling

Recommended API error shape:

```json
{
  "error": {
    "code": "RECEIPT_OCR_FAILED",
    "message": "Receipt extraction failed.",
    "details": {}
  }
}
```

## Access rules

MVP must still include basic access rules:

- User must be a trip member to access trip data.
- Only owner can archive trip.
- Members can edit itinerary and expenses.
- Receipt files should use controlled access URLs.

## Testing strategy

Required unit tests:

- equal split calculation
- settlement aggregation
- OCR draft to confirmation flow
- AI proposal cannot apply if rejected

Recommended integration tests:

- create trip
- add itinerary event
- upload receipt draft
- confirm receipt into expense
- add booking and link to event
