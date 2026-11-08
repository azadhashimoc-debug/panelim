"use client";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { api } from "@/shared/client/api";

const noSubscription = () => () => {};
// Token URL fraqmentindədir (#t=...): serverə göndərilmir, yalnız brauzerdə oxunur
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";

export function InviteForm() {
  const router = useRouter();
  const token = useSyncExternalStore(noSubscription, readToken, () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("Şifrələr eyni deyil.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ redirect: string }>("/api/auth", {
        action: "accept_invite",
        token,
        password,
      });
      // Token işləndi: geri düyməsi ilə ünvan sətrində qalmasın
      window.history.replaceState(null, "", "/davet");
      router.replace(result.redirect);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şifrə təyin edilmədi.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell" id="main">
      <section className="auth-main" style={{ gridColumn: "1 / -1" }}>
        <div className="auth-form-wrap">
          <div style={{ marginBottom: 24 }}>
            <Brand />
          </div>
          <h1>Şifrənizi təyin edin</h1>
          <p>Bundan sonra e-poçtunuz və bu şifrə ilə hesabınıza daxil olacaqsınız.</p>
          {token === "" ? (
            <p className="form-error" role="alert">
              Link tam deyil. Rəhbərinizdən yeni link istəyin.
            </p>
          ) : (
            <form className="stack" onSubmit={submit}>
              <label className="field">
                Yeni şifrə (ən azı 8 simvol)
                <span style={{ position: "relative" }}>
                  <input
                    style={{ paddingRight: 48 }}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    maxLength={256}
                    autoComplete="new-password"
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
              <label className="field">
                Şifrənin təkrarı
                <input
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete="new-password"
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary full" disabled={busy || !token}>
                {busy ? "Yadda saxlanılır…" : "Şifrəni təsdiqlə"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
