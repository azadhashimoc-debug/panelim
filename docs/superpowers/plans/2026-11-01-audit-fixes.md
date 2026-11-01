# Audit fixes implementation plan

Goal: close the demonstrated registration/billing privilege bypasses before extending product functionality.
Architecture: retain server-verified sessions, common mutation/error handling and service-only SQL commands. Ship forward migrations; do not apply to cloud without deployment review.
Spec: AGENTS.md and the audit in this conversation.

- [x] Add failing server tests for unauthenticated/non-owner billing, RPC failures and registration failure.
- [x] Add failing SQL tests for registration grants and unassigned-manager advances.
- [x] Remove sample-company fallbacks; require owner, propagate rate limits/errors, validate RPC responses, use common HTTP handlers.
- [x] Add forward migration revoking registration access, checking advance branch assignments and using real subscription audit actor with safe idempotency.
- [x] Correct registration failure responses and email-confirmation messaging without deleting user accounts on partial failure.
- [x] Run full unit/SQL, lint, typecheck, build and affected browser checks; retain failing/interrupted results below.

Next stages: hourly payroll and approved overtime ledger; enforce plan entitlements on mutations and downgrade selection; replace manager demo flows with real CRUD. These require their own acceptance tests and are not claimed complete by this security patch.

Constraints: preserve existing uncommitted UI changes; no new dependencies, remote migration, real payment, account deletion or deployment. Work inline in the existing workspace because it contains user changes.

## Review and verification ledger

- Initial security regressions: eight failures reproduced (including successful unauthorized advance and public registration grants); fixed and SQL/server suite green.
- Registration failure and confirmation regressions: two failures reproduced, then fixed.
- Independent read-only review found delayed Free retries could downgrade a later paid plan. Added persistent Free operation results and an interleaving SQL regression; SQL suite 19/19 passed.
- Browser HTTP tests additionally cover 401, cross-origin 403, body-size rejection and no-store responses.
- Demo QR isolation: updated stale test assumption to accept the sample employee's checkout button; reproduced real QR form opening in demo, then changed demo to account-required dialog and removed simulated attendance success.
- E2E artifacts now use separate preview/connected directories. A concurrent run previously deleted another run's trace, and concurrent type generation invalidated a typecheck; neither failed run counts as passing. Final typecheck must run after browser servers stop.
- Navigation verification waits for the requested URL before asserting page content; both desktop/mobile targeted assertions passed after a development compilation timeout in the full run.

Ruling: keep changes in the current dirty workspace and do not commit or reset the user's pre-existing edits. Cost: patch and pre-existing UI changes remain together for manual review.
Ruling: use forward migration 0009 rather than changing deployed migration history. Cost: application billing requires coordinated migration deployment, with a short fail-closed window if deployed out of order.
Ruling: do not delete Auth users after failed onboarding. Cost: a failed company transaction can leave an account needing onboarding recovery; a resumable setup flow remains outstanding.

Open product work: plan gating/downgrade selection, approved overtime and hourly payroll, accountant-specific financial visibility, real manager CRUD and reports. These remain explicitly incomplete.

Latest evidence: 61/61 unit/API/SQL tests passed; lint passed. Browser preview's final assertion results: 25 passed, one desktop demo-to-history navigation timeout (mobile equivalent passed). Connected set displayed all eight scenario passes but its runner did not finish cleanup and was interrupted; it is not reported as a clean exit. Both targeted navigation assertions passed after URL-based synchronization. Browser suites are not claimed fully green. Initial contrast and preview-label failures no longer reproduced in the final preview run.

Final after browser servers stopped: TypeScript exit 0, production build exit 0, git diff whitespace check exit 0. No remote migration, deployment or commit was performed.

## Follow-up: verification completion (1 November 2026)

The first requested follow-up item was handled inline, preserving the existing changes. Restricted Windows execution reproduced a runner hanging after a passed desktop demo scenario. Playwright's Windows webServer teardown uses `taskkill` and waits for process closure; running with the required process permissions resolved teardown. Five desktop demo repeats exited cleanly (5/5). Both full browser suites subsequently exited without manual interruption and ports 3001/3002 were verified closed.

The initial full preview rerun failed 1/26 on desktop employee history: its 5-second heading assertion expired while the RSC request was pending and Next.js was rebuilding. Added a bounded 30-second URL wait before the history assertion and aligned demo/request navigation waits; demo history and requests now also assert the resulting page headings. No sleeps, retries, forced runner exit or application navigation workaround were added. The earlier demo-specific timeout did not independently reproduce, so its exact cause remains unproven.

Final evidence: preview 26/26 exit 0; connected fixture set 8/8 exit 0; unit/API/PGlite 61/61 exit 0; lint, TypeScript, production build and whitespace check exit 0. Failed-run evidence and Windows execution requirements are recorded in [the follow-up verification note](../../2026-11-01-dogrulama-tamamlanmasi.md). The remaining product and live-environment work above is unchanged.
