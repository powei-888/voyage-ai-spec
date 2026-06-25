# 06. AI Design

## AI product principle

AI helps the user understand and prepare changes. It should not silently change canonical trip data.

Required pattern:

```text
AI Output -> Proposal or Draft -> User Review -> Apply
```

## AI use cases

### 1. Receipt extraction

Input:

- receipt image

Output:

- merchant
- amount
- currency
- date
- category suggestion
- confidence score

Flow:

```text
Upload image -> OCR provider extracts fields -> receipt draft updated -> user reviews -> user confirms -> expense created
```

MVP provider:

- mock OCR provider

Future providers:

- cloud vision model
- local OCR model
- hybrid OCR plus LLM parser

### 2. Itinerary conflict check

Input:

- day timeline
- event times
- locations if available

Output:

- warning list
- explanation
- suggested fix

Example issues:

- event time overlap
- too little travel buffer
- too many activities in one day
- missing meal time

### 3. Itinerary relaxation proposal

Input:

- selected day
- user instruction

Output:

- proposed event updates
- proposed removed events
- proposed reordered events
- summary

The output should be stored as AIProposal first.

### 4. Expense categorization

Input:

- expense title
- merchant
- receipt fields

Output:

- category suggestion
- confidence score
- explanation

### 5. Budget summary

Input:

- trip budget
- confirmed expenses
- members
- timeline

Output:

- total recorded amount
- category summary
- simple insight text
- warning if recorded costs are high compared with budget

## AI proposal schema

Example proposed JSON for itinerary update:

```json
{
  "operations": [
    {
      "type": "update_event_time",
      "eventId": "event-id",
      "reason": "Adds more travel buffer."
    }
  ]
}
```

## Prompt design rules

- Prompts should live in AI module files, not UI components.
- Use structured output schemas.
- Include trip context only when needed.
- Avoid sending unnecessary personal data.
- Log provider, model, latency, and result status.

## Correctness rules

- OCR result is a draft.
- Booking parsing result is a draft.
- Itinerary update is a proposal.
- Expense creation requires explicit user action.
- Proposal application must validate current data before applying.

## Testing AI flows

MVP tests should focus on service behavior:

- mock provider returns extracted receipt fields
- receipt remains unconfirmed before user confirmation
- confirmed receipt creates expense
- rejected AI proposal does not apply changes
- accepted AI proposal applies only allowed operations
