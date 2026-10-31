# panelim.az — məhsul və sayt dizaynı

Tarix: 2026-10-31. Texnologiya istifadəçi tərəfindən təsdiqlənib: Next.js, TypeScript, PostgreSQL.

## Məqsəd
Azərbaycanın 5–50 işçisi və 1–3 filialı olan kafe, restoran və mağazaları üçün mobil-first davamiyyət və daxili maaş uçotu. Əsas dil Azərbaycan dili, valyuta AZN, saat qurşağı Asia/Baku.

## Əsas prioritet — işçinin davamiyyəti
İstifadəçinin son göstərişinə əsasən ilk hazırlanacaq və yoxlanılacaq məhsul axını işçinin davamiyyətidir. İşçinin mobil ana ekranında bugünkü növbə, cari giriş/çıxış vəziyyəti və əsas qeydiyyat düyməsi ön plandadır. Filial QR kodu və məkan yoxlaması ilə giriş/çıxış edilir; işçi öz qeydini və tarixçəsini görür. Məkan, internet və unudulmuş qeyd problemləri üçün səbəbli düzəliş müraciəti əlçatandır. İnternet olmadan qeyd təsdiqlənmiş kimi göstərilmir.
Rəhbər həmin gün filial üzrə gələnləri, gecikənləri, gəlməyənləri və çıxış etməyənləri görür; düzəlişi səbəblə təsdiqləyir və ya rədd edir. Qərar və əvvəlki/yeni dəyərlər auditdə saxlanılır. Gecəni keçən növbənin qeydləri başladığı növbəyə bağlanır. Gecikmə avtomatik maaş cəriməsi yaratmır.
İlk mərhələnin qəbulu: icazəsiz şirkət/filial girişinin rəddi, təkrar girişin qarşısının alınması, girişsiz çıxışın idarəsi, QR və məkan xətaları, gecə növbəsi, düzəliş təsdiqi və telefon ekranında tam axının yoxlanılması. Maaş və digər Business modulları bu axından sonra hazırlanır. Tanıtım saytının əsas mesajı və məhsul önizləməsi də davamiyyətə yönəlir.

## Yanaşma
Tövsiyə: tanıtım saytı və tətbiq eyni Next.js layihəsində, biznes sahələri üzrə ayrılmış vahid backend və PostgreSQL. Ayrı frontend/backend yerləşdirməsi ilkin əməliyyat yükünü artırır; Django/Laravel isə təsdiqlənmiş TypeScript seçimindən fərqli dil tələb edir.

## İstinad və vizual istiqamət
İstinad: https://www.clockster.com/ — 2026-10-31 tarixində açıq ana səhifənin mətni, keçidləri və branding məlumatları alınıb. Faktiki screenshot hələ yoxlanılmayıb; mobil davranış barədə nəticə çıxarılmayıb.
Clockster məzmununda məhsul təqdimatı, funksiya bölmələri, interfeys nümunələri, rəylər və demo çağırışı var. Bizim səhifələr üçün təklif: aydın başlıq, işlək məhsul önizləməsi, funksiyalar, istifadə sahələri, paketlər, FAQ və sınaq çağırışı. Mətnlər özgün olacaq; başqa şirkətin rəyləri və statistikasından istifadə edilməyəcək.
Mövcud logo: panelim-kreativ/cikti/logo.png. Təklif olunan palitra: loqoya uyğun tünd lacivərd, turkuaz, ağ və açıq neytral fon. Rənglər loqodan vizual təxmindir. Geniş boşluqlar, iri başlıqlar, yumşaq kartlar, oxunaqlı cədvəllər. Marketinq fotoları imagegen ilə yaradılacaq; işlək UI HTML/CSS ilə qurulacaq.

## Tanıtım səhifələri
- Ana səhifə: məhsul vədi, davamiyyət/növbə/maaş önizləmələri, sektorlar, paketlər, FAQ.
- Funksiyalar: QR və məkan, növbələr, müraciətlər, hesablaşma və tapşırıqlar.
- Qiymətlər: Free 0/3 işçi/1 filial; Start 15/10/1; Business 29/25/2; Growth 49/50/3. Əlavə filial 5 AZN, ümumi maksimum 3. ƏDV statusu satışdan əvvəl müəyyənləşdirilməlidir.
- Giriş, qeydiyyat, parol bərpası; məxfilik və istifadə şərtləri üçün açıq şəkildə layihə mətnləri.

