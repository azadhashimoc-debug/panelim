# SDD ledger — plan: docs/superpowers/plans/2026-10-31-davamiyyet-temeli.md

User approved execution on 2026-10-31. Native execution.

Pre-flight: Task 2 provides verified sessions and scoped branches consumed by Tasks 3–5; no interface conflicts.
Pre-flight: Task 3 creates attendance rows consumed by Tasks 4–5; corrections preserve shift_id and audit before/after values.
Ruling: This directory is not a Git repository; implement in the approved workspace and track progress here instead of running Git-dependent worktree/commit helpers. Cost: no commit-based rollback until source control is initialized.

## Implementation status

- Task 1: locally implemented. TypeScript, lint, production build and mobile/desktop shell checks passed.
- Task 2: server-verified sessions, secure cookies, RLS and scoped branch access implemented. Local PostgreSQL RLS tests passed. External Supabase login/session refresh remains unverified without project configuration.
- Task 3: signed short-lived QR, conservative geolocation, service-only commands, unique open attendance, audit and durable rate limits implemented. Local rules/SQL tests passed. Real camera/GPS and multi-connection contention acceptance remain pending.
- Task 4: employee dashboard, history, request list, QR scanner/manual link fallback and explicit preview mode implemented. Phone/desktop navigation, keyboard, hydration and WCAG checks passed.
- Task 5: reasoned correction submission, branch manager decisions and transactional before/after audit implemented. Local correction/audit regression tests passed. README includes configuration, rollback and external acceptance checklist.

These are local implementation milestones, not completed production acceptance. No cloud database, deployment, real payment, account or employee data was created.

## Rulings and verification limits

Ruling: Use an in-memory PGlite PostgreSQL engine for executable SQL/RLS tests while Supabase credentials are absent. Cost if wrong: cloud Auth integration and simultaneous connections can still behave differently; neither is claimed verified.
Ruling: QR lifetime is 120 seconds; location accuracy must be at most min(100 metres, branch radius), and distance + accuracy must fit inside the radius. Cost if wrong: legitimate staff with weak GPS may need a correction request; real sites must calibrate the policy.
Ruling: Configured browser tests run on a separate port and build directory with synthetic keys and intercepted API responses, without any production bypass. Cost if wrong: UI success does not prove a cloud write; SQL and cloud acceptance remain separate.

## Independent final review

Fresh reviewer inspected the source and migrations read-only. No Critical findings. Important findings fixed in a single regression pass:

- Final: fixed other-branch assignment disclosure — scoped manager regression RED→GREEN.
- Final: fixed overnight missed-entry correction association — historical overnight regression RED→GREEN.
- Final: fixed stale rejected-decision audit and made approval/rejection snapshots consistent — audit regression RED→GREEN.
- Full suite after fixes: 38/38 unit and PostgreSQL tests passed.
- The browser acceptance gap was addressed with five API-fixture client workflows: success, denied geolocation, network failure, correction request, manager decision. This does not verify live Supabase.

Final: minor (deferred): manager's 36-hour list can omit older forgotten open attendance; employee own history still retains it.
Final: minor (deferred): an unauthenticated QR URL is consumed before login; the employee must rescan after login.
Final: minor (deferred): personal lists stop at 30 records and manager pending list at 100; pagination is pending.
The review's README/ledger observation is resolved by completing the already-planned documentation task.

## Security scan

Production dependency audit: 0 known vulnerabilities. Development lint chain: 16 moderate advisories propagated from minimatch; no high/critical findings. Unsafe major downgrades suggested by npm were not applied. No real secrets were added; `.env.example` contains variable names only and configured tests contain explicitly synthetic credentials.

## Remaining acceptance

Final local verification on 2026-10-31: production build passed; TypeScript compilation passed; lint passed; unit/PostgreSQL suite 38/38; ordinary desktop/mobile E2E including WCAG checks 18/18; configured API-fixture mobile workflows including dynamic-form WCAG checks 5/5. Final total: 61 passing tests. Browser fixtures and PGlite limits above still apply. Temporary test/dev-server reload failures were resolved and the final runs are green; no test failure is counted as a pass.

Provide Supabase environment configuration locally, apply migrations to a separate test project, provision test memberships/assignments, and run real Auth, RLS, simultaneous-connection, camera/GPS and HTTPS phone flows. Git source control, retention/privacy, production backup/monitoring/MFA and the later Business modules remain outside this completed local implementation.

