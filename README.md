# panelim.az

Azərbaycan dilində, mobil-first davamiyyət tətbiqinin ilk mərhələsi. Next.js App Router, TypeScript, Supabase Auth və PostgreSQL istifadə olunur. Mövcud `panelim-kreativ/` təqdimat layihəsi ayrıca saxlanılır.

## Lokal işlətmə

Node.js 22.12+, 24.x və ya 26+ lazımdır; bu iş zamanı Node 24 ilə yoxlanılıb. Windows PowerShell-də skript siyasətini dəyişmədən `npm.cmd` istifadə edin.

```powershell
npm.cmd ci
npm.cmd run dev
```

Windows-da təkrarlanan development yenilənməsi səbəbilə `dev` əmri Webpack istifadə edir; production `build` əmri dəyişməyib. Adi E2E testləri canlı `.env.local`-dan ayrı, konfiqurasiyasız 3002 serverində; API fixture testləri 3001 serverində işləyir. 3000 portu canlı lokal tətbiq üçün saxlanılır. [Playwright MCP ilə canlı yoxlama hesabatı](docs/2026-11-01-playwright-mcp-yoxlama.md).

`http://127.0.0.1:3000` ünvanını açın. Konfiqurasiya olmadıqda ekranlar tanışlıq rejimində açılır; hesab girişi və real yazı əməliyyatları bağlıdır. Uydurma işçi və davamiyyət məlumatı göstərilmir.

Səhifələr:

- `/` — mobil tanıtım və qarşılama səhifəsi; demo və hesab girişi keçidləri.
- `/demo`, `/demo/tarixce`, `/demo/muracietler` — Supabase konfiqurasiyasından asılı olmayan tanışlıq ekranları. Şəxsi məlumat alınmır, real qeyd yaradılmır və demo naviqasiyası öz route-larında qalır.
- `/isci` — bugünkü növbə, QR giriş/çıxış və son qeydlər.
- `/isci/tarixce` — şəxsi davamiyyətin son 30 qeydi.
- `/isci/muracietler` — şəxsi düzəliş müraciətlərinin son 30 qeydi.
- `/giris` — e-poçt və şifrə ilə Supabase girişi.
- `/rehber/davamiyyet` — icazəli filial qeydləri, QR yaradılması və düzəliş qərarları.
- `/health` — tətbiqin proses yoxlaması; verilənlər bazasının hazırlıq yoxlaması deyil.

## Supabase bağlantısı

Lokal, test və production üçün ayrı layihə və açarlardan istifadə edin. Bu dəyişiklik heç bir bulud layihəsi yaratmır və migrasiyaları uzaq bazaya tətbiq etmir.

1. `.env.example` faylını `.env.local` kimi kopyalayın.
2. Supabase layihəsinin URL və **publishable** açarını uyğun `NEXT_PUBLIC_...` dəyişənlərinə yazın.
3. `SUPABASE_SERVICE_ROLE_KEY` yalnız serverdə saxlanılır. Heç vaxt `NEXT_PUBLIC_` prefiksi verməyin, klientə və ya söhbətə göndərməyin.
4. `QR_SIGNING_SECRET` üçün ən azı 32 simvoldan ibarət təsadüfi sirr yaradın. Məsələn, lokal terminalda `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` işlədib nəticəni yalnız lokal konfiqurasiyaya yazın.
5. `APP_URL` brauzerdə açılan tətbiqin dəqiq origin-i olmalıdır: lokalda `http://127.0.0.1:3000`, yayımlamada HTTPS ünvanı. Origin yoxlaması uyğunsuz ünvanlardan yazını rədd edir.
6. `supabase/migrations/` SQL fayllarını `0001`, `0002`, `0003` ardıcıllığı ilə ayrıca test layihəsində tətbiq edin. Supabase-də Data API üçün yalnız nəzərdə tutulmuş sxemlər açıq saxlanmalıdır.
7. Supabase Auth-da test istifadəçiləri yaradın. İlkin şirkəti, filialı, `memberships` və `branch_assignments` qeydlərini yalnız etibarlı administrator vasitəsilə yaradın. İşçi öz rolunu və filialını dəyişə bilmir. İlk mərhələdə onboarding və işçi dəvəti UI-si yoxdur.

