---
name: Zod query params date format
description: Using `format: date` in OpenAPI query param schemas causes orval to generate zod.date() which rejects HTTP string values → 400 errors.
---

## The rule
Do **not** use `format: date` (or `format: date-time`) on query parameter schemas in `lib/api-spec/openapi.yaml`. Use plain `type: string` instead.

**Why:** HTTP query strings are always strings. Orval maps `format: date` → `zod.date()`, which expects a `Date` object at runtime — not a string. Every request using that param fails Zod validation with a 400.

**How to apply:** Only use `format: date` on **response body / request body** schemas (JSON fields that get deserialized). For query params, keep it as `type: string`.

## Affected endpoints (already fixed)
- `GET /dashboard/pipeline` — `start_date`, `end_date`
- `GET /dashboard/reports` — `start_date`, `end_date`

## Fix
In `lib/api-spec/openapi.yaml`, remove `format: date` from query param schemas, then run `pnpm run codegen` from `lib/api-spec/`. Orval will generate `zod.coerce.string().optional()` instead.
