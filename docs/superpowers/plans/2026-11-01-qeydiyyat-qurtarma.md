# Qeydiyyat Qurtarma (Registration Recovery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hesabı yaranmış lakin şirkət qurulumu (`register_company`) uğursuz olmuş və ya yarımçıq qalmış istifadəçinin qeydiyyatı yenidən cəhd edərək və ya daxil olaraq qurulumu təhlükəsiz tamamlamasını təmin etmək.

**Architecture:** 
1. `api/auth` qeydiyyat marşrutunda `ALREADY_EXISTS` halında istifadəçi parolu ilə identifikasiya yoxlanılır; əgər aktiv üzvlüyü (`memberships`) yoxdursa, yarımçıq qalmış şirkət qurulumu bərpa olunur.
2. `api/auth` üzərində aktiv sessiyalı istifadəçilər üçün `complete_setup` əməliyyatı təqdim edilir.
3. Giriş (`login`) zamanı üzvlüyü olmayan istifadəçi aşkarlandıqda qurulumun tamamlanması səhifəsinə yönləndirilir (`needsSetup`).
4. Qeydiyyat səhifəsi (`/qeydiyyat`) mövcud sessiya üçün adaptiv rejim təqdim edir (şifrə tələb etmədən şirkət məlumatlarını daxil edərək tamamlamaq).

**Tech Stack:** Next.js App Router, Supabase Auth & SSR, Vitest, Zod, PostgreSQL RPC.

**Spec:** AGENTS.md, `docs/superpowers/plans/2026-11-01-audit-fixes.md` (Ruling: do not delete Auth users after failed onboarding).

## Global Constraints
- Hesablar silinmir (`auth.users` silinməsi qadağandır).
- Autentifikasiya yoxlanmadan başqasının hesabına şirkət qurulmasına icazə verilmir (təhlükəsizlik prioriteti).
- İcazəsiz istifadəçiyə hesabın mövcudluğu və ya parolu barədə məlumat sızdırılmır.
- Bütün pul və limit qaydaları qorunur.

## Review Focus
1. Başqasının e-poçtunu fərqli şifrə ilə daxil edən kənar şəxs `ALREADY_EXISTS` almalı və heç bir məlumat əldə etməməlidir.
2. Şirkət qeydiyyatı artıq tamamlanmış olan istifadəçi yenidən qeydiyyatdan keçməyə çalışdıqda `ALREADY_EXISTS` almalıdır.
3. Şirkət qurulumu uğursuz olmuş istifadəçi eyni şifrə ilə qeydiyyat formasını təkrar göndərdikdə şirkəti uğurla qurulmalıdır (`recovered: true`).
4. Giriş etmiş amma şirkəti olmayan istifadəçi `complete_setup` ilə şirkətini qura bilməlidir.
5. `login` əməliyyatı şirkətsiz istifadəçiyə `needsSetup: true` qaytarmalıdır.

---

### Task 1: Failing Unit Tests for Registration Recovery & Complete Setup
**Files:**
- Modify: `tests/unit/registration-security.test.ts`
- Test: `tests/unit/registration-security.test.ts`

- [x] **Step 1: Write the failing tests**
- [x] **Step 2: Run test to verify it fails**

### Task 2: Implement Recovery Logic & Complete Setup in `src/app/api/auth/route.ts`
**Files:**
- Modify: `src/app/api/auth/route.ts`
- Test: `tests/unit/registration-security.test.ts`

- [x] **Step 1: Add `complete_setup` action schema and verification**
- [x] **Step 2: Add recovery branch to `action: "register"` when user already exists in auth but lacks membership**
- [x] **Step 3: Add `needsSetup` check to `action: "login"`**
- [x] **Step 4: Run unit tests to verify they pass**

### Task 3: Adaptive Registration UI and Login Redirection
**Files:**
- Modify: `src/modules/identity/ui/login-form.tsx`
- Modify: `src/app/qeydiyyat/page.tsx`
- Modify: `src/modules/identity/ui/register-form.tsx`

- [x] **Step 1: Update `login-form.tsx` to handle `needsSetup` redirect**
- [x] **Step 2: Update `qeydiyyat/page.tsx` to detect pending user session without membership**
- [x] **Step 3: Update `register-form.tsx` to render setup continuation form for pending user**
- [x] **Step 4: Verify typecheck, lint, and full test suite**
