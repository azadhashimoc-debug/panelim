# Davamiyyət və maaş uçotu platforması — iş qaydaları

## 1. Məqsəd və əhatə dairəsi

Azərbaycan bazarında 5–50 işçisi, 1–3 filialı olan bizneslər üçün davamiyyət, növbə və daxili maaş uçotu platforması hazırlanır. İlk auditoriya kafe, restoran, minimarket və kiçik mağaza şəbəkələridir. Azərbaycan dili və mobil-first istifadə əsasdır.

İlk satış buraxılışı Business paketinin vəd etdiyi əsas axınları əhatə etməlidir. Vergi bəyannaməsi, bankdan maaş köçürülməsi, rəsmi mühasibat inteqrasiyası və sahəvi komissiya hesablamaları ayrıca mərhələlərdir. İstifadəçi təsdiqi olmadan əhatə genişləndirilmir.

## 2. Texnologiya və arxitektura

Tətbiq kodu və təsdiqlənmiş stek hələ yoxdur. `docs/texnologiya-qerari.md` təklifdir; texnologiya seçimini istifadəçi təsdiqləməlidir. Alternativlər, komanda bacarığı və əməliyyat xərcləri qiymətləndirilir. Hostinq və xidmət provayderləri tələblər müəyyənləşdikdən sonra seçilir.

- Modullar biznes sahələrinə görə ayrılır: identity, şirkət və filiallar, işçilər və səlahiyyətlər, davamiyyət, növbələr, müraciətlər, tapşırıqlar, hesablaşma, abunə və ödənişlər, hesabatlar və audit.
- UI, tətbiq, domen və infrastruktur qatları arasında istiqamətli asılılıq saxlanılır. Domen qaydaları framework və provayder SDK-larından asılı olmur.
- API girişləri doğrulanır, sabit xəta sxemi və uyğun səhifələmə istifadə edilir. Sxem dəyişiklikləri migrasiya ilə aparılır.
- Lokal, test və production mühitləri ayrı konfiqurasiya və açarlardan istifadə edir; nümunə konfiqurasiya sirr saxlamır. Ehtiyac sübut olunmadan əlavə servis və infrastruktur yaradılmır.

## 3. Rollar və məlumatların ayrılması

- Biznes sahibi şirkəti, filialları, işçiləri, paketləri və səlahiyyətləri idarə edir.
- Filial rəhbəri yalnız təyin olunmuş filialın və ona verilmiş əməliyyatların məlumatına çıxır. Mühasib yalnız icazə verilən hesablaşma və çıxarışları görür. İşçi öz məlumatlarını görür və öz müraciətlərini göndərir.
- Şirkət və filial sərhədləri, rol və ayrıca verilən icazələr hər server əməliyyatında yoxlanılır. Müştəri interfeysində gizlətmə səlahiyyət yoxlamasını əvəz etmir.
- İşdən ayrılan işçi arxivləşdirilir; tarixçə saxlanılır və aktiv işçi limitinə daxil edilmir.

## 4. Davamiyyət və iş axını

- Giriş və çıxış işçi hesabı, filial QR kodu və məkan yoxlaması ilə aparılır. Məkan və internet problemlərində düzəliş müraciəti yolu açıq qalır; məkan yoxlamasının məhdudiyyətləri istifadəçiyə aydın göstərilir.
- Düzəliş səlahiyyətli rəhbərin təsdiqini və səbəbini tələb edir. Köhnə və yeni dəyərlər, dəyişən şəxs və vaxt audit tarixçəsində saxlanılır.
- Gecəni keçən növbə başladığı növbəyə bağlanır. Növbə dəyişməsi yalnız rəhbər təsdiqindən sonra qüvvəyə minir.
- Məzuniyyət, icazə və növbə dəyişiklikləri üzrə müraciət və qərar tarixçəsi saxlanılır. Tapşırıqların vəziyyəti və nəticələri izlənir.

## 5. Maaş və maliyyə bütövlüyü

- İlk versiyada aylıq və saatlıq əməkhaqqı dəstəklənir. Hesablaşma təsdiqlənmiş əsas məbləğ, əlavə saat ödənişi və əlavələrdən avans və təsdiqlənmiş düzəlişlər çıxılaraq hazırlanır.
- Əlavə saat yalnız rəhbər təsdiqindən sonra hesablanır. Gecikmə avtomatik pul cəriməsinə çevrilmir. Avansın məbləği, tarixi və qeyd edən şəxs saxlanılır.
- Bağlanmış aya dəyişiklik ayrıca icazə və tarixçə tələb edir; işçi yalnız öz hesablaşmasını görə bilər. Hesablaşma rəsmi vergi və ya bank köçürməsi kimi təqdim edilmir.
- Pul hesablamaları AZN-in ən kiçik vahidi və ya dəqiq decimal ilə aparılır; binary floating point istifadə edilmir. Maliyyə qeydləri audit edilə bilən və dəyişiklikləri izlənə bilən olmalıdır.

## 6. Paketlər və abunə

| Paket | Aylıq qiymət | Aktiv işçi | Filial |
|---|---:|---:|---:|
| Free | 0 AZN | 3 | 1 |
| Start | 15 AZN | 10 | 1 |
| Business | 29 AZN | 25 | 2 |
| Growth | 49 AZN | 50 | 3 |

