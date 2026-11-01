# Gerçek Yönetici Ekranları (Manager Hub Real DB Integration) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rəhbər kabinetini (`/rehber` - `ManagerHub`) saxta/mock məlumatlardan azad edib işçi/filial idarəetməsi, növbələr, müraciət qərarları (icazə/düzəliş), avans və maaş axınlarını tam olaraq verilənlər bazasına bağlamaq.

**Architecture:**
1. Server tərəfində `GET /api/rehber` marşrutu təqdim edilir:
   - `requireSession()` ilə sessiya doğrulanır, istifadəçinin `owner` və ya `manager` rolu yoxlanılır.
   - Şirkətin filialları, işçiləri (`memberships`), əmək şərtləri (`employment_terms`), filial təyinatları (`branch_assignments`), növbələri (`shifts`), müraciətləri (`leave_requests`, `corrections`), avansları (`salary_advances`), bağlanmış ayları (`payroll_periods`) və bu günün davamiyyəti (`attendance`) paralel olaraq bazadan oxunur.
2. Server tərəfində `POST /api/rehber` mutasiyaları təqdim edilir:
   - `add_employee`: `auth.admin.createUser` + `memberships` + `employment_terms` + `branch_assignments` (paket tutumu tətiyi ilə qorunur).
   - `add_branch`: `branches` insert (paket filial limiti tətiyi ilə qorunur).
   - `add_shift`: `shifts` insert.
3. Mövcud `POST /api/leave-requests`, `POST /api/corrections`, `POST /api/payroll` marşrutları ilə müraciət qərarları və avans/maaş əməliyyatları tam inteqrasiya edilir.
4. `src/modules/organization/ui/manager-hub.tsx`:
   - `Overview`, `TeamSample` -> `TeamPanel`, `ScheduleSample` -> `SchedulePanel`, `RequestsSample` -> `RequestsPanel`, `PayrollSample` -> `PayrollPanel` real verilənlərə və dialoqlara bağlanır.

**Tech Stack:** Next.js App Router, Supabase Postgres/SSR, Zod, React Hooks, Vitest.

---

### Task 1: Server Service & API Route for Manager Hub (`GET & POST /api/rehber`)
**Files:**
- Create: `src/modules/organization/server/manager-hub.ts`
- Create: `src/app/api/rehber/route.ts`
- Create: `tests/unit/manager-hub.test.ts`

- [ ] **Step 1: Write failing unit tests for `/api/rehber` (authorization, data retrieval, employee creation, branch creation, shift creation)**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `src/modules/organization/server/manager-hub.ts` and `src/app/api/rehber/route.ts`**
- [ ] **Step 4: Run unit tests to verify they pass**

### Task 2: Real Database Integration in `ManagerHub` UI
**Files:**
- Modify: `src/modules/organization/ui/manager-hub.tsx`

- [ ] **Step 1: Implement data fetching hook with loading, error and real company header in `ManagerHub`**
- [ ] **Step 2: Implement Real Overview metrics and live clock-in list**
- [ ] **Step 3: Implement Real Team & Branch panel with "+ İşçi əlavə et" modal**
- [ ] **Step 4: Implement Real Schedule panel with "+ Növbə əlavə et" modal**
- [ ] **Step 5: Implement Real Requests panel with Approve/Reject modal & reason**
- [ ] **Step 6: Implement Real Payroll panel with "+ Avans ver" and "Ayı bağla" modals**

### Task 3: Verification, Typecheck, Lint, and Regression Suite
- [ ] **Step 1: Run `npx tsc --noEmit`**
- [ ] **Step 2: Run `npm run lint`**
- [ ] **Step 3: Run full vitest suite `npm test`**
