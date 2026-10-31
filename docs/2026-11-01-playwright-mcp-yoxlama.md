# Playwright MCP ilə canlı brauzer yoxlaması

Tarix: 1 noyabr 2026, Bakı vaxtı. Tətbiq: `http://127.0.0.1:3000`.

Microsoft-un rəsmi `@playwright/mcp` serveri lokal loopback ünvanında başladıldı. MCP-nin `browser_navigate`, `browser_click`, `browser_fill_form`, `browser_resize`, `browser_snapshot`, `browser_console_messages`, `browser_network_requests` və `browser_take_screenshot` əməliyyatları istifadə edildi. Chrome görünən rejimdə açıldı. Bu yoxlamada API interception, saxta workspace, dəyişdirilmiş cavab və ya süni uğurlu sessiya istifadə olunmadı.

| Ssenari | Müşahidə |
|---|---|
| Ana səhifədən “Demoya bax” keçidi | Klik `/demo` səhifəsini açdı. |
| Demoda QR əməliyyatı | Hesaba giriş tələb edən pəncərə açıldı; davamiyyət uğuru göstərilmədi. Bağlama düyməsi işlədi. |
| Tarixçə və müraciətlər | Naviqasiya klikləri uyğun `/demo/tarixce` və `/demo/muracietler` səhifələrini açdı; demo sərhədindən çıxmadı. |
| 390 × 844 mobil viewport | Müraciətlər ekranı vizual yoxlandı; aşağı naviqasiya və giriş keçidi görünürdü. Bu, fiziki telefon sınağı deyil. |
| Boş giriş forması | Brauzer tələb olunan e-poçt sahəsinə fokus verdi, giriş tamamlanmadı. |
| Mövcud olmayan hesabla giriş | Canlı server və Supabase üzərindən `/api/auth` 401 qaytardı, “E-poçt və ya şifrə düzgün deyil.” göstərildi. Yalnız bu mənfi ssenari üçün uydurma `example.com` ünvanı istifadə edildi; hesab yaradılmadı. |
| Sessiyasız işçi kabineti | `/api/workspace` 401 qaytardı; şəxsi məlumat açılmadı. QR əməliyyatı hesab tələb etdi. |
| Sessiyasız rəhbər kabineti | Şəxsi qeydlər göstərilmədi, “Filial QR kodu” düyməsi bağlı qaldı. |
| Mobil menyu və suallar | Menyu açıldı; “Suallar” klikindən sonra menyu bağlandı və `#suallar` bölməsinə keçildi. FAQ kliklə açıldı. |

## Tapılan mühit problemləri

İlk giriş sorğusu 500 qaytardı. Lokal Next.js serveri məhdud şəbəkə icazəsi ilə işləyirdi. Şəbəkə icazəli yenidən başladılmadan sonra eyni mənfi giriş ssenarisi gözlənilən 401 və düzgün UI mesajı verdi. Server restartı zamanı development HMR WebSocket bağlantısı müvəqqəti kəsildi. Bu qeydlər konsol tarixçəsindən gizlədilmədi. Sessiyasız və yanlış hesab ssenarilərinin 401 konsol qeydləri gözlənilən rədd cavablarıdır; “konsolda heç bir xəta yoxdur” iddiası edilmir.

Turbopack ilə davamlı səhifə yenilənməsi həm fixture, həm adi lokal rejimdə təkrarlandı. `npm run dev` Webpack rejiminə keçirildi; canlı MCP gəzintisi bu rejimdə sabit qaldı. Production build əmri dəyişdirilmədi.

## Sübutlar

- [Mobil müraciətlər ekranı](../.runtime/playwright-mcp/mobile-requests.png)
- [Sessiyasız rəhbər ekranı](../.runtime/playwright-mcp/mobile-manager-anonymous.png)
- [Mobil FAQ ekranı](../.runtime/playwright-mcp/mobile-faq.png)
- Snapshot və konsol faylları: `.runtime/playwright-mcp/` (lokal, Git-dən çıxarılıb).

## Yoxlanılmayanlar

Bazanın əvvəlki oxuma yoxlamasında istifadəçi, şirkət və filial yox idi. Buna görə uğurlu canlı hesab girişi, real filial QR yaradılması, fiziki GPS/kamera, davamiyyət yazılması və rəhbərin təsdiqi bu MCP yoxlaması ilə sübut edilmir. Bu axınların fixture E2E və lokal PostgreSQL testləri ayrı sübutlardır. İstehsal hazırlığı iddia edilmir.

## Avtomatlaşdırılmış test mühitləri

Konfiqurasiyalı fixture testləri 3001 portunda işləyir. Konfiqurasiyasız preview testləri canlı `.env.local` dəyərlərini boş mühit dəyişənləri ilə əvəz edən ayrıca 3002 serverinə ayrıldı. Canlı 3000 serverinin təsadüfən təkrar istifadəsi dayandırıldı. Ayrılmadan əvvəl 20/26 test keçmişdi; desktop və mobil üzrə aşağıdakı üç ssenari canlı konfiqurasiyada gözlədikləri konfiqurasiyasız vəziyyəti tapa bilmirdi:

- `login has labeled controls and clearly blocks unconfigured auth`
- `unconfigured attendance never pretends to save`
- `protected endpoints reject unavailable configuration without leaking details`

Bu ilkin uğursuz nəticələr keçmiş sayılmır. Mühitlər ayrıldıqdan sonra tam dəst yenidən işlədildi: **26/26 uğurlu, exit 0**. Ayrıca unit/PostgreSQL 40/40, konfiqurasiyalı fixture brauzer dəsti 7/7; TypeScript, lint və production build uğurludur. Bunlar yuxarıdakı canlı MCP gəzintisindən ayrı yoxlamalardır.

Rəsmi texniki mənbə: [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp).
