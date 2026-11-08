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
  Mail,
  QrCode,
  RotateCcw,
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
  const isResuming = Boolean(pendingUser);

  // Form values
  const [displayName, setDisplayName] = useState(pendingUser?.displayName || "");
  const [companyName, setCompanyName] = useState("");
  const [branchName, setBranchName] = useState("Mərkəz filialı");
  const [email, setEmail] = useState(pendingUser?.email || "");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [ticket, setTicket] = useState("");

  // Navigation & animation states
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalSteps = isResuming ? 3 : 6;
  const progressPercent = Math.round(((step + 1) / totalSteps) * 100);

  function validateCurrentStep(): boolean {
    setError("");
    if (step === 0) {
      if (!displayName.trim() || displayName.trim().length < 2) {
        setError("Zəhmət olmasa, ad və soyadınızı tam daxil edin.");
        return false;
      }
    } else if (step === 1) {
      if (!companyName.trim() || companyName.trim().length < 2) {
        setError("Zəhmət olmasa, biznes və ya şirkətinizin adını daxil edin.");
        return false;
      }
    } else if (step === 2) {
      if (!branchName.trim()) {
        setError("Zəhmət olmasa, ilk filialın adını qeyd edin.");
        return false;
      }
    } else if (step === 3) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setError("Düzgün bir rəsmi e-poçt ünvanı daxil edin.");
        return false;
      }
    } else if (step === 4) {
      if (!password || password.length < 6) {
        setError("Şifrəniz ən azı 6 simvoldan ibarət olmalıdır.");
        return false;
      }
    } else if (step === 5) {
      if (!otpCode.trim() || otpCode.trim().length !== 6) {
        setError("Zəhmət olmasa, e-poçtunuza gələn 6 rəqəmli kodu tam daxil edin.");
        return false;
      }
    }
    return true;
  }

  async function handleNext() {
    if (!validateCurrentStep()) return;

    if (isResuming) {
      if (step < 2) {
        setDirection("forward");
        setStep((s) => s + 1);
      } else {
        // Finalize setup
        await handleCompleteSetup();
      }
      return;
    }

    if (step < 4) {
      setDirection("forward");
      setStep((s) => s + 1);
    } else if (step === 4) {
      // Step 4 is password -> request OTP from server
      await handleRequestOtp();
    } else if (step === 5) {
      // Step 5 is OTP verification
      await handleVerifyOtp();
    }
  }

  function handleBack() {
    if (step > 0 && !busy) {
      setError("");
      setDirection("backward");
      setStep((s) => s - 1);
    }
  }

  async function handleRequestOtp() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ success: boolean; ticket: string }>("/api/auth", {
        action: "register_request_otp",
        email: email.trim().toLowerCase(),
      });
      setTicket(res.ticket);
      setDirection("forward");
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Təsdiq kodu göndərilmədi. Yenidən cəhd edin.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ success: boolean; redirect?: string }>("/api/auth", {
        action: "register_verify_otp",
        email: email.trim().toLowerCase(),
        code: otpCode.trim(),
        ticket,
        displayName: displayName.trim(),
        companyName: companyName.trim(),
        branchName: branchName.trim() || "Baş Filial",
        password,
      });

      setSuccess(true);
      setTimeout(() => {
        router.replace(res.redirect || "/rehber");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Təsdiq kodu yanlışdır və ya vaxtı bitib.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteSetup() {
    setBusy(true);
    setError("");
    try {
      await api<{ success: boolean }>("/api/auth", {
        action: "complete_setup",
        displayName: displayName.trim(),
        companyName: companyName.trim(),
        branchName: branchName.trim() || "Baş Filial",
      });

      setSuccess(true);
      setTimeout(() => {
        router.replace("/rehber");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Qurulum tamamlanmadı.");
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

          {!configured && (
            <div className="auth-config">
              Supabase bağlantısı hələ qurulmayıb. Hazırda tanışlıq ekranlarına baxa bilərsiniz; real qeydiyyat bağlıdır.
            </div>
          )}

          {success ? (
            <div
              style={{
                background: "#e6f4ea",
                border: "1px solid #137333",
                color: "#137333",
                padding: 32,
                borderRadius: 16,
                textAlign: "center",
                marginTop: 20,
              }}
            >
              <CheckCircle2 size={44} style={{ margin: "0 auto 14px", color: "#137333" }} />
              <h2 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 700 }}>
                Təbriklər! Şirkətiniz aktivləşdirildi
              </h2>
              <p style={{ margin: 0, fontSize: "14.5px", color: "#1e4620" }}>
                Rəhbər idarəetmə paneliniz açılır…
              </p>
            </div>
          ) : (
            <div className="onboarding-stepper">
              {/* Top Progress */}
              <div className="onboarding-progress-wrap">
                <div
                  className="onboarding-progress-bar"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="onboarding-meta">
                <span className="onboarding-step-badge">
                  Addım {step + 1} / {totalSteps}
                </span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={step === 0 || busy}
                    className="onboarding-header-back-btn"
                    aria-label="Əvvəlki addım"
                    title="Geri"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid var(--line-strong)",
                      background: "var(--bg-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: step === 0 ? "not-allowed" : "pointer",
                      opacity: step === 0 ? 0.4 : 1,
                      color: "var(--fg)",
                    }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={busy}
                    className="onboarding-header-next-btn"
                    aria-label="Növbəti addım"
                    title="İrəli"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid var(--line-strong)",
                      background: "var(--bg-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "var(--fg)",
                    }}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {error && <div className="onboarding-error-box">{error}</div>}

              {/* Animated Slides */}
              <div
                key={step}
                className={`onboarding-slide-container ${
                  direction === "forward"
                    ? "onboarding-slide-forward"
                    : "onboarding-slide-backward"
                }`}
              >
                {/* STEP 0: Display Name */}
                {step === 0 && (
                  <div>
                    <h1 className="onboarding-question">Adınız və soyadınız nədir?</h1>
                    <p className="onboarding-hint">
                      Şirkət idarəçisi olaraq sistemdə görünəcək adınız.
                    </p>
                    <div className="onboarding-input-wrap">
                      <div className="onboarding-input-with-arrow">
                        <input
                          autoFocus
                          type="text"
                          className="onboarding-input"
                          placeholder="Məsələn: Nigar Əliyeva"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleNext();
                            }
                          }}
                          maxLength={100}
                        />
                        <button
                          type="button"
                          className="onboarding-input-arrow-btn"
                          onClick={handleNext}
                          disabled={busy}
                          aria-label="Növbəti addım"
                          title="İrəli"
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 1: Company Name */}
                {step === 1 && (
                  <div>
                    <h1 className="onboarding-question">
                      Biznesinizin və ya obyektinizin adı nədir?
                    </h1>
                    <p className="onboarding-hint">
                      İşçilərinizin və sistemin tanıyacağı rəsmi şirkət və ya brend adı.
                    </p>
                    <div className="onboarding-input-wrap">
                      <div className="onboarding-input-with-arrow">
                        <input
                          autoFocus
                          type="text"
                          className="onboarding-input"
                          placeholder="Məsələn: Nizami Kafe, Bravo Market..."
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleNext();
                            }
                          }}
                          maxLength={120}
                        />
                        <button
                          type="button"
                          className="onboarding-input-arrow-btn"
                          onClick={handleNext}
                          disabled={busy}
                          aria-label="Növbəti addım"
                          title="İrəli"
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Branch Name */}
                {step === 2 && (
                  <div>
                    <h1 className="onboarding-question">
                      İlk filialınızın adı nə olsun?
                    </h1>
                    <p className="onboarding-hint">
                      İşçilərin davamiyyət qeyd edəcəyi ilk məkan (sonradan dəyişdirilə bilər).
                    </p>
                    <div className="onboarding-input-wrap">
                      <div className="onboarding-input-with-arrow">
                        <input
                          autoFocus
                          type="text"
                          className="onboarding-input"
                          placeholder="Məsələn: Mərkəz filialı, Sahil filialı"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleNext();
                            }
                          }}
                          maxLength={120}
                        />
                        <button
                          type="button"
                          className="onboarding-input-arrow-btn"
                          onClick={handleNext}
                          disabled={busy}
                          aria-label="Növbəti addım"
                          title="İrəli"
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Email */}
                {step === 3 && !isResuming && (
                  <div>
                    <h1 className="onboarding-question">Rəsmi e-poçt ünvanınız?</h1>
                    <p className="onboarding-hint">
                      Giriş üçün istifadə olunacaq və təsdiq kodu bu ünvana göndəriləcək.
                    </p>
                    <div className="onboarding-input-wrap">
                      <div className="onboarding-input-with-arrow">
                        <input
                          autoFocus
                          type="email"
                          className="onboarding-input"
                          placeholder="nigar@biznes.az"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleNext();
                            }
                          }}
                          maxLength={254}
                        />
                        <button
                          type="button"
                          className="onboarding-input-arrow-btn"
                          onClick={handleNext}
                          disabled={busy}
                          aria-label="Növbəti addım"
                          title="İrəli"
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Password */}
                {step === 4 && !isResuming && (
                  <div>
                    <h1 className="onboarding-question">Təhlükəsiz şifrə təyin edin</h1>
                    <p className="onboarding-hint">
                      Hesabınızı qorumaq üçün ən azı 6 simvoldan ibarət şifrə daxil edin.
                    </p>
                    <div className="onboarding-input-wrap">
                      <div className="onboarding-input-with-arrow">
                        <input
                          autoFocus
                          type={showPassword ? "text" : "password"}
                          className="onboarding-input"
                          placeholder="Şifrənizi yazın"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleNext();
                            }
                          }}
                          style={{ paddingRight: 94 }}
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          style={{
                            position: "absolute",
                            right: 56,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "var(--dim)",
                            cursor: "pointer",
                            display: "flex",
                            padding: 4,
                          }}
                          aria-label={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button
                          type="button"
                          className="onboarding-input-arrow-btn"
                          onClick={handleNext}
                          disabled={busy}
                          aria-label="Növbəti addım"
                          title="İrəli"
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: OTP Verification */}
                {step === 5 && !isResuming && (
                  <div>
                    <h1 className="onboarding-question">E-poçtunuzu təsdiqləyin</h1>
                    <p className="onboarding-hint">
                      <strong>{email}</strong> ünvanına 6 rəqəmli təsdiq kodu göndərildi.
                    </p>
                    <div className="onboarding-input-wrap">
                      <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="onboarding-otp-input"
                        placeholder="000000"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleNext();
                          }
                        }}
                      />
                    </div>
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleRequestOtp}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--accent)",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <RotateCcw size={14} /> Kodu yenidən göndər
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="onboarding-actions">
                  <span style={{ fontSize: "13px", color: "var(--dim)" }}>
                    {step < totalSteps - 1
                      ? "Növbəti addıma keçmək üçün:"
                      : "Qeydiyyatı tamamlamaq üçün:"}
                  </span>

                  <button
                    type="button"
                    className="button primary"
                    onClick={handleNext}
                    disabled={busy || !configured}
                    style={{ padding: "12px 24px", fontSize: "15px" }}
                  >
                    {busy
                      ? "Yoxlanılır…"
                      : step === totalSteps - 1
                      ? "Təsdiqlə və Başla"
                      : "Davam et"}
                    {!busy && (
                      <span className="onboarding-enter-pill">
                        Enter ↵
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 28, textAlign: "center", fontSize: "0.88rem", color: "var(--dim)" }}>
            Artıq hesabınız var?{" "}
            <Link href="/giris" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Daxil olun
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
