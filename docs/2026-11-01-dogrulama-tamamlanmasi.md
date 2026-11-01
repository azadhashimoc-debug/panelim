# Desktop demo və test proseslərinin yoxlanması

Əhatə: iş siyahısının birinci maddəsi. Qeydiyyatın bərpası, paketlər, maaş və canlı mühit bu yoxlamaya daxil deyil.

## Prosesin bağlanmamasının səbəbi

Məhdud Windows mühitində desktop demo testi uğurlu nəticə göstərdi, lakin runner bağlanmadı və 3002 portundakı test serveri işləməyə davam etdi. Proses ağacı oxunarkən `Get-CimInstance` də `Access denied` qaytardı.

Quraşdırılmış Playwright kodunda Windows webServer bağlanması `taskkill /pid <pid> /T /F` ilə edilir; bundan sonra prosesin `close` hadisəsi gözlənilir. Məhdud mühitdə proses ağacının sonlandırılması baş tutmadıqda bu gözləmə bitmir. Ssenarilərin yanında uğur işarəsi görünməsi bütün komandanın uğurla bitməsi demək deyil.

Bu yoxlamanın yaratdığı test serverinin konkret proses ağacı icazəli mühitdə dayandırıldı. Eyni desktop testi icazəli mühitdə beş dəfə təkrarlandı: **5/5, exit 0**. Testin özünə məcburi `process.exit` və ya uğursuzluğu gizlədən retry əlavə edilmədi.

Windows-da bu komandaları proses ağacını sonlandırmağa icazəsi olan terminalda işlədin. Agentin məhdud mühitində uyğun icazəli icra tələb olunur:

```powershell
npm.cmd run test:e2e
npm.cmd run test:e2e -- --config=playwright.connected.config.ts
```

Hər komandanın yekun nəticəsini və `exit 0` cavabını gözləyin. Preview və connected serverlərini ardıcıl başladın. 3001/3002 portunun tutulması halında mövcud serveri təkrar istifadə etməyin; yalnız həmin testə aid proses ağacını müəyyənləşdirib dayandırın. Canlı 3000 serverini və əlaqəsiz Node proseslərini bağlamayın.

## Desktop naviqasiyası

Əvvəlki uğursuzluq `/demo/tarixce` URL-ni gözləyərkən 15 saniyəlik timeout idi. Cari mənbə ilə ayrıca ilkin işə salınmada və sonrakı beş təkrarda ana səhifə → demo → tarixçə → müraciətlər keçidləri uğurlu oldu.

İlk tam preview dəsti **25 keçdi / 1 uğursuz, exit 1** ilə bitdi. Bu dəfə desktop `/isci/tarixce` keçidində başlıq üçün standart 5 saniyəlik gözləmə doldu. Trace göstərir ki, klik RSC sorğusunu göndərib, Next.js `[Fast Refresh] rebuilding` qeydini yazıb, test dayandırılan anda sorğu hələ cavab almayıb. Klient JavaScript xətası qeydə alınmadı. Mobil ekvivalent keçdi. Düzəlişdən əvvəlki sübutlar `.runtime/navigation-cold-compile-before.zip` və `.runtime/navigation-cold-compile-before.md` fayllarında saxlanıldı.

`navigation.spec.ts` tarixçə başlığını yoxlamazdan əvvəl hədəf URL-ni gözləyir. Həm işçi, həm demo tarixçə/müraciət keçidlərində development derləməsi üçün URL gözləmə həddi 30 saniyədir. Demo testi URL-dən əlavə tarixçə və müraciətlər başlıqlarını da yoxlayır. Sabit sleep, avtomatik təkrar və tətbiq naviqasiyasını dəyişən workaround yoxdur. Əvvəlki demo timeout-unun eyni səbəbdən yarandığı ayrıca sübut edilməyib; təsdiqlənən xəta testin soyuq derləmə ilə sinxronlaşmamasıdır.

## Nəticələr

- Unit/API/PGlite SQL: **61/61, exit 0**.
- Desktop demo təkrarı: **5/5, exit 0**.
- Düzəlişdən sonra tam preview (desktop + mobil): **26/26, exit 0**, 2,6 dəqiqə. Əvvəl uğursuz desktop tarixçə testi 20,2 saniyədə tamamlandı.
- Connected fixture brauzer dəsti: **8/8, exit 0**, 1,1 dəqiqə. Runner bu dəfə kəsilmədən bağlandı.
- Hər iki dəst bitdikdən sonra TCP yoxlaması: **3001 və 3002 portları bağlıdır**, exit 0.
- ESLint: **exit 0**.
- Brauzer serverləri dayandıqdan sonra TypeScript: **exit 0**.
- Production build: **exit 0**.
- `git diff --check`: **exit 0**; yalnız Git-in LF/CRLF bildirişləri var.

İlk tam dəstin 25/26 nəticəsi yuxarıda saxlanılır; keçmiş kimi təqdim edilmir. İlkin məhdud-mühit çalıştırması ssenari uğurundan sonra bağlanmadığı üçün uğurlu dəst sayılmır. Playwright-ın `NO_COLOR`/`FORCE_COLOR` bildirişləri qaldı, test xətası deyil.

Connected nəticələri brauzer fixture-lərinə aiddir; real sessiya, telefon GPS/kamera, uzaq migrasiya, paralel tranzaksiya və backup/restore yoxlamalarını sübut etmir. Uzaq migrasiya, deploy və commit edilmədi. Əvvəlki demo timeout-u ayrıca təkrarlanmadığı üçün onun kök səbəbinin tam aradan qalxdığı iddia edilmir; cari demo axını həm təkrarlı, həm tam desktop/mobil dəstdə uğurludur.
