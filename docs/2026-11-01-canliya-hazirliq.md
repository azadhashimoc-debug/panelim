# Canlıya hazırlıq yoxlaması — 1 noyabr 2026

**Status: qismən yoxlanılıb, istifadəyə buraxılış təsdiqlənməyib.** İstifadəçinin təyin etdiyi uzaq test layihəsi: `usvqbipnuimiiheazurc`. Production migrasiyası və deploy edilməyib.

| Yoxlama | Nəticə | Sübut və sərhəd |
|---|---|---|
| Supabase Auth və ilkin cədvəllərə bağlantı | Keçdi | Auth settings və ilkin cədvəllər HTTP 200; əlaqə yoxlaması məlumatları dəyişdirmədi. |
| Uzaq 0009 migrasiyası | Tamamlanmayıb | `free_subscription_commands` üçün `PGRST205`; `register_company` sınağı `PGRST202`. SQL bağlantısı təqdim edilməyib. |
| Uzaq migrasiya ön şərtləri | Uyğunsuzluq aşkarlandı | `employment_terms`, `leave_requests`, `salary_advances`, `payroll_periods`, `subscriptions`, `payment_transactions` Data API-də tapılmadı (`PGRST205`). Bu, PostgreSQL kataloqundan birbaşa təsdiq deyil; SQL ilə yoxlanmalıdır. |
| Yerli PostgreSQL 17.11-də 0001–0009 | Keçdi | Ayrı `readiness_source` bazasında tətbiq edildi; 0009-un commit-i, qeydiyyat səlahiyyətləri, köhnə/yeni ödəniş imzaları və Free cədvəlinin RLS-i yoxlanıldı. |
| Real Supabase sessiyası, HTTP localhost | Keçdi | Sintetik test hesabı ilə tətbiqdən həqiqi giriş, quruluma yönlənmə, yeniləmədən sonra HttpOnly sessiyanın qalması, çıxışdan sonra workspace üçün 401. API interception istifadə edilmədi. |
| Real Supabase sessiyası, HTTPS production build | Keçdi | Eyni axın ngrok HTTPS ünvanında keçdi; `Secure`, `HttpOnly`, `SameSite=Lax` cookie xüsusiyyətləri yoxlanıldı. Tokenlər və cookie dəyərləri sübuta yazılmadı. Bu, vaxtı bitmiş sessiyanın avtomatik refresh sınağı deyil. |
| Real şirkət qurulumu | Tamamlanmayıb | Yaradılmış test hesabı üçün `register_company` çağırışı `PGRST202` qaytardı; şirkət və filial yaradılmadı. |
| Fiziki telefon QR/GPS | Tamamlanmayıb | HTTPS hazırdır; filial qurulumu və fiziki cihazdan kamera/GPS nəticəsi çatışmır. Chrome emulyasiyası fiziki telefon sınağı sayılmır. |
| Eyni anda giriş | Keçdi, yerli PostgreSQL | İki ayrı TCP/psql sessiyası; birinci tranzaksiya kilidi saxlayarkən ikinci başladı. Bir giriş və bir audit yarandı; ikinci `ALREADY_CHECKED_IN` aldı. |
| Eyni anda düzəliş qərarı | Keçdi, yerli PostgreSQL | Bir təsdiq və onun davamiyyət/audit qeydi; ikinci qərar `ALREADY_DECIDED` ilə rədd edildi. |
| Eyni anda sandbox ödəniş təkrarı | Keçdi, yerli PostgreSQL | Eyni idempotency açarı ilə iki bağlantı: bir tranzaksiya, bir aktivləşmə auditi; təkrar nəticə idempotent oldu. Real gateway əməliyyatı edilmədi. |
| Yedəkdən ayrı bazaya bərpa | Keçdi, yerli PostgreSQL | `pg_dump -Fc` → yeni `readiness_restored` → `pg_restore --exit-on-error`. Bütün 17 public/auth cədvəlinin sətir xülasələri, sütun/default-lar, funksiya mətnləri və ACL-ləri, cədvəl ACL/RLS, siyasətlər, indekslər və trigger-lər müqayisə edildi. |
| Supabase bulud yedəyi/restore | Tamamlanmayıb | Yerli Auth stub-u Supabase-in idarə etdiyi Auth/Storage/konfiqurasiyanı əvəz etmir; ayrıca bulud restore hədəfi və SQL bağlantıları yoxdur. |
| Unit/API/PGlite dəsti | Keçdi | 88/88, exit 0; bu nəticə uzaq migrasiya və fiziki cihaz sübutu deyil. |
| Ayrı production build | Keçdi | `.runtime/next-readiness` build-i exit 0; müvəqqəti generated TypeScript yolları əsas konfiqurasiyadan geri çıxarıldı. |
| Yekun TypeScript, cari iş ağacı | Uğursuz | `src/modules/organization/ui/manager-hub.tsx:81` — TS2554: `api` 1–2 parametr qəbul edir, çağırış 3 parametr ötürür. Hazırlanmış HTTPS build bu yekun yoxlamadan əvvələ aiddir; cari iş ağacının build hazırlığı təsdiqlənmir. Bu əməliyyat yoxlamasında istifadəçinin həmin kod dəyişiklikləri redaktə edilmədi. |

## İşlək test mühiti və sübutlar

