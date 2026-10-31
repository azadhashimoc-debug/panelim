"use client";
import { tr } from "@/shared/i18n/catalog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { api } from "@/shared/client/api";
export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth", {
        action: "login",
        email: form.get("email"),
        password: form.get("password"),
      });
      const qr = new URL(window.location.href).searchParams.get("qr");
      router.replace(
        qr && qr.length <= 1024
          ? `/isci?qr=${encodeURIComponent(qr)}`
          : "/isci",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Giriş alınmadı."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell" id="main">
      <section className="auth-story">
        <Link href="/">
          <Brand />
        </Link>
        <div className="auth-story-content">
          <h2>
            {tr("İşin vaxtında.")}
            <br />
            <span>{tr("Hər şey qaydasında.")}</span>
          </h2>
          <p>
            {tr(
              "İş vaxtınız, növbələriniz və davamiyyətiniz — hər zaman əlinizin altında.",
            )}
          </p>
          <div className="auth-features">
            <span>
              <QrCode size={16} />
              {tr("QR ilə qeydiyyat")}
            </span>
            <span>
              <MapPin size={16} />
              {tr("Məkan yoxlaması")}
            </span>
            <span>
              <ShieldCheck size={16} />
              {tr("Təhlükəsiz hesab")}
            </span>
          </div>
        </div>
        <span className="auth-copyright">
          {tr("Azərbaycan biznesləri üçün hazırlanıb.")}
        </span>
      </section>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <Link className="auth-back" href="/isci">
            <ArrowLeft size={15} />
            {tr("İşçi kabinetinə qayıt")}
          </Link>
          <h1>{tr("Yenidən xoş gördük.")}</h1>
          <p>{tr("İş gününüzə başlamaq üçün hesabınıza daxil olun.")}</p>
          {!configured && (
            <div className="auth-config">
              {tr(
                "Supabase bağlantısı hələ qurulmayıb. Hazırda tanışlıq ekranlarına baxa bilərsiniz; hesab girişi və real qeyd bağlıdır.",
              )}
            </div>
          )}
          <form className="stack" onSubmit={submit}>
            <label className="field">
              {tr("E-poçt ünvanı")}
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder={tr("ad@biznes.az")}
                maxLength={254}
              />
            </label>
            <label className="field">
              {tr("Şifrə")}
              <span style={{ position: "relative" }}>
                <input
                  style={{ paddingRight: 48 }}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  maxLength={256}
                  placeholder={tr("Şifrənizi daxil edin")}
                />
                <button
                  className="icon-button"
                  type="button"
                  style={{ position: "absolute", right: 4, top: 4 }}
                  aria-label={
                    showPassword ? tr("Şifrəni gizlət") : tr("Şifrəni göstər")
                  }
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary full"
              disabled={busy || !configured}
            >
              {busy ? tr("Yoxlanılır…") : tr("Daxil ol")}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-note">
            {tr(
              "İşçi hesabı və şifrə bərpası üçün biznes sahibinizə müraciət edin. Məxfi məlumatlarınızı heç kimlə paylaşmayın.",
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
