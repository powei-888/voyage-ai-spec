# Feature Prompt: AI Proposal System

```md
Implement the AI proposal foundation for Voyage AI.

Read:

- AGENTS.md
- docs/01-product-prd.md
- docs/03-database-design.md
- docs/05-api-design.md
- docs/06-ai-design.md

Scope:

- AIProposal model
- Create proposal endpoint
- List proposal endpoint
- Accept proposal endpoint
- Reject proposal endpoint
- Mock AI proposal service

Rules:

- AI must not directly mutate canonical data.
- Accepting a proposal must go through an application service.
- Proposal JSON must be validated before saving and before applying.
- MVP may store proposals without implementing every apply action.

Before coding, show file plan and test plan.
```
