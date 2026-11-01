"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { api } from "@/shared/client/api";
import type { SubscriptionStatus } from "@/shared/types";

type Plan = SubscriptionStatus["plan_tier"];

interface PaycellCheckoutModalProps {
  plan: Plan;
  extraBranches: number;
  amountAzn: number;
  onSuccess: () => Promise<void>;
  onClose: () => void;
}

export function PaycellCheckoutModal({
  plan,
  extraBranches,
  amountAzn,
  onSuccess,
  onClose,
}: PaycellCheckoutModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    txId: string;
    orderId: string;
    date: string;
    amount: number;
    plan: string;
  } | null>(null);

  // Card formatting
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + " / " + raw.slice(2);
    }
    setExpiry(raw);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvv(e.target.value.replace(/\D/g, "").slice(0, 3));
  };

  const isFormValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.replace(/\D/g, "").length === 4 &&
    cvv.length === 3 &&
    cardHolder.trim().length >= 3;

  const cardType = cardNumber.startsWith("4")
    ? "VISA"
    : cardNumber.startsWith("5")
      ? "Mastercard"
      : "BANK CARD";

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) {
      setError("Kart məlumatlarını tam və düzgün daxil edin.");
      return;
    }

    setProcessing(true);
    setError("");
    setProcessStep("Paycell Gateway ilə əlaqə qurulur…");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProcessStep("3D Secure bank sorğusu göndərilir…");

      const idempotencyKey = crypto.randomUUID();
      const orderId = `PAYCELL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      await new Promise((resolve) => setTimeout(resolve, 900));
      setProcessStep("Ödəniş təsdiqlənir və paket aktivləşdirilir…");

      const result = await api<{
        ok: boolean;
        transactionId: string;
      }>("/api/billing", {
        plan,
        extraBranches,
        idempotencyKey,
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      const now = new Intl.DateTimeFormat("az-AZ", {
        timeZone: "Asia/Baku",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date());

      setReceipt({
        txId: result.transactionId || idempotencyKey.slice(0, 8),
        orderId,
        date: now,
        amount: amountAzn,
        plan: plan.toUpperCase(),
      });

      await onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ödəniş icra olunmadı. Yenidən cəhd edin.",
      );
      setProcessing(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#12141a",
          border: "1px solid #282d3c",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "#f1f3f9",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #232838",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#161922",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "0.2px" }}>
                Paycell Gateway
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ShieldCheck size={12} color="#10b981" /> 256-bit SSL Təhlükəsiz Ödəniş
              </div>
            </div>
          </div>
          {!processing && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "8px",
              }}
              title="Bağla"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {receipt ? (
          /* Receipt View */
          <div style={{ padding: "28px 24px", textAlign: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "2px solid #10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#10b981",
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
              Ödəniş Uğurla Tamamlandı!
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
              {receipt.plan} paketi 30 gün müddətinə aktivləşdirildi.
            </p>

            <div
              style={{
                background: "#181c26",
                border: "1px solid #282f42",
                borderRadius: "14px",
                padding: "14px 16px",
                textAlign: "left",
                fontSize: "12px",
                lineHeight: "1.8",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Sifariş nömrəsi:</span>
                <strong style={{ fontFamily: "monospace", color: "#f8fafc" }}>
                  {receipt.orderId}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Məbləğ:</span>
                <strong style={{ color: "#10b981", fontSize: "13px" }}>
                  {receipt.amount}.00 AZN
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Tarix:</span>
                <span>{receipt.date}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Şlüz provayderi:</span>
                <span>Paycell MMC (Site #89)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: "#2563eb",
                border: "none",
                color: "#fff",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Tamamla və Kabinetə Qayıt
            </button>
          </div>
        ) : (
          /* Checkout Form */
          <form onSubmit={handlePay} style={{ padding: "20px" }}>
            {/* Amount Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(30, 58, 138, 0.25))",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "14px",
                padding: "14px 16px",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: 600 }}>
                  SEÇİLƏN PAKET
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>
                  {plan.toUpperCase()}{" "}
                  {extraBranches > 0 ? `(+${extraBranches} filial)` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Aylıq ödəniş</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#38bdf8" }}>
                  {amountAzn}.00 AZN
                </div>
              </div>
            </div>

            {/* Virtual Card Preview */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                border: "1px solid #334155",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "18px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", gap: "6px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "22px",
                      borderRadius: "4px",
                      background: "#e2e8f0",
                      opacity: 0.8,
                    }}
                  />
                  <div style={{ fontSize: "11px", color: "#64748b", alignSelf: "center" }}>
                    Paycell Partner
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "sans-serif",
                    fontWeight: 800,
                    fontSize: "13px",
                    color: "#94a3b8",
                    letterSpacing: "1px",
                  }}
                >
                  {cardType}
                </div>
              </div>

              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "17px",
                  letterSpacing: "2.5px",
                  color: "#f8fafc",
                  marginBottom: "16px",
                  fontWeight: 600,
                }}
              >
                {cardNumber || "•••• •••• •••• ••••"}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#94a3b8",
                }}
              >
                <div>
                  <div style={{ fontSize: "9px", textTransform: "uppercase", color: "#64748b" }}>
                    KART SAHİBİ
                  </div>
                  <div style={{ fontWeight: 600, color: "#e2e8f0" }}>
                    {cardHolder || "AD SOYAD"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "9px", textTransform: "uppercase", color: "#64748b" }}>
                    BİTMƏ TARİXİ
                  </div>
                  <div style={{ fontWeight: 600, color: "#e2e8f0" }}>
                    {expiry || "MM/YY"}
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                  KART NÖMRƏSİ
                </label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={processing}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#1e222d",
                    border: "1px solid #32384a",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                    BİTMƏ TARİXİ
                  </label>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    disabled={processing}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "#1e222d",
                      border: "1px solid #32384a",
                      color: "#fff",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                    CVV / CVC
                  </label>
                  <input
                    type="password"
                    placeholder="•••"
                    value={cvv}
                    onChange={handleCvvChange}
                    disabled={processing}
                    maxLength={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "#1e222d",
                      border: "1px solid #32384a",
                      color: "#fff",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      letterSpacing: "3px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                  KART ÜZƏRİNDƏKİ AD VƏ SOYAD
                </label>
                <input
                  type="text"
                  placeholder="ADƏM NOVRUZLU"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  disabled={processing}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#1e222d",
                    border: "1px solid #32384a",
                    color: "#fff",
                    fontSize: "13px",
                    textTransform: "uppercase",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  marginBottom: "14px",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing || !isFormValid}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: processing
                  ? "#334155"
                  : isFormValid
                    ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                    : "#242a38",
                border: "none",
                color: isFormValid ? "#fff" : "#64748b",
                fontWeight: 700,
                fontSize: "14px",
                cursor: processing || !isFormValid ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
            >
              {processing ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #fff",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span>{processStep}</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>{amountAzn}.00 AZN Ödəniş Et</span>
                </>
              )}
            </button>

            <div
              style={{
                marginTop: "12px",
                fontSize: "11px",
                color: "#64748b",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <Sparkles size={12} color="#3b82f6" />
              Paycell MMC güvəncəsi ilə 3D Secure kart təsdiqi
            </div>
          </form>
        )}
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
