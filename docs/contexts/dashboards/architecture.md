# Dashboards Architecture

> Scope: `be/src/modules/dashboards`, the anonymous-session model.

## Purpose

A dashboard is the tenant boundary. There are no users or passwords — a dashboard is identified by an unguessable **key** (a capability token). Whoever holds the key can view and edit that dashboard.

## Data model

`Dashboard` (`dashboards` table): `id` (uuid), `key` (unique, indexed, URL-safe `crypto.randomBytes(16).base64url`), `title`, timestamps.

## Flow

- `POST /api/dashboards` → generates a key, returns `{ key, title }`.
- `GET /api/dashboards/:key` → validates/restores, or 404.
- `DashboardService.requireByKey(key)` is the scoping gate reused by every widget operation — resolve the key to a dashboard (404 if unknown), then scope widget queries to `dashboard_id`.

## Design notes

- The key lives in the URL path (`/api/dashboards/:key/…`) as a capability token, and on the frontend at `/d/:key`. Losing the key means losing the dashboard — acceptable for an anonymous, zero-friction model.
- Tenant isolation is enforced in the service layer (not relied on at the DB level), so a widget from another dashboard is never visible or mutable.

## Key files

- `dashboard.entity.ts`, `dashboard.service.ts`, `dashboard.controller.ts`
- `core/random.ts` — `generateKey()`
