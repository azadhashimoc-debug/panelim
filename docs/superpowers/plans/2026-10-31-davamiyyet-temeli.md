# Panelim — davamiyyət təməlinin icra planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** İşçinin mobil brauzerdə hesabına daxil olub filial QR kodu və məkan yoxlaması ilə giriş/çıxış etməsi və problem olduqda düzəliş müraciəti göndərməsi.

**Architecture:** Eyni Next.js tətbiqində UI və server əməliyyatları; framework-dən asılı olmayan davamiyyət domeni. Supabase Auth və PostgreSQL; server yoxlamaları, RLS və versiyalı SQL migrasiyaları birlikdə şirkət/filial sərhədlərini qoruyur.

**Tech Stack:** Əvvəlki sənədlərdə təsdiqlənmiş Next.js, TypeScript, PostgreSQL, Supabase və Vercel. Paket versiyaları quraşdırmadan əvvəl rəsmi sənədlərdən yoxlanılır. Bu mərhələdə yeni bulud layihəsi, canlı deploy və real ödəniş yaradılmır.

**Spec:** `docs/panelim-design.md`, `docs/texnologiya-qerari.md` və istifadəçinin cari AGENTS.md göstərişləri.

## Mövcud vəziyyət və əhatə

İşçi tətbiqi, kök package.json və testlər yoxdur. `panelim-kreativ/video` təqdimat videosunun ayrıca layihəsidir və saxlanılır. Qovluq hazırda Git repozitoriyası deyil; mövcud tarixçə və worktree yoxdur. Tətbiq kökdə qurulur, mövcud docs və kreativ fayllar dəyişdirilmir. İlkin əhatə davamiyyət axınıdır; maaş, marketinq saytının tam hazırlanması və digər Business modulları sonrakı mərhələlərdir.

## Global Constraints

- Azərbaycan dili; AZN; Asia/Baku; mobil-first, semantik HTML, klaviatura və görünən fokus.
- Filial rəhbəri yalnız təyin olunmuş filialda, işçi yalnız öz məlumatlarında əməliyyat aparır.
- Klientdən gələn şirkət, işçi, vaxt və səlahiyyət dəyərlərinə etibar edilmir.
- Məkan və internet xətası uğurlu davamiyyət qeydi kimi təqdim edilmir.
- Gecə növbəsi başladığı növbəyə bağlanır; gecikmə pul cəriməsi yaratmır.
- Düzəlişin səbəbi, əvvəlki/yeni dəyərləri, təsdiqləyən şəxs və vaxt auditdə saxlanılır.
- Sirrlər repozitoriyaya, jurnallara və klient paketinə daxil edilmir.

## Review Focus

1. Paralel iki giriş sorğusu yalnız bir açıq davamiyyət qeydi yaradır — Task 2 və 3 inteqrasiya testi.
2. Başqa şirkətin və ya başqa filialın QR kodu, qeydi və müraciəti rədd edilir — Task 2 RLS və Task 3 server testləri.
3. Məkan icazəsinin rəddi, zəif dəqiqlik və internetin itməsi təsdiq göstərmir — Task 4 mobil brauzer testi.
4. Gecə yarısından sonrakı çıxış əvvəlki günün növbəsinə bağlanır — Task 3 domen testi.
5. İki dəfə verilən düzəliş qərarı və arxiv işçinin əməliyyatı rədd edilir — Task 2 və 5 tranzaksiya testləri.

## Task 1: İşləyən tətbiq təməli

**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`, `README.md`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/shared/i18n/az.ts`, `tests/e2e/shell.spec.ts`.

**Interfaces:** Əsas səhifə və `/health` endpoint; Azərbaycan dilində mərkəzləşdirilmiş UI mətnləri. Nümunə konfiqurasiya yalnız dəyişən adlarını ehtiva edir.

