export const az = {
  brand: "panelim",
  tagline: "İşin vaxtında. Hər şey qaydasında.",
  homeTitle: "İş gününüz bir baxışda",
  attendance: "Davamiyyətim",
  history: "Tarixçə",
  requests: "Müraciətlərim",
  greeting: "Xoş gəldiniz",
  intro: "Növbənizi izləyin, vaxtınızı rahat idarə edin.",
  preview: "Tanışlıq rejimi",
  previewDescription:
    "Şəxsi növbə və davamiyyət məlumatlarınızı görmək üçün hesabınıza daxil olun.",
  checkIn: "QR ilə giriş et",
  checkOut: "QR ilə çıxış et",
  login: "Hesabınıza daxil olun",
  logout: "Çıxış",
};
export const errorMessages: Record<string, string> = {
  NOT_CONFIGURED:
    "Bağlantı hələ qurulmayıb. Hesab məlumatları hazır olduqda davam edə bilərsiniz.",
  UNAUTHENTICATED: "Davam etmək üçün hesabınıza daxil olun.",
  FORBIDDEN: "Bu əməliyyat üçün icazəniz yoxdur.",
  EMPLOYEE_LIMIT_REACHED: "Paketin aktiv işçi limiti dolub. İşçini arxivləşdirin və ya paketi yüksəldin.",
  BRANCH_LIMIT_REACHED: "Paketin aktiv filial limiti dolub. Filialı deaktivləşdirin və ya paketi yüksəldin.",
  PLAN_SELECTION_REQUIRED: "Paket limiti aşılıb. Sahib aktiv qalacaq heyəti və filialı seçməli və ya paketi yüksəltməlidir.",
  INVALID_INPUT: "Məlumatları yoxlayıb yenidən cəhd edin.",
  INVALID_QR:
    "QR kod etibarsızdır və ya vaxtı bitib. Filialdakı yeni kodu oxudun.",
  LOCATION_ACCURACY:
    "Məkan dəqiq müəyyən edilmədi. Açıq sahədə yenidən cəhd edin və ya düzəliş müraciəti göndərin.",
  OUTSIDE_BRANCH:
    "Filialın qeydiyyat sahəsində olduğunuz təsdiqlənmədi. Filiala yaxınlaşın və yenidən cəhd edin.",
  INVALID_LOCATION: "Məkan məlumatı düzgün deyil.",
  ALREADY_CHECKED_IN: "Artıq giriş etmisiniz. Çıxış əməliyyatını seçin.",
  NOT_CHECKED_IN:
    "Açıq giriş qeydi tapılmadı. Düzəliş müraciəti göndərə bilərsiniz.",
  ALREADY_DECIDED: "Bu müraciət üzrə artıq qərar verilib.",
  DUPLICATE_REQUEST: "Bu qeyd üçün gözləyən müraciətiniz var.",
  OVERLAPPING_ATTENDANCE:
    "Təklif olunan vaxt başqa davamiyyət qeydi ilə üst-üstə düşür.",
  RATE_LIMITED: "Çox sayda cəhd edildi. Bir qədər sonra yenidən cəhd edin.",
  AUTH_FAILED: "E-poçt və ya şifrə düzgün deyil.",
  ALREADY_EXISTS: "Bu e-poçt ünvanı ilə artıq qeydiyyatdan keçilib.",
  INTERNAL: "Əməliyyat tamamlanmadı. Yenidən cəhd edin.",
  NETWORK: "İnternet bağlantısını yoxlayın. Qeyd təsdiqlənməyib.",
};
export const time = (value: string) =>
  new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
const months = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avqust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr",
];
export function date(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    day: "numeric",
    month: "numeric",
  }).formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")!.value;
  const month = Number(parts.find((part) => part.type === "month")!.value);
  return `${Number(day)} ${months[month - 1]}`;
}
export function dateWithYear(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")!.value;
  const month = Number(parts.find((part) => part.type === "month")!.value);
  const year = parts.find((part) => part.type === "year")!.value;
  return `${Number(day)} ${months[month - 1]} ${year}`;
}
export function formatMoney(qepik: number): string {
  const manat = Math.floor(qepik / 100);
  const coins = Math.abs(qepik % 100).toString().padStart(2, "0");
  return `${manat},${coins} ₼`;
}