## 2026-11-01 — davamiyyət axınının davamı

İstifadəçi əlavə hesab məlumatı vermədən layihənin hazırlanmasını davam etdirməyi tapşırdı. Mövcud axındakı iki təxirə salınmış problem həll edildi:

- QR keçidindən gələn kod hesab girişinə keçid zamanı saxlanılır və uğurlu girişdən sonra yalnız `/isci` ünvanına ötürülür. Sərbəst yönləndirmə ünvanı qəbul edilmir. URL-dən götürülən kod 1024 simvolla məhdudlaşdırılır; imza, 120 saniyə etibarlılıq, filial səlahiyyəti və məkan yoxlaması əvvəlki kimi serverdə qalır. Demo rejimi URL-dən QR götürmür.
- Rəhbərin filial üzrə davamiyyət sorğusu son 36 saatın qeydlərinə əlavə olaraq köhnə açıq qeydləri də alır. Açıq qeydlər limitdən əvvəl sıralamada önə çəkilir. Filial filtri, rəhbər səlahiyyəti və RLS saxlanılır; siyahının 100 qeyd limiti və səhifələmə məhdudiyyəti qalır.

Yoxlama: rəhbər sorğusunun reqressiya testi əvvəl uğursuz, dəyişiklikdən sonra uğurlu oldu. Mobil QR → giriş → davamiyyət testi əvvəl kodun itdiyini göstərdi, düzəlişdən sonra keçdi. Unit/PostgreSQL testləri 40/40, konfiqurasiyalı mobil brauzer testləri və onların WCAG yoxlamaları 7/7, TypeScript, lint və production build uğurludur. Brauzer API cavabları fixture ilə verilir; canlı istifadəçi girişi yoxlanılmış sayılmır.

Test mühitində Turbopack davamlı səhifə yenilənməsi yaratdı. Konfiqurasiyalı brauzer serveri sənədləşdirilmiş `--webpack` rejiminə keçirildi, readiness yoxlaması işçi səhifəsini əvvəlcədən kompilyasiya edir və soyuq kompilyasiya üçün test limiti 60 saniyədir. Windows-da uğurlu sınaqlardan sonra ilişən development server ağacı ayrıca dayandırıldı; test runner yekunda exit 0 və `7 passed` qaytardı. Lokal tətbiq 3000 portunda yenidən başladıldı.

Canlı Supabase-də Auth və 9 cədvələ yalnız oxuma sorğuları 200 qaytarmışdı. İlkin istifadəçi, şirkət və filial hələ yaradılmayıb; bu dəyişiklik canlı bazaya yazmır, migrasiya tələb etmir. Geri dönüş üçün bu üç tətbiq faylındakı davranış dəyişikliklərini qaytarmaq kifayətdir; mövcud məlumatlar və audit dəyişmir. Sonrakı məhsul mərhələsi növbə idarəsi, icazə/məzuniyyət və Excel çıxarışıdır.

İstifadəçinin sonrakı göstərişi ilə rəsmi Playwright MCP serveri və görünən Chrome vasitəsilə ayrıca canlı UI gəzintisi aparıldı. Mock edilməyən mənfi giriş ssenarisi şəbəkə icazəli lokal serverdə gözlənilən 401 verdi; sessiyasız işçi/rəhbər məlumatları açılmadı. Normal giriş cəhdinin rate-limit sayğacı işləyir; şirkət, filial, işçi və davamiyyət məlumatı yaradılmadı. [Canlı MCP hesabatı və görüntülər](../../2026-11-01-playwright-mcp-yoxlama.md).

Son test düzəlişi: ümumi E2E konfiqurasiyasız 3002 serverinə ayrıldı; konfiqurasiyalı 3000 serveri səhvən təkrar istifadə edilmir. Əvvəl canlı konfiqurasiya səbəbilə uğursuz olan 6 test ayrıca mühitdə keçdi. Yekun ümumi E2E 26/26 (exit 0), fixture E2E 7/7, unit/PostgreSQL 40/40; cəmi 73 avtomatlaşdırılmış test. Son TypeScript və lint də exit 0 qaytardı; production build uğurludur. `dev` üçün Webpack seçimi indi `package.json`-da ümumidir. Uğurlu canlı hesab girişi və fiziki kamera/GPS hələ açıq qəbul meyarlarıdır.