- [ ] Next.js və Supabase rəsmi sənədlərini, uyğun Node tələblərini yoxla; paket versiyalarını lock faylında saxla. Windows-da npm.ps1 məhdudiyyətinə görə `npm.cmd` istifadə et.
- [ ] Mobil səhifənin başlığını, naviqasiyanı və klaviatura fokusunu yoxlayan brauzer testi yaz; səhifə olmadığı üçün uğursuz nəticəni gör.
- [ ] Minimal layihə və tətbiq skeleti qur; Azərbaycan dilini və Asia/Baku formatlayıcısını mərkəzləşdir. Hazır olmayan əməliyyatlar uğurlu göstərilmir.
- [ ] `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` və shell brauzer testini işə sal.

## Task 2: Sessiya və məlumat sərhədləri

**Files:** `supabase/migrations/0001_identity_attendance.sql`, `src/modules/identity/server/session.ts`, `src/modules/organization/server/access.ts`, `src/infrastructure/supabase/server.ts`, `src/app/giris/page.tsx`, `tests/integration/tenant-isolation.test.ts`.

**Interfaces:** `requireSession()` doğrulanmış istifadəçi verir; `requireBranchAccess(branchId, permission)` şirkət, aktiv üzvlük və filial səlahiyyətini yoxlayır. Şirkət, filial, işçi, təyinat, növbə, davamiyyət və audit identifikatorları UUID-dir.

- [ ] Anonim giriş, iki şirkət arasında oxu/yazı, başqa filial rəhbəri, arxiv işçi və işçinin başqasının qeydini oxuması üçün rədd testləri yaz və uğursuzluqlarını yoxla.
- [ ] Supabase sessiyasını serverdə doğrula; təhlükəsiz cookie, çıxış və giriş xəta vəziyyətlərini qur. Xidmət açarını klientdən kənarda saxla.
- [ ] Versiyalı migrasiyada xarici açarlar, şirkətə uyğun filial əlaqələri və RLS siyasətləri yarat; klientin birbaşa audit və davamiyyət yazmasını qadağan et. İstifadəçi öz rolunu dəyişə bilməz.
- [ ] RLS testlərini ayrıca test bazasında icra et. Supabase bağlantısı yoxdursa testləri keçmiş sayma və yazı əməliyyatlarını bağlı saxla.

## Task 3: QR və məkanla serverdə davamiyyət

**Files:** `src/modules/attendance/domain/attendance.ts`, `src/modules/attendance/domain/location.ts`, `src/modules/attendance/server/commands.ts`, `src/app/api/attendance/route.ts`, `supabase/migrations/0002_attendance_commands.sql`, `tests/unit/attendance.test.ts`, `tests/integration/attendance.test.ts`.

**Interfaces:** `checkIn(input)` və `checkOut(input)` yalnız doğrulanmış sessiya ilə işləyir. Girişdə QR token, koordinatlar və dəqiqlik qəbul edilir; qeyd vaxtını server müəyyənləşdirir. Sabit xəta nəticəsi `{ error: { code, message } }` formasındadır.

- [ ] Təkrar giriş, girişsiz çıxış, gecə növbəsi, yanlış/vaxtı bitmiş QR, etibarsız koordinat və zəif məkan dəqiqliyi üçün testlər yaz və uğursuzluqlarını gör.
- [ ] Saf domen funksiyalarında məsafə, koordinat sərhədləri və gecə növbəsi qaydalarını qur. Filial radiusu konfiqurasiyadan gəlir; dəqiqlik həddi ilkin implementasiya qərarı kimi sənədləşdirilir.
- [ ] QR tokenini serverdə yarat və yoxla; tokenin filialını istifadəçinin təyinatı ilə müqayisə et. Filial radiusuna uyğun məkan tələb et.
- [ ] Tranzaksiya və unikal məhdudiyyətlə yalnız bir açıq qeyd saxla; paralel sorğuları və eyni çıxışın təkrarını idarə et. Origin/CSRF yoxlaması və davamlı rate limiting tətbiq et.
- [ ] Domen testləri və real PostgreSQL üzərində paralellik/tenant inteqrasiya testlərini işə sal.

## Task 4: Mobil işçi ekranı

