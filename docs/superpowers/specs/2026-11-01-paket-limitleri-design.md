# Paket limitləri və Free keçidi

## Məqsəd və mövcud vəziyyət

İşçi/filial limitlərini əməliyyatlarda tətbiq etmək və sınaq bitdikdə Free paketində aktiv qalacaq heyət və filial seçimini tamamlamaq. Mövcud `get_subscription_status` limit aşımını hesablayır, lakin əməliyyatları məhdudlaşdırmır; vaxtı bitmiş sınağın abonəlik sətrini Free kimi yeniləmir. Rəhbər kabinetində abunə göstəriciləri nümunə məlumatlardır.

## Yanaşma

Tövsiyə: verilənlər bazasında tranzaksiyalı limit nəzarəti, serverdə səlahiyyət/giriş yoxlaması və real məlumatlarla işləyən abunə/seçim ekranı. Yalnız UI nəzarəti API vasitəsilə keçilə bilər; yalnız serverdə sayma isə paralel sorğularda limit aşımına yol aça bilər. Buna görə mövcud PostgreSQL RPC və migrasiya quruluşunu genişləndirmək məqsədəuyğundur. Yeni servis və paket tələb olunmur.

## Nəzərdə tutulan davranış

- Free 3/1, Start 10/1, Business 25/2, Growth 50/3 limitlərini bütün filialların ümumi aktiv heyətinə tətbiq etmək; alınmış əlavə filialları nəzərə almaq və ümumi filial sayını 3 ilə məhdudlaşdırmaq.
- Mövcud davranışı qorumaq üçün arxivləşdirilməmiş bütün üzvlükləri, sahib daxil olmaqla, aktiv heyət sayına daxil etmək. Sahibi seçimdən çıxarıb idarəetmə girişini itirmək mümkün olmayacaq. Bu sayma qərarı icraçı təklifidir.
- İşçi/filialın yaradılması və yenidən aktivləşdirilməsində şirkət üzrə tranzaksiyalı nəzarət tətbiq etmək. Arxivləşdirilmiş qeydlər limitə daxil deyil.
- Sınaq bitdikdən sonrakı ilk server yoxlamasında və hər yazma əməliyyatından əvvəl Free qaydalarını tətbiq etmək; abonəlik vəziyyətini və keçid auditini saxlamaq. Vaxtında keçid üçün əlavə cron infrastrukturu yaratmamaq.
- Free limitləri aşılırsa heç kimi avtomatik seçməmək. Sahib ən çox 3 aktiv üzvlük və 1 filial seçənədək yeni iş əməliyyatlarını məhdudlaşdırmaq. Oxuma, paket yüksəltmə və seçimi tamamlama açıq qalır.
- Sahibə real heyət və filial siyahısından seçim etdirmək. Yad şirkətin, arxivləşdirilmiş, təkrarlanan və limitdən artıq identifikatorlarını serverdə rədd etmək. Sahibin idarəetmə girişini qorumaq və seçilmiş heyətin saxlanılan filialda işləyə bilməsini təmin etmək.
- Seçilməyən heyət/filialı tarixçəsini silmədən paket səbəbilə deaktivləşdirmək; bu vəziyyəti işdən ayrılma arxivindən fərqləndirmək. Seçim, audit və məhdudiyyətin götürülməsi bir tranzaksiyada baş verir; təkrar sorğu təhlükəsizdir.
- Abunə ekranında cari paket, həqiqi istifadə/limitlər, keçid tələbi və nəticələri Azərbaycan dilində göstərmək. Paket kartında seçilən təklifi cari abonəlikdən ayrı saxlamaq.

## Əhatə və uyğunluq

Mövcud Next.js/Supabase steki saxlanılır. Tətbiq kodundan əvvəl lokal Next.js təlimatları oxunur. Mövcud ödəniş idempotentliyi və istifadəçinin hazırkı dəyişiklikləri qorunur. Canlı ödəniş, yeni tarif və başqa Business modullarının hazırlanması bu işə daxil deyil. Paketə görə deaktivləşməni əlavə sütunlarla daxil edən ayrıca migrasiya hazırlanır; tarixçə silinmir. Geri dönüş tətbiq dəyişikliklərini geri almaq və saxlanmış əvvəlki vəziyyət/audit əsasında deaktivləşmələri bərpa etməkdir.

## Yoxlama

PostgreSQL inteqrasiya testləri: hər tarifin sərhədi, əlavə filial, arxiv və yenidən aktivləşdirmə, sınağın dəqiq bitmə sərhədi, limit daxilində/aşımda Free keçidi, yalnız sahibin seçimi, şirkətlərarası təcrid, yanlış seçimdə tam geri qaytarma, audit və təkrar sorğu. Server testləri: giriş doğrulaması, səlahiyyət və xəta cavabları. Brauzer testi: real abunə məlumatları və seçim axını, konsol/şəbəkə xətaları. Sonda typecheck, lint və uyğun testlər icra olunur; icra edilməyən yoxlamalar ayrıca bildirilir.

## Status

Təklif — istifadəçi təsdiqi gözlənilir; tətbiq kodu dəyişdirilməyib.
