# Qarşılama səhifəsi — məhdud dəyişiklik

İstifadəçi mobil Factorial ekranını vizual istinad kimi verib və ana səhifədə demo və giriş keçidi istəyib. Mövcud layihə yerli Next.js/Vercel layihəsidir; ayrıca sayt/hostinq yaradılmır.

Yanaşma: `/` məhsul təqdimatına çevrilir, işləyən `/isci` və `/giris` saxlanılır. Ayrı `/demo` və onun tarixçə/müraciət alt səhifələri mövcud kabineti həmişə tanışlıq rejimində göstərir. Supabase qurulsa belə demo şəxsi məlumat almır və real qeyd yaratmır. Demo naviqasiyası demo daxilində qalır.

Vizual: verilmiş ekranın iri başlıqları, aydın CTA-ları, yumşaq fonları və açılan funksiya bölmələri; özgün Panelim mətnləri və mövcud logo. Lacivərd/turkuaz, mobil naviqasiya, başlıq + məhsul önizləməsi, auditoriya, hazır funksiyalar, üç addım, FAQ və son demo çağırışı. Başqasının müştəri loqoları, rəyləri, sübut olunmamış statistika və satışa hazır olmayan funksiyalar istifadə edilmir.

İcra:
1. Ana səhifə → demo/giriş, mobil menyu və demo daxilində naviqasiya üçün uğursuz brauzer testləri.
2. Mərkəzləşdirilmiş marketinq mətnləri, landing komponenti və səhifəyə məxsus CSS; actual logo faylı.
3. Ayrı demo route-ları və mövcud kabinetdə minimal `basePath` parametri.
4. Mobil/desktop E2E, axe, konsol/şəbəkə, tip, lint və build yoxlaması; screenshot-a baxış.

Məlumat bazası, real istifadəçi və auth qaydaları dəyişmir. Geri dönüş: ana səhifənin əvvəlki EmployeePage komponentini bərpa etmək və yeni landing/demo route-larını çıxarmaq.

## Yoxlama nəticələri

- Qarşılama, demo, mövcud kabinet, mobil menyu, klaviatura və axe WCAG yoxlamaları: 26/26 brauzer testi keçdi.
- Supabase sintetik konfiqurasiyası ilə demo ayrımı və mövcud hesablı UI axınları: 6/6 test keçdi. Demo testi workspace API-yə heç bir sorğu göndərilmədiyini yoxlayır; real bulud bağlantısı kimi təqdim edilmir.
- Mövcud domen/PostgreSQL testləri: 38/38 keçdi.
- Mobil və desktop tam səhifə screenshot-ları vizual yoxlanıldı. Windows-da baxılan screenshot faylının müvəqqəti kilidlənməməsi üçün test artefaktları unikal adlarla saxlanılır.
- Müstəqil read-only baxışda Important/Critical problem tapılmadı. Kiçik tövsiyələr — footer naviqasiyasına ayrıca əlçatan ad və Escape/fokus qaytarılması üçün ayrıca test — sonraya saxlanıldı; mövcud Escape davranışı və fokus qaytarılması kodda var.

Satış, canlı deploy və yeni provayder yaradılmayıb. Supabase tələb edən real login və qeydiyyatın əvvəlki konfiqurasiya məhdudiyyətləri qüvvədədir.