## Tətbiq axını və səhifələri
Qeydiyyat → şirkət və filial → sahib profili → işçi dəvəti → 14 günlük Business sınağı → idarə paneli.
Sahib/rəhbər: icmal, işçilər və profil, filiallar, davamiyyət, düzəlişlər, növbə təqvimi, müraciətlər, tapşırıqlar, hesablaşma, avans, əlavə saat təsdiqi, hesabatlar, abunə, səlahiyyətlər, audit və parametrlər.
İşçi: bugünkü növbə, QR giriş/çıxış, öz davamiyyəti, öz müraciətləri, öz tapşırıqları və hesablaşması.
Mühasib yalnız verilmiş hesablaşma və çıxarış icazələri ilə işləyir. Bütün server əməliyyatlarında şirkət, filial və rol sərhədi yoxlanılır.

## Davranış və məlumat bütövlüyü
Məkan problemi düzəliş müraciəti ilə həll edilir. Düzəlişlər və növbə dəyişməsi rəhbər təsdiqi və audit tələb edir. Gecə növbəsi başladığı növbəyə bağlanır. Maaş qəpiklə hesablanır, əlavə saat təsdiq tələb edir, gecikmə avtomatik cərimə yaratmır. Bağlı ayın yenidən açılması ayrıca icazə tələb edir. Arxiv işçi aktiv limitə daxil edilmir.
Sınaq bitdikdə Free limitləri tətbiq olunur; artıq məlumat silinmir və sahib aktiv heyəti/filialı seçənədək əməliyyatlar məhdudlaşdırılır. Ödəniş yalnız mock/sandbox; webhook imzası, idempotentlik və audit təmin edilir.

## Mobil və əlçatanlıq
Telefonlarda yığılan naviqasiya, əsas işçi əməliyyatlarına sürətli keçid, geniş toxunma sahələri, cədvəllərin kart və ya nəzarətli üfüqi görünüşü. Semantik HTML, klaviatura/fokus, etiketli formalar, xəta və boş vəziyyətlər, yüklənmə və təsdiq bildirişləri.

## İcra və qəbul
1. Dizayn sistemi, özgün təsvirlər, tanıtım səhifələri və mobil naviqasiya.
2. Sessiya, şirkət/filial/işçi və icazələr, PostgreSQL migrasiyaları.
3. QR davamiyyət, düzəlişlər, növbələr, müraciətlər və Excel çıxarışı.
4. Maaş, avans, əlavə saat, tapşırıqlar və hesabatlar.
5. Paket/sınaq və sandbox ödəniş; təhlükəsizlik və brauzer yoxlaması.
Hər mərhələ üçün uyğun unit/inteqrasiya testləri, kritik axınlara real brauzerdə mobil və desktop yoxlamaları. Tenant təcridi, icazələr, gecə növbəsi, hesablaşma, limitlər və webhook təkrarları ayrıca yoxlanılır. Geri dönüş: versiyalı migrasiyalar, verilənlər bazasının backup/restore proseduru; geri dönüşdə maliyyə tarixçəsi silinmir.

## Açıq qərarlar
Hostinq, e-poçt və canlı gateway sonradan seçilir. ƏDV, məkan saxlama müddəti və hüquqi mətnlər canlı satışdan əvvəl təsdiqlənir. Business axınları yoxlanılmadan satışa hazır olduğu iddia edilməyəcək.


## Təsdiqlənmiş provayderlər
İstifadəçi Next.js, TypeScript, PostgreSQL, Supabase və Vercel seçimini təsdiqləyib. Next.js Vercel-də yerləşdiriləcək; PostgreSQL və Auth Supabase üzərindən təmin ediləcək. İlk prioritet işçinin davamiyyətidir. Şirkət və filial təcridi server yoxlamaları və RLS siyasətləri ilə qorunacaq. Server açarları klientə verilməyəcək. Sxem və siyasətlər versiyalı SQL migrasiyalarında saxlanılacaq. Lokal, test və production konfiqurasiyaları ayrılacaq. Region, xidmət planları, e-poçt və canlı gateway hələ müəyyənləşdirilməyib. Əvvəlki təkliflər qərarın konteksti kimi saxlanılır; provayderlərin seçilmədiyini bildirən əvvəlki qeyd bu qərarla əvəz olunur.