Filial üçün koordinatlar və `20–500` metr radius tələb olunur. İşçinin Auth `user_id`-si ilə aktiv şirkət üzvlüyü və filial təyinatı olmalıdır. Sahib həmin şirkətin filiallarını idarə edə bilir; rəhbər yalnız təyin olunmuş filialı idarə edir. Mühasib roluna bu mərhələdə davamiyyət icazəsi verilmir. Bir istifadəçinin bir neçə şirkəti varsa UI ilk aktiv üzvlüyü seçir; şirkət dəyişdirmə interfeysi sonrakı mərhələdir.

Növbələr test administratoru tərəfindən `shifts` cədvəlinə təyin olunur. Növbə planlama UI-si növbəti mərhələyə aiddir. Şifrənin yaradılması və bərpası ilkin mərhələdə biznes sahibinin idarə etdiyi Supabase Auth prosesi vasitəsilə aparılır.

## Davamiyyət və təhlükəsizlik

- Rəhbər filial QR kodunu yaradır; kod HMAC ilə imzalanır və 120 saniyə etibarlıdır. Kamera dəstəyi/icazəsi olmadıqda QR keçidi əl ilə daxil edilə bilər.
- İşçi sessiyası serverdə `getUser()` ilə doğrulanır. Cookie yenilənməsi proxy-də `getClaims()` vasitəsilə edilir; şəxsi cavablar keşlənmir. Cookie-lər HttpOnly, SameSite=Lax və production-da Secure-dur.
- QR filialı, aktiv üzvlük, təyinat və məkan serverdə yoxlanılır. Məkan dəqiqliyi `min(100 metr, filial radiusu)` həddini keçməməli, məsafə + dəqiqlik radius daxilində olmalıdır. Bu konservativ ilkin qərardır; real obyektlərdə kalibrasiya tələb olunur.
- GPS brauzerin verdiyi məlumatdır; spoofing və zəif siqnal səbəbilə fiziki mövqeyə zəmanət vermir. İnternet və məkan problemlərində düzəliş müraciəti yolu açıqdır. Kamera və məkan mobil cihazlarda HTTPS tələb edir.
- Koordinatlar attendance cədvəlində saxlanılmır; yalnız məkanın yoxlanma nəticəsi saxlanılır. Auditdə vaxtlar, dəyişən şəxs və düzəliş səbəbi var.
- Bütün cədvəllər RLS ilə qorunur. Authenticated/anon rolunda attendance, correction və auditə birbaşa yazı qadağandır. Yazı RPC-ləri yalnız serverin service role-u üçündür; server istifadəçi kimliyini klientdən qəbul etmir.
- Membership sətrinin tranzaksiya kilidi və unikal açıq qeyd indeksi təkrar girişə qarşı işləyir. Gecə növbəsinin qeydi növbənin başladığı iş gününə bağlanır; bu qayda eksik girişin düzəlişinə də tətbiq olunur.
- Düzəliş qərarı, attendance dəyişikliyi və əvvəlki/yeni correction + attendance audit snapshot-ları eyni tranzaksiyadadır. Qərar yalnız bir dəfə verilir; üst-üstə düşən qeydlər rədd edilir.
- Eyni-origin JSON sorğusu, 8 KB giriş həddi, sxem doğrulaması və bazada davamlı rate limiting var. Giriş üzrə limit e-poçtla açarlanır; production öncəsi IP/qateway səviyyəsində sui-istifadə müdafiəsi və həssas rollara MFA ayrıca yoxlanmalıdır.

