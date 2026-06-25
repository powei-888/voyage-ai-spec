# Codex Bootstrap Prompt

Use this prompt when starting implementation with Codex.

```md
You are helping build Voyage AI, an AI-native travel collaboration platform.

This is not a simple AI itinerary demo.

Before coding, read these files:

- README.md
- AGENTS.md
- docs/00-project-vision.md
- docs/01-product-prd.md
- docs/02-user-flow.md
- docs/03-database-design.md
- docs/04-system-design.md
- docs/05-api-design.md
- docs/06-ai-design.md
- docs/07-roadmap.md

Your first task is to inspect the existing codebase and propose an implementation plan for v0.1 Foundation MVP.

MVP scope:

1. Trip CRUD
2. Member management
3. Day-by-day timeline
4. Event CRUD
5. Manual expense creation
6. Equal split calculation
7. Receipt upload with mock OCR
8. Receipt confirmation flow
9. Booking CRUD
10. AI proposal entity and basic lifecycle

Important rules:

- Do not implement real OCR yet. Use a mock OCR provider behind an interface.
- Do not call AI providers directly from the frontend.
- Do not hardcode prompts inside UI components.
- Receipt OCR output must create a draft first.
- The user must confirm receipt extraction before an expense is created.
- AI changes must be stored as proposals first.
- Do not silently modify canonical trip data from AI output.
- Keep modules small.
- Add tests for split calculation and OCR confirmation flow.

Before changing files, output:

1. Existing project structure summary
2. Proposed module structure
3. Database schema plan
4. API plan
5. Test plan
6. Risks and assumptions
7. Files you plan to create or modify

Wait for confirmation before implementing if this is an interactive session.
```
