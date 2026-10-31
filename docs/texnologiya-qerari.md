# Texnologiya qərarı — təsdiqlənib

Tövsiyə: TypeScript ilə Next.js server-rendered veb tətbiqi və ayrıca domen modullarına bölünmüş vahid backend, PostgreSQL və sxem migrasiyaları. Mobil brauzer ilkin platformadır. Ödəniş adapteri əvvəl mock/sandbox işləyəcək.

Alternativ 1: Django və PostgreSQL — yetkin server və admin imkanları; Python bacarığı tələb edir, frontend ilə ayrıca dil istifadə olunur.
Alternativ 2: Laravel və PostgreSQL — geniş server ekosistemi; PHP bacarığı tələb edir. Hər iki alternativ komandanın təcrübəsi üstün olduqda daha məqsədəuyğun ola bilər.

Əməliyyat xərci: tətbiq hostinqi, PostgreSQL, ehtiyat nüsxələri, monitorinq, e-poçt və gateway komissiyaları ayrıca qiymətləndirilməlidir. Trafik, provayder və yerləşdirmə bilinmədiyindən rəqəm təsdiqlənməyib. İlkin mərhələdə ayrıca növbə, keş və mikroxidmət nəzərdə tutulmur.

Komandanın TypeScript, Python və PHP təcrübəsi məlum deyil; bu, qərarın əsas açıq riskidir. Bulud provayderi və konkret paket versiyaları hələ seçilməyib.


## Təsdiqlənmiş provayderlər
İstifadəçi Next.js, TypeScript, PostgreSQL, Supabase və Vercel seçimini təsdiqləyib. Next.js Vercel-də yerləşdiriləcək; PostgreSQL və Auth Supabase üzərindən təmin ediləcək. İlk prioritet işçinin davamiyyətidir. Şirkət və filial təcridi server yoxlamaları və RLS siyasətləri ilə qorunacaq. Server açarları klientə verilməyəcək. Sxem və siyasətlər versiyalı SQL migrasiyalarında saxlanılacaq. Lokal, test və production konfiqurasiyaları ayrılacaq. Region, xidmət planları, e-poçt və canlı gateway hələ müəyyənləşdirilməyib. Əvvəlki təkliflər qərarın konteksti kimi saxlanılır; provayderlərin seçilmədiyini bildirən əvvəlki qeyd bu qərarla əvəz olunur.