- Limit bütün filialların ümumi aktiv heyətinə aiddir. Əlavə filial 5 AZN/aydır, ümumilikdə ən çox 3 filial mümkündür və işçi limitini dəyişmir. Limit aşımında avtomatik əlavə ödəniş tutulmur.
- Qeydiyyatda Business funksiyaları ilə 14 günlük sınaq başlayır. Sınaq ödənişsiz bitdikdə Free paketinə keçilir; limit aşılırsa məlumatlar saxlanılır və sahib aktiv qalacaq üç işçini və bir filialı seçənədək yeni əməliyyatlar məhdudlaşdırılır.
- Free sadə sabit qrafik və davamiyyəti; Start növbə, icazə, məzuniyyət və Excel çıxarışını; Business maaş, avans, əlavə saat, tapşırıqlar və filial səlahiyyətlərini; Growth müqayisəli filial hesabatlarını əhatə edir.
- Qiymətlərin ƏDV daxil və ya xaric olması satışdan əvvəl dəqiqləşdirilir. Limitsiz SMS və WhatsApp daxil deyil; fərdi köçürmə və təlim ayrıca təklif olunur. İlkin mərhələdə illik abunə yoxdur.
- Abunə ödənişi yalnız gateway tərəfindən doğrulanmış nəticə ilə təsdiqlənir; brauzer yönləndirməsi kifayət deyil. Webhook doğrulaması, idempotentlik, uzlaşdırma və audit təmin edilir. Canlı gateway seçilənədək mock/sandbox istifadə olunur; icazəsiz real ödəniş və refund aparılmır.

## 7. Təhlükəsizlik və məxfilik

- Sirrlər, parollar, tokenlər, kart və şəxsi məlumatlar repozitoriyaya, klient paketinə və jurnallara yazılmır. Kart məlumatı saxlanılmır.
- Təhlükəsiz sessiya, parol hash-lənməsi, uyğun doğrulama və riskə uyğun MFA tətbiq edilir. Rate limiting, giriş doğrulaması, təhlükəsizlik başlıqları və cookie sessiyalarında CSRF qoruması təmin edilir.
- Şəxsi, məkan və maaş məlumatları minimum saxlanılır, tranzitdə TLS və saxlanmada uyğun şifrələmə tətbiq edilir. Məkan məlumatının saxlanma müddəti və məxfilik siyasəti istifadəyə verilməzdən əvvəl müəyyənləşdirilir.
- Davamiyyət düzəlişləri, maaş və abunə dəyişiklikləri, səlahiyyət qərarları üçün kim, nə vaxt, nəyi və hansı səbəblə dəyişdirdi qeydə alınır. Asılılıq və sirr skanları, minimal səlahiyyət və ayrı xidmət hesabları tətbiq edilir.

## 8. İstifadəçi təcrübəsi və keyfiyyət

- Azərbaycan dili, AZN, tarix və saat formatları ardıcıldır; mətnlər sonrakı tərcümə üçün mərkəzləşdirilir. Mobil-first interfeys sadə və əlçatan olmalıdır: semantik HTML, klaviatura, kontrast, fokus və ekran oxuyucusu dəstəyi qəbul meyarıdır.
- Kod oxunaqlı, tip təhlükəsiz və test edilə bilən olmalıdır. Sərhədlərdə giriş doğrulanır; lazımsız abstraksiya və susdurulmuş lint qaydalarından qaçılır. Jurnallar strukturlaşdırılmış və sirrsizdir.
- Hər əhəmiyyətli dəyişiklik uyğun unit, inteqrasiya və ya E2E testlə yoxlanılır. İcra edilməyən test keçmiş kimi təqdim edilmir.
- Şirkətlərarası təcrid, rollar, məkan və QR, gecə növbələri, düzəlişlər, hesablaşma, paket limitləri, sınaq müddəti, ödəniş idempotentliyi və webhook yoxlamaları qorunur. Kritik axınlar real brauzerdə, konsol və şəbəkə xətaları izlənərək sınanır.
- Health check, strukturlaşdırılmış log, metrik və xəbərdarlıqlar şəxsi məlumatları açıqlamadan hazırlanır.

## 9. Hazırlanma mərhələləri

1. Texnologiya qərarı və layihənin təməli.
2. Şirkət, filial, işçi, rol, QR davamiyyət və düzəliş tarixçəsi.
3. Növbələr, icazə, məzuniyyət və Excel çıxarışı.
4. Maaş, avans, əlavə saat, tapşırıqlar və çoxfiliallı idarəetmə.
5. Sınaq, paket limitləri, sandbox ödəniş, abunə və satışa hazırlıq.

Business paketinin vəd etdiyi əsas axınlar hazır və yoxlanılmış olmadan tam paket satışa çıxarılmır. Hər mərhələ üçün qəbul meyarları, təhlükəsizlik yoxlaması, test planı və geri dönüş yolu müəyyənləşdirilir.

## 10. Agentin iş qaydaları

1. Kod yazmazdan əvvəl strukturu, konvensiyaları və əlaqəli testləri analiz et.
2. Böyük dəyişiklikdən əvvəl qısa planı, təsir sahəsini və yoxlama üsulunu bildir.
3. Mövcud funksiyanı qoru; uyğunluq riskini və təhlükəsiz miqrasiya yolunu açıq bildir.
4. Lazımsız paket və infrastruktur əlavə etmə; xarici qiymət, API və statusları yoxlamadan fakt kimi təqdim etmə.
5. Hər tapşırığın sonunda dəyişiklikləri, test nəticələrini və qalan riskləri qısa bildir.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
