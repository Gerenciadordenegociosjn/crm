---
name: Codegen HMR AuthContext crash
description: When orval codegen regenerates api-client-react files, Vite HMR cascades into AuthContext.tsx creating a new context object, breaking provider/consumer identity.
---

## The rule
Split React context creation into a separate file (`auth-context-ref.ts`) that has **no runtime imports** from `@workspace/api-client-react`. Use `import type` for any type references — type-only imports are erased at compile-time and Vite does not add them to the HMR dependency graph.

**Why:** `AuthContext.tsx` imports `useGetMe`, `setAuthTokenGetter`, etc. from `@workspace/api-client-react`. When codegen (orval) deletes and recreates those files, Vite cascades HMR into everything that imports them — including `AuthContext.tsx`. HMR replaces the module, which calls `createContext(null)` again, producing a **new object reference**. The already-rendered `AuthProvider` holds the old reference; the new `useAuth` reads from the new one → `useContext` returns `null` → crash.

**How to apply:** Any time you run `pnpm run codegen` (orval), the `auth-context-ref.ts` file stays stable because it only depends on React (which never changes due to codegen). The context object identity is preserved across all HMR cycles.

## File layout (crm-pipeline)
- `src/contexts/auth-context-ref.ts` — only `import { createContext } from 'react'` + `import type { User }` + the `AuthContext` constant.
- `src/contexts/AuthContext.tsx` — imports `AuthContext` from `auth-context-ref.ts`, contains `AuthProvider` and `useAuth`.

## Secondary fix applied
Also removed `useAuth()` call from the `Router` component in `App.tsx`. Router only needs `useAuth` via `ProtectedRoute` (which always renders inside `AuthProvider`). Calling it directly in `Router` added unnecessary fragility — one extra callsite for the HMR mismatch to break.

## Recovery steps when crash occurs
1. Clear Vite module cache: `rm -rf artifacts/crm-pipeline/node_modules/.vite`
2. Restart `artifacts/crm-pipeline: web` workflow.
3. If crash persists, also restart `artifacts/api-server: API Server` (may have stale Zod schemas).
