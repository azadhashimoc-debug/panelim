# Paket limitləri Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce company limits and complete owner-selected Free transition without losing history.
**Architecture:** Serialize company mutations in PostgreSQL, persist expiry on subscription checks, guard business commands, and expose an owner-only selection RPC/API and real subscription UI.
**Tech Stack:** Existing Next.js, TypeScript, Supabase/PostgreSQL, Vitest/PGlite, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-01-paket-limitleri-design.md` (approved).

## Global Constraints

- Free 3/1, Start 10/1, Business 25/2, Growth 50/3; additional branches never exceed 3 total.
- Owner counts and remains selected; preserve archived/history records and existing edits.
- No new dependencies, infrastructure, live payments, or unrelated modules.
- Azerbaijani UI and server-side authorization; package suspension differs from archival.

## Review Focus

Expiry at the exact boundary; idempotent retries after upgrades; cross-company selections; simultaneous capacity activation; suspended actors/targets attempting writes while retaining historical reads.

### Task 1: Database enforcement and Free selection

**Files:** `supabase/migrations/0010_subscription_limits.sql`, `tests/integration/subscription-limits.test.ts`.
**Interfaces:** existing `get_subscription_status(uuid)` returns effective counts/limits; new `complete_free_selection(p_actor uuid,p_company uuid,p_members uuid[],p_branch uuid,p_key text)` returns successful idempotent result. Add `plan_disabled_at` to memberships/branches; enforce via company lock and activation triggers. Wrap existing write RPCs with checks before row locks.

- [ ] Write PGlite cases for expiry, limits, selection, authorization, audit, history and replay.
- [ ] Run explicit integration config and observe expected failures.
- [ ] Implement additive migration, capacity/operation guards and atomic selection.
- [ ] Run new and existing database tests.

### Task 2: Server/API contract

**Files:** `src/modules/organization/server/billing.ts`, `src/app/api/billing/selection/route.ts`, `src/shared/types.ts`, `src/shared/i18n/az.ts`, `src/shared/server/http.ts`, unit tests.
**Interfaces:** GET selection returns eligible members/branches, owner membership and status; POST validates IDs/key then invokes owner-authorized selection RPC. Existing billing GET contract stays compatible.

- [ ] Add failing validation/authorization tests.
- [ ] Add owner-only selection service and route; propagate stable limit errors.
- [ ] Verify tests and TypeScript.

### Task 3: Real subscription and selection UI

**Files:** `src/modules/organization/ui/subscription-panel.tsx`, `src/modules/organization/ui/manager-hub.tsx`, `tests/e2e/subscription.spec.ts`.
**Interfaces:** use existing `/api/billing` for status/checkout and `/api/billing/selection` for choices/completion. Keep current subscription separate from proposed checkout.

- [ ] Add browser cases for expired trial selection, failure/retry, persisted counts and unavailable session.
- [ ] Replace sample subscription panel with accessible real-data component; preserve other demo modules.
- [ ] Run browser tests on desktop/mobile, unit/integration tests, lint and typecheck.

## Execution ledger

- Baseline: `npm.cmd test` passed 67 tests. Integration tests are separately configured and will be run explicitly.
- Ruling: execute in the supplied working directory to preserve existing uncommitted implementation; no worktree or commits created. User approval authorizes implementation; routine execution choices do not require another approval.
- Ruling: no delegation; implement and review within this session.
