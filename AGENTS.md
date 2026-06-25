# AGENTS.md

This file defines rules for Codex, Claude Code, Cursor, and other coding agents working on Voyage AI.

## Project identity

Voyage AI is an AI-native travel collaboration platform.

It is not only a trip planner. It is a structured workspace for itinerary, expenses, receipts, bookings, collaboration, and memories.

## Main rule

Do not turn this project into a quick demo. Build it as a maintainable product.

## Before coding

For every task, first inspect the current project structure and respond with:

1. What you understood
2. Files you plan to add or change
3. Data model impact
4. API impact
5. Test plan
6. Risks or assumptions

Do not rewrite unrelated files.

## Architecture rules

Use modular architecture.

Recommended modules:

- trips
- members
- itinerary
- expenses
- receipts
- bookings
- ai-proposals
- common

Rules:

- Do not put business logic inside React components.
- Do not call AI providers directly from the frontend.
- Do not hardcode prompts inside UI components.
- Put business rules in service/application layer.
- Put database access behind repository or query layer.
- Keep DTOs and validation explicit.
- Keep modules small and testable.

## AI rules

AI can suggest, extract, classify, summarize, and generate proposals.

AI must not directly apply high-impact changes to canonical data.

Required flow for AI-generated changes:

```text
User Request -> AI Proposal -> Preview -> User Confirm -> Apply
```

Examples:

- OCR result must be confirmed before creating an expense.
- Itinerary changes must be previewed before applying.
- Expense classification suggestions must be editable.
- Booking parsing must create a draft first.

## Financial calculation rules

Expense and split logic must be deterministic and tested.

Required tests:

- equal split among all participants
- payer included in participants
- payer not included in participants
- rounding behavior
- multiple expenses settlement
- deleted or voided expense should not affect balance

## OCR rules

MVP should use a mock OCR service first.

The system should still define an interface so real OCR or vision providers can be plugged in later.

Required OCR flow:

```text
Upload receipt image -> create receipt draft -> OCR processing -> extracted fields -> user review -> confirm -> create expense
```

Do not skip the user review step.

## File size rules

- Avoid files over 300 lines unless justified.
- Split services before they become large.
- Do not create god modules.
- Do not create giant page components.

## Commit style

Use meaningful commits:

- docs: add product vision
- docs: define OCR workflow
- feat(expense): add split calculation
- test(expense): cover equal split settlement
- refactor(ai): isolate proposal service

## Stop conditions

Stop and ask for review when:

- A data model change affects multiple modules.
- A migration may be destructive.
- A feature requires external provider credentials.
- A file would become too large.
- Requirements conflict with these rules.
