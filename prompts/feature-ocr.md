# Feature Prompt: Receipt OCR Flow

```md
Implement the Receipt OCR confirmation flow for Voyage AI.

Read:

- AGENTS.md
- docs/01-product-prd.md
- docs/03-database-design.md
- docs/04-system-design.md
- docs/06-ai-design.md

Scope:

- Receipt upload endpoint
- Receipt draft record
- Mock OCR provider
- Extracted JSON storage
- Review data endpoint
- Confirm receipt into expense

Rules:

- Do not implement real OCR provider yet.
- Define an OCR provider interface.
- The mock provider should return predictable sample fields.
- OCR result must not directly create an expense.
- User confirmation creates the final expense.
- Add tests for draft to extracted to confirmed flow.

States:

- pending
- processing
- extracted
- confirmed
- failed
```