- Müvəqqəti HTTPS ünvanı: `https://earful-handshake-chug.ngrok-free.dev/giris`. Kompüter, 3003 test serveri və ngrok işlədiyi müddətdə açıqdır. Ngrok request introspection söndürülüb. Bu, daimi hosting deyil.
- Test hesabının giriş məlumatları `.env.test.local` daxilindədir; Git ignore ilə qorunur və hesabatda göstərilmir. Hesab e-poçt göndərilmədən admin API vasitəsilə təsdiqlənib. Şirkət qurulumu hazırda yoxdur.
- Məxfi məlumatları çap etməyən operativ skript və nəticələr `.runtime/readiness-*` daxilində saxlanılıb. PostgreSQL skripti təmiz, ayrıca test bazası üçün nəzərdə tutulub; mövcud bazaları silmir və təkrar icrada onları avtomatik sıfırlamır.
- Yerli PostgreSQL yalnız `127.0.0.1:55439` üzərində parolla işlədildi və yoxlamalardan sonra `pg_ctl -m fast -w stop` ilə dayandırıldı (exit 0). Bazalar və yedəklər saxlanılıb. Uzaq Supabase-dən məlumat köçürülmədi; bütün yerli qeydlər sintetikdir. Mənbə və bərpa bazası eyni test klasterindədir; klaster səviyyəli rol bərpası sınağı deyil.
- `.runtime/readiness-postgres-result.json`: migrasiya və paralel əməliyyat nəticələri.
- `.runtime/readiness-restore-full-result.json`: bütün 17 cədvəl və metadata müqayisəsi.
- `.runtime/readiness-session-result.json`, `.runtime/readiness-https-session-result.json`: həqiqi sessiya yoxlamaları.
- `.runtime/readiness-remote-setup-result.json`: uzaq qurulum xətasının kodu.
- `.runtime/readiness-before-0009.dump` və `.runtime/readiness-after-0009.dump`: sintetik yerli bazanın migrasiyadan əvvəl/sonra custom-format yedəkləri. SHA-256 xülasələri PostgreSQL nəticə faylındadır. Əvvəlki yedək ayrıca bərpa edilmədi; bərpa sınağında sonrakı yedək istifadə edildi.

İlk sessiya skriptində yanlış form etiketi timeout yaratdı; düzəldildikdən sonra tam axın yenidən keçdi. Geniş restore müqayisəsinin ilk icrası gözlənilən fərqli veritabanı adları (`table_catalog`, `udt_catalog`) səbəbilə uğursuz oldu; yalnız bu iki identifikasiya sahəsi müqayisədən çıxarılaraq bütün məzmun yenidən müqayisə edildi. Bu ilkin icralar uğurlu kimi sayılmır.

## Davam üçün lazım olan giriş və ardıcıllıq

1. Supabase test layihəsinin **Connect → Session pooler** bağlantısını `.env.test.local` daxilində `TEST_DATABASE_URL` kimi yerləşdirin. Parolu söhbətə yazmayın. Mövcud service-role API açarı SQL sessiyası yaratmaq və tam yedək almaq üçün yetərli deyil. Brauzer idarəetmə hostu bu yoxlamada əlçatan olmadı; Dashboard-dan avtomatik SQL icrası mümkün olmadı.
2. Birbaşa PostgreSQL kataloqu və migrasiya tarixçəsi ilə mövcud vəziyyəti yoxlayın. 0009 üçün lazım olan 0004–0008 obyektləri çatışmırsa, əvvəl yedək alaraq onları ardıcıllıqla tətbiq edin. 0009-da olmayan funksiyanı silən və yeni cədvəl yaradan əmrlər var; onu kor-koranə təkrar tətbiq etmək olmaz.
3. Bu tapşırıq 0009 ilə məhduddur. İş ağacındakı 0010 avtomatik tətbiq edilməyib; cari tətbiqin paket/idarəçi kodu 0010-dan da asılı ola bilər. 0009 yoxlamasının keçməsi həmin sonrakı modulların işləkliyini sübut etmir.
4. 0009 tətbiqindən əvvəl yedək alın; sonra qeydiyyat RPC-sinin yalnız service role-a açıq olduğunu, köhnə altı parametrli ödəniş funksiyasının olmadığını, yeni imzanı və Free cədvəlinin RLS/grant-larını yoxlayın. SQL migrasiya tarixçəsini faktiki tətbiqlə uyğun saxlayın.
5. Test hesabının şirkət/filial qurulumunu tamamlayın; filialın koordinatlarını fiziki sınağın ediləcəyi yerə uyğun təyin edin. Ayrı işçi hesabını həmin filiala bağlayın. Həqiqi QR-ni rəhbər hesabından yaradın.
6. Telefonda HTTPS açın: hesablı QR girişi/çıxışı, məkan icazəsinin rəddi, radiusdan kənar məkan, zəif dəqiqlik, vaxtı keçmiş QR və internet kəsilməsi yoxlanılsın. Hər uğurda bazada tək qeyd və audit, hər rədddə saxta uğur olmaması yoxlanılsın. Sırf test üçün Supabase Auth təhlükəsizliyi və QR/GPS qaydaları zəiflədilməsin.
7. Bulud yedəyini ayrıca boş restore hədəfinə bərpa edin; sətirlər, audit, RLS, grant-lar, funksiyalar və tətbiq sessiyasını yenidən yoxlayın. Mənbə test layihəsinin üzərinə restore etməyin. Müddət və bərpa nöqtəsi ölçüləri də qeydə alınsın.

Rəsmi əsaslar: [Supabase migrasiyalarının tətbiqi və tarixçəsi](https://supabase.com/docs/guides/deployment/database-migrations), [Supabase backup/restore proseduru və xidmət məhdudiyyətləri](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Bulud prosedurunu yerli SQL dump-ı ilə eyni əhatədə hesablamayın.
