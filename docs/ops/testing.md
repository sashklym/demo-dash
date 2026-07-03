# Testing

| Tier | Where | Run |
|---|---|---|
| BE unit | `be/src/**/*.spec.ts` (mocked repos) | `cd be && npm run test:unit` |
| BE integration | `be/test/integration/**` (`app.inject`, in-memory SQLite) | `cd be && npm run test:integration` |
| FE unit | `fe/src/**/*.test.tsx` (Testing Library, jsdom) | `cd fe && npm run test:unit` |
| E2E | `e2e/tests/**` (Playwright, real BE + FE) | `cd e2e && npx playwright test` |

## E2E

Playwright's `webServer` boots the backend (temp SQLite at `be/data/e2e.sqlite`) and the frontend, runs the scenario, and writes screenshots to `e2e/screenshots/`. First run:

```bash
cd e2e && npm install && npx playwright install chromium && npx playwright test
```

## Notes

- FE tests mock hook modules (`vi.mock('@/hooks/use-widgets')`); jsdom polyfills for Radix/Recharts live in `fe/src/test/setup.ts`.
- The full suite runs in CI ([`ci.yml`](../../.github/workflows/ci.yml)) as backend, frontend, and e2e jobs, with OpenAPI + generated-client drift gates.
