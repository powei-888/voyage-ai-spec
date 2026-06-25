# Feature Prompt: Expense and Split Calculation

```md
Implement the Expense module for Voyage AI.

Read:

- AGENTS.md
- docs/01-product-prd.md
- docs/03-database-design.md
- docs/05-api-design.md

Scope:

- Expense CRUD
- Expense participants
- Equal split calculation
- Trip balance summary

Rules:

- Only active expenses affect balance.
- Equal split divides expense amount among selected participants.
- Store participant share records.
- Use decimal-safe calculation.
- Add unit tests for balance calculation.

Required tests:

1. One payer, three participants, equal split
2. Multiple expenses with different payers
3. Voided expense ignored
4. Rounding behavior
5. Participant list cannot be empty

Do not implement OCR in this task.
```
