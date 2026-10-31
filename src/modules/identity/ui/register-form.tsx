"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { api } from "@/shared/client/api";

export function RegisterForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const displayName = form.get("displayName") as string;
    const companyName = form.get("companyName") as string;
    const branchName = form.get("branchName") as string;

    if (!displayName || displayName.trim().length < 2) {
      setError("Ad və soyadınızı daxil edin.");
      setBusy(false);
      return;
    }
    if (!companyName || companyName.trim().length < 2) {
      setError("Şirkət və ya obyekt adını daxil edin.");
      setBusy(false);
      return;
    }
    if (!password || password.length < 6) {
      setError("Şifrə ən azı 6 simvoldan ibarət olmalıdır.");
      setBusy(false);
      return;
    }

    try {
      await api("/api/auth", {
        action: "register",
        email,
        password,
        displayName,
        companyName,
        branchName: branchName || "Baş Filial",
      });

      setSuccess(true);
      setTimeout(() => {
        router.replace("/rehber");
        router.refresh();
      }, 1500);
    } catch (e: any) {
      setError(e instanceof Error ? e.message : "Qeydiyyat tamamlanmadı.");
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
            Biznesinizi
            <br />
            <span>1 dəqiqədə başladın.</span>
          </h2>
          <p>
            5–50 işçisi olan kafe, restoran və mağazalar üçün avtomatlaşdırılmış davamiyyət və daxili maaş uçotu.
          </p>
          <div className="auth-features">
            <span>
              <Sparkles size={16} />
              14 günlük Business sınaq
            </span>
            <span>
              <QrCode size={16} />
              QR və GPS davamiyyət
            </span>
            <span>
              <Building2 size={16} />
              25 işçi və 2 filial
            </span>
            <span>
              <ShieldCheck size={16} />
              Bank kartı tələb olunmur
            </span>
          </div>
        </div>
        <span className="auth-copyright">
          Azərbaycan biznesləri üçün hazırlanıb.
        </span>
      </section>

      <section className="auth-main">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <Link className="auth-back" href="/">
            <ArrowLeft size={15} />
            Ana səhifəyə qayıt
          </Link>

          <h1>Yeni şirkət qeydiyyatı</h1>
          <p>14 günlük ödənişsiz sınaqla şirkət hesabınızı indi açın.</p>

          {!configured && (
            <div className="auth-config">
              Supabase bağlantısı hələ qurulmayıb. Hazırda tanışlıq ekranlarına baxa bilərsiniz; real qeydiyyat bağlıdır.
            </div>
          )}

          {success ? (
            <div style={{
              background: "#e6f4ea",
              border: "1px solid #137333",
              color: "#137333",
              padding: 20,
              borderRadius: 8,
              textAlign: "center",
              marginTop: 20
            }}>
              <CheckCircle2 size={36} style={{ margin: "0 auto 10px" }} />
              <h3 style={{ margin: "0 0 8px" }}>Təbriklər! Şirkətiniz qeydiyyatdan keçdi</h3>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                14 günlük Business sınaq müddəti aktivləşdirildi. Rəhbər kabinetinə yönləndirilirsiniz…
              </p>
            </div>
          ) : (
            <form className="stack" onSubmit={submit} style={{ marginTop: 16 }}>
              <label className="field">
                Şirkət və ya obyektin adı
                <input
                  name="companyName"
                  type="text"
                  required
                  placeholder="Məsələn: Nizami Kafe"
                  maxLength={120}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  Rəhbərin adı və soyadı
                  <input
                    name="displayName"
                    type="text"
                    required
                    placeholder="Nigar Əliyeva"
                    maxLength={100}
                  />
                </label>

                <label className="field">
                  İlk filial adı
                  <input
                    name="branchName"
                    type="text"
                    placeholder="Mərkəz filialı"
                    maxLength={120}
                    defaultValue="Mərkəz filialı"
                  />
                </label>
              </div>

              <label className="field">
                Rəsmi e-poçt ünvanı
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="rehber@biznes.az"
                  maxLength={254}
                />
              </label>

              <label className="field">
                Şifrə (ən azı 6 simvol)
                <span className="password-wrap" style={{ position: "relative", display: "block" }}>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={256}
                    placeholder="Şifrənizi təyin edin"
                  />
                  <button
                    className="icon-button"
                    type="button"
                    style={{ position: "absolute", right: 4, top: 4 }}
                    aria-label={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
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
                type="submit"
                className="button primary full"
                disabled={busy || !configured}
              >
                {busy ? "Qeydiyyat aparılır…" : "14 günlük sınağı başlat"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.88rem", color: "#6b778c" }}>
            Artıq hesabınız var?{" "}
            <Link href="/giris" style={{ color: "#0052cc", fontWeight: 600 }}>
              Daxil olun
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