**Files:** `src/app/isci/page.tsx`, `src/modules/attendance/ui/attendance-panel.tsx`, `src/modules/attendance/ui/qr-scanner.tsx`, `tests/e2e/employee-attendance.spec.ts`.

**Interfaces:** Bugünkü növbə, serverdəki cari qeyd vəziyyəti, QR oxutma, məkan sorğusu, giriş/çıxış və şəxsi tarixçə. Kamera üçün dəstəklənməyən brauzerdə təhlükəsiz QR keçidi alternativi.

- [ ] Telefonda giriş → QR → məkan → təsdiq → çıxış, məkan rəddi və şəbəkə xətası ssenarilərinin testlərini yaz; uğursuz nəticəni yoxla.
- [ ] Loqoya uyğun lacivərd/turkuaz palitra, böyük toxunma sahələri, aydın növbə kartı və əsas əməliyyat qur. Klient yalnız server təsdiqindən sonra uğur göstərir.
- [ ] Yüklənmə, boş tarixçə, sessiya bitməsi, kamera/məkan icazəsi və bağlantı problemlərini Azərbaycan dilində göstər. Düzəliş müraciətinə keçid ver.
- [ ] Mobil və desktop brauzerdə test et; konsol/şəbəkə xətalarını, fokus hərəkətini və üfüqi daşmanı yoxla.

## Task 5: Düzəliş və rəhbər qərarı

**Files:** `src/modules/attendance/server/corrections.ts`, `src/modules/attendance/ui/correction-form.tsx`, `src/app/rehber/davamiyyet/page.tsx`, `supabase/migrations/0003_attendance_corrections.sql`, `tests/integration/corrections.test.ts`, `tests/e2e/corrections.spec.ts`.

**Interfaces:** `requestCorrection(input)` işçinin öz qeydi üçün səbəbli müraciət yaradır. `decideCorrection(id, decision, reason)` yalnız səlahiyyətli rəhbər tərəfindən bir dəfə icra edilir; qeyd və audit eyni tranzaksiyada yazılır.

- [ ] Boş səbəb, özgə qeyd, icazəsiz rəhbər, ikinci qərar və auditin əvvəlki/yeni dəyərləri üçün testlər yaz; uğursuz nəticəni gör.
- [ ] İşçi müraciəti, filial üzrə rəhbər siyahısı, təsdiq/rədd və audit tranzaksiyasını qur. İlk mərhələdə rəhbər ekranı bugünkü qeydlər və gözləyən müraciətləri göstərir; davamiyyətsizliyi hesablamaq üçün növbə təyinatı olmayan işçi haqqında nəticə çıxarmır.
- [ ] Bütün unit, inteqrasiya və E2E testlərini, lint, tip yoxlaması və production build-i işə sal.
- [ ] README-də lokal işlətmə, Supabase konfiqurasiyası, test bazası, tətbiq olunmuş migrasiyalar və açıq məhdudiyyətləri qeyd et.

## Qəbul, geri dönüş və növbəti mərhələ

İlk davamiyyət mərhələsi yalnız real sessiya, RLS, QR/məkan, gecə növbəsi və düzəliş axını testlərlə sübut edildikdə hazır sayılır. Xarici xidmət açarları olmadıqda lokal interfeys göstərilə bilər, lakin demo məlumatı və yaddaşdakı əməliyyat real qeyd kimi təqdim edilmir. Məkan koordinatlarının uzunmüddətli saxlanması ilkin həllə daxil deyil; yoxlama nəticəsi və tələb olunan minimal audit saxlanılır, retention siyasəti canlı istifadədən əvvəl təsdiqlənir.

Mövcud tətbiq olmadığı üçün uyğunluq migrasiyası yoxdur. Verilənlər olan mühitdə əvvəl backup və test bazasında migrasiya yoxlaması tələb olunur; geri dönüşdə audit silinmir. Sonrakı mərhələ növbə idarəsi, icazə/məzuniyyət və Excel çıxarışıdır. Business satışına hazır olduğu iddia edilmir.
