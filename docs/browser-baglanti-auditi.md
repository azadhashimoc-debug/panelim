# Brauzer bağlantısının auditi

Tarix: 2026-10-31, 23:38 AZT.

## Nəticə

Supabase quruluşunu bloklayan problem yerli desktop idarəetmə kanalının bu agent sessiyasında əlçatan olmamasıdır. Kanalın niyə yaradılmaması və ya sessiyaya ötürülməməsi hələ tam müəyyən edilməyib.

## Təsdiqlənən faktlar

- `cua.getState()` təkrar yoxlamalarda boş tətbiq/brauzer siyahısı, `Computer Use native pipe is unavailable ... os error 2` və `The browser access host is unavailable` qaytarır.
- Chrome prosesləri işləyir. Boş alət siyahısı brauzerin bağlı olmasını göstərmir.
- `browser`, `chrome`, `computer-use`, `unified-computer-use` plaginləri lokal konfiqurasiyada aktivdir.
- `codex-computer-use.exe` köməkçi proqram faylı runtime qovluğunda mövcuddur.
- Node REPL yoxlamasında `SKY_CUA_NATIVE_PIPE`, `SKY_CUA_NATIVE_PIPE_DIRECTORY`, `NODE_REPL_HOST_SERVICES_PIPE_PATH` dəyərləri yoxdur; `nodeRepl.nativePipe.createConnection` funksiyası da yoxdur. Bu nəticə həmin REPL səthinə aiddir.
- Görünən Windows pipe siyahısında `codex-computer-use` kanalı yoxdur. Ayrı `codex-browser-use` kanalı mövcuddur; onun olması hazırkı agentin qoşula bildiyini sübut etmir.
- Aktiv desktop prosesinin 19:34 UTC-də başlayan jurnalında app-server bağlantısı qurulur, lakin computer-use/browser-use native pipe startup qeydi yoxdur.
- Əvvəlki, 19:18 UTC sessiyasının jurnalında hər iki xidmət üçün startup/listening qeydləri var. Bu, əvvəlki və hazırkı tətbiq başlanğıcları arasında fərqdir.
- Ayrı Browser Use bulud sessiyası Supabase giriş səhifəsinə çatdı, amma istifadəçinin yerli brauzerindəki hesab sessiyasını paylaşmadı. Qaytarılan preview keçidi redaktə edilmişdi və istifadəçiyə işlək keçid kimi təqdim edilə bilməzdi.

## Şərh və məhdudiyyət

Ən güclü ehtimal tətbiq başlanğıcı və ya agent sessiyasına desktop xidmətlərinin ötürülməsi problemidir. İcazə bloklanması, antivirus, konkret versiya xətası və ya dəqiq kod səbəbi sübut edilməyib. Köhnə jurnallardakı başqa xətalar hazırkı problemin səbəbi kimi qəbul edilməyib.

## Növbəti yoxlama

Tətbiqi tam bağlayıb yenidən açdıqdan sonra yerli sessiyada `cua.getState()` ilə təkrar yoxlama aparılmalıdır. Bu təklif yoxlanmış həll deyil. Problem qalarsa, tətbiqin Problem bildir/Report issue yolu ilə yuxarıdakı xəta və vaxtlar təqdim edilməlidir. Tətbiqi yenidən başlatmaq cari agent işini dayandıra biləcəyi üçün audit zamanı edilməyib.

Auditdə heç bir konfiqurasiya, təhlükəsizlik icazəsi və Supabase məlumatı dəyişdirilməyib. Sirrlər hesabata daxil edilməyib.

## İstifadəçinin düzəliş tələbindən sonra — 23:41 AZT

`config.toml` daxilində əl ilə əlavə edilmiş `mcp_servers.node_repl` və onun `env` bloku aşkarlandı. Burada əvvəlki 19:18 UTC sessiyasının artıq mövcud olmayan `codex-computer-use-ddb56e42-…` kanal ünvanı sabitlənmişdi. Eyni köhnə ünvan hazırda yüklənmiş generated `cua_repl` manifestində də var. Bu, əvvəlki auditdə müəyyən edilməyən əlavə sübutdur.

İcazəli düzəliş: xüsusi `node_repl` konfiqurasiyasının 1591 simvolluq bloku çıxarıldı; faylın qalan hissəsinin eyni qaldığı yoxlanıldı. Ehtiyat nüsxə: `C:\Users\adem\.codex\config.toml.browser-repair-20261031-234101.bak`. Generated plugin manifestləri və təhlükəsizlik ayarları dəyişdirilmədi.

Son yoxlama: `cua_repl` JavaScript sessiyasının reset edilməsi xətanı aradan qaldırmadı. Hazırda işləyən MCP prosesi hələ köhnə başlanğıc ayarlarını istifadə edir. Tətbiq/MCP prosesinin tam yenidən başladılmasından sonrakı nəticə yoxlanılmayıb; buna görə brauzer bağlantısı düzəlmiş sayılmır.
