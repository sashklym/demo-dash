---
status: done
type: feature
priority: high
context: platform
---

# Observability & graceful shutdown

Structured logging, a consistent error contract, and clean lifecycle.

## Phases

- [x] pino logging (silent in tests, pretty in dev, JSON in prod; redaction)
- [x] `setErrorHandler` — AJV→400, `AppError`→status, else→500; `{statusCode,error,message}`
- [x] `close-with-grace` — drain requests + close DB on signals + uncaught/unhandled
- [x] Migrations as their own process (`src/migrate.ts`)

## Acceptance

Errors return a consistent JSON shape with correct codes; SIGTERM drains and closes the DB; unhandled rejections are logged.