## Testlər

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --pool=threads
npm.cmd run test:e2e
npm.cmd run test:e2e -- --config=playwright.connected.config.ts
npm.cmd run build
npm.cmd audit --omit=dev
```

Brauzer testləri quraşdırılmış Google Chrome istifadə edir. Başqa mühitdə Playwright konfiqurasiyasındakı `channel` seçimini mövcud brauzerə uyğunlaşdırın.

Unit testlər məsafə, məkan dəqiqliyi, QR imzası/sürəsi, vaxt və səlahiyyət qaydalarını yoxlayır. İnteqrasiya testləri migrasiyaları **PGlite PostgreSQL motorunda** tətbiq edib RLS, service-only yazı qadağaları, gecə növbəsi və correction/audit tranzaksiyalarını işlədərək yoxlayır. Testdə Supabase `auth.uid()` minimal uyğun funksiyayla təmin edilir. Bu testlər canlı Supabase xidmətinin yoxlanılması deyil və ayrıca bağlantılarda real paralel kilid yarışını sübut etmir.

Adi E2E testlər konfiqurasiyasız ekranları, telefon/desktop naviqasiyasını, klaviatura fokusunu, konsol xətalarını və axe WCAG kontrast/semantika yoxlamalarını əhatə edir. `playwright.connected.config.ts` ayrıca port və build qovluğunda **sintetik konfiqurasiya və brauzer API fixture-ləri** ilə hesablı UI axınlarını sınayır. Production kodunda test girişi və ya auth bypass yoxdur. Bu testlər real Auth, QR kamera görüntüsü, telefon GPS-i və bulud bazasına yazını sübut etmir.

## Qalan qəbul yoxlamaları

- Ayrı Supabase test layihəsində migrasiyalar, login/logout, sessiya yenilənməsi və tenant sərhədləri.
- Ayrı real PostgreSQL bağlantılarından eyni anda giriş və düzəliş qərarı sorğuları.
- HTTPS üzərində real telefon kamerası, məkan dəqiqliyi, icazə rəddi, zəif internet və gecə növbəsinin tam axını.
- Məxfilik/retention siyasəti, backup/restore, production müşahidə və MFA qərarı.

Hazırkı siyahılar limitlidir: şəxsi tarixçə/müraciətlər 30, rəhbərin gözləyən müraciətləri 100, son 36 saatın davamiyyəti 100 qeyd. Səhifələmə ayrıca tamamlanmalıdır. 36 saatdan köhnə açıq qeydlər rəhbərin siyahısında görünməyə bilər. Hesaba daxil olmadan açılmış QR keçidi login zamanı saxlanılmır; girişdən sonra kod yenidən oxudulur.

Paket yoxlamasında production asılılıqları üçün məlum açıq tapılmayıb; lint alətlərinin `minimatch` zəncirində 16 orta səviyyəli advisory var. Avtomatik təklif olunan köhnə ESLint/Next versiyalarına geri dönüş tətbiq edilmir; uyğun upstream düzəlişi tələb olunur. Bu alətlər production klientinə daxil edilmir.

## Geri dönüş və əhatə

Mövcud tətbiq və verilənlər bazası olmadığı üçün ilkin migrasiyalar hazırlanıb. Verilənlər olan mühitdə tətbiqdən əvvəl ehtiyat nüsxəsi, test migrasiyası və backup-dan bərpa sınağı tələb olunur. Geri dönüşdə audit və attendance tarixçəsini silən SQL işlətməyin; tətbiq versiyasını geri qaytarın və lazım gəlsə ayrıca irəli yönlü düzəliş migrasiyası hazırlayın.

Bu qovluqda Git repozitoriyası yoxdur; commit/worktree/remote yaradılmayıb. İlk real istifadədən əvvəl source control və CI qurulmalıdır. Build, test və sirr faylları `.gitignore`-dadır.

Bu mərhələ əməkhaqqı, abunə/ödəniş, işçi onboarding-i, növbə planlaması, məzuniyyət və Excel çıxarışını əhatə etmir. **Business paketi satışa və tətbiq production-a hazır kimi təqdim edilmir.**

Rəsmi texniki mənbələr: [Next.js quraşdırılması](https://nextjs.org/docs/app/getting-started/installation), [Supabase server sessiyaları](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
