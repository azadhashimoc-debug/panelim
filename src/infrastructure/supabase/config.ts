import "server-only";
export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    (process.env.QR_SIGNING_SECRET?.length ?? 0) >= 32,
  );
}
export function requireConfig() {
  if (!isConfigured()) throw new Error("NOT_CONFIGURED");
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    qrSecret: process.env.QR_SIGNING_SECRET!,
  };
}
