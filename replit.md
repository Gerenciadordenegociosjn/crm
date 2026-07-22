# CRM Pipeline – Locação de Contas de Anúncio

Sistema de CRM/Pipeline para gestão de locação de contas de anúncio, com kanban visual, gestão de clientes, contas de anúncio, timeline de atividades, relatórios e integração com WhatsApp/IA.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, served at /api)
- `pnpm --filter @workspace/crm-pipeline run dev` — Frontend React/Vite
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `SESSION_SECRET` — JWT signing secret (defaults to dev secret)
- Optional env: `INTEGRATION_KEY` — WhatsApp integration API key (defaults to dev key)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + @hello-pangea/dnd (kanban drag-drop) + recharts
- API: Express 5 + JWT auth (bcryptjs + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, clients, deals, ad-accounts, activities)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, users, clients, deals, activities, ad-accounts, dashboard, integrations)
- `artifacts/crm-pipeline/src/` — React frontend

## Architecture decisions

- JWT stored in localStorage as `crm_token`; attached via `setAuthTokenGetter` in `custom-fetch.ts`
- `numeric` Drizzle columns require string values; all number→string conversions happen at the route level before DB insert/update
- WhatsApp integration endpoints protected by `X-Integration-Key` header (separate from user JWT)
- Dashboard `/pipeline` endpoint returns all deals pre-grouped by stage for the Kanban board
- Date fields (`acceptanceDate`, `contractEndDate`, `startDate`, `endDate`) stored as `YYYY-MM-DD` strings

## Product

- **Pipeline Kanban**: 9 stages (Lead Captado → Encerrado) with drag & drop
- **Deal detail**: full form for all deal fields + activity timeline
- **Clients**: list, detail with linked deals & ad accounts
- **Ad Accounts**: list/filter by client, platform, status
- **Reports**: KPI cards, stage breakdown chart, recent activity feed
- **Admin**: user management (create/edit/activate/deactivate)
- **WhatsApp/AI endpoints**: create lead, update stage, update client, lookup by phone

## Test credentials (dev seed)

- Admin: `admin@crm.com` / `admin123`
- Sales: `carlos@crm.com` / `sales123`
- Sales: `ana@crm.com` / `sales123`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing OpenAPI spec, always re-run `pnpm --filter @workspace/api-spec run codegen` before using updated types
- After changing `lib/*` schemas, run `pnpm run typecheck:libs` to rebuild declarations before running artifact typechecks
- `numeric` Drizzle columns expect `string` values — convert numbers with `.toString()` before insert/update
- Date columns use `{ mode: "string" }` — pass `YYYY-MM-DD` strings, not `Date` objects

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
