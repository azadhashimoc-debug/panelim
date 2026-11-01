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

export function RegisterForm({
  configured,
  pendingUser,
}: {
  configured: boolean;
  pendingUser?: { id: string; email?: string; displayName?: string } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const isResuming = Boolean(pendingUser);

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

    if (!isResuming && (!password || password.length < 6)) {
      setError("Şifrə ən azı 6 simvoldan ibarət olmalıdır.");
      setBusy(false);
      return;
    }

    try {
      if (isResuming) {
        await api<{ requiresEmailConfirmation: boolean }>("/api/auth", {
          action: "complete_setup",
          displayName,
          companyName,
          branchName: branchName || "Baş Filial",
        });
        setSuccess(true);
        setRequiresConfirmation(false);
      } else {
        const result = await api<{
          requiresEmailConfirmation: boolean;
          recovered?: boolean;
        }>("/api/auth", {
          action: "register",
          email,
          password,
          displayName,
          companyName,
          branchName: branchName || "Baş Filial",
        });

        setSuccess(true);
        setRequiresConfirmation(result.requiresEmailConfirmation);
        if (result.requiresEmailConfirmation) return;
      }

      setTimeout(() => {
        router.replace("/rehber");
        router.refresh();
      }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Qeydiyyat tamamlanmadı.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth", { action: "logout" });
      router.replace("/giris");
      router.refresh();
    } catch {
      router.replace("/giris");
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
              Daimi Free lisenziya (0 AZN)
            </span>
            <span>
              <QrCode size={16} />
              QR və GPS davamiyyət
            </span>
            <span>
              <Building2 size={16} />
              3 işçiyə qədər həmişəlik Pulsuz
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

          <h1>{isResuming ? "Şirkət qurulumuna davam edin" : "Yeni şirkət qeydiyyatı"}</h1>
          <p>
            {isResuming
              ? `Hesabınız hazırdır (${pendingUser?.email}). Şirkət və ilk filial məlumatlarınızı tamamlayaraq rəhbər kabinetinə keçin.`
              : "Daimi Free lisenziyası ilə şirkət hesabınızı dərhal açın."}
          </p>

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
                {requiresConfirmation ? "E-poçtunuza göndərilən təsdiq keçidini açın, sonra hesabınıza daxil olun." : "Daimi Free lisenziyanız aktivləşdirildi. Rəhbər kabinetinə yönləndirilirsiniz…"}
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
                    defaultValue={pendingUser?.displayName || ""}
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

              {!isResuming && (
                <>
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
                </>
              )}

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
                {busy
                  ? isResuming
                    ? "Qurulum tamamlanır…"
                    : "Qeydiyyat aparılır…"
                  : isResuming
                    ? "Qurulumu tamamla"
                    : "Ödənişsiz başla"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.88rem", color: "#6b778c" }}>
            {isResuming ? (
              <>
                Fərqli hesabla daxil olmaq istəyirsiniz?{" "}
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0052cc",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Çıxış edin
                </button>
              </>
            ) : (
              <>
                Artıq hesabınız var?{" "}
                <Link href="/giris" style={{ color: "#0052cc", fontWeight: 600 }}>
                  Daxil olun
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
