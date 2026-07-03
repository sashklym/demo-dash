---
status: done
type: test
priority: high
context: platform
---

# Test pyramid

Unit + integration + whole-service e2e across the stack.

## Phases

- [x] BE unit (Vitest, mocked repos) — services + PRNG
- [x] BE integration (Vitest + `app.inject`, in-memory SQLite)
- [x] FE unit (Vitest + Testing Library, jsdom polyfills)
- [x] E2E (Playwright) — bootstrap → add → persist → reload → restore-by-key → delete
- [x] Screenshots committed as living docs

## Acceptance

`test:unit` + `test:integration` (be), `test:unit` (fe), and `playwright test` (e2e) all pass locally and in CI.
