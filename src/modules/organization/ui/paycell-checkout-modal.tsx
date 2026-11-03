"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { api } from "@/shared/client/api";
import type { SubscriptionStatus } from "@/shared/types";

type Plan = SubscriptionStatus["plan_tier"];

interface PaycellCheckoutModalProps {
  plan: Plan;
  extraBranches: number;
  amountAzn: number;
  demo?: boolean;
  onSuccess: () => Promise<void>;
  onClose: () => void;
}

export function PaycellCheckoutModal({
  plan,
  extraBranches,
  amountAzn,
  demo = false,
  onSuccess,
  onClose,
}: PaycellCheckoutModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleRedirectToPaycell(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError("");

    try {
      if (demo) {
        await onSuccess();
        onClose();
        return;
      }

      const idempotencyKey = crypto.randomUUID();
      const result = await api<{
        ok: boolean;
        checkoutUrl: string;
        orderId: string;
        amountAzn: number;
      }>("/api/billing", {
        mode: "paycell",
        plan,
        extraBranches,
        idempotencyKey,
      });

      if (!result.checkoutUrl) {
        throw new Error("Paycell ödəniş keçidi yaradıla bilmədi.");
      }

      window.location.assign(result.checkoutUrl);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Ödəniş şlüzünə keçid zamanı xəta baş verdi. Yenidən cəhd edin.",
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
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
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
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",
          color: "#0f172a",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#0f766e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>
                Paycell.Az Ödəniş Şlüzü
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ShieldCheck size={13} color="#0f766e" /> Rəsmi 3D Secure Kart Ödənişi
              </div>
            </div>
          </div>
          {!processing && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#475569",
                cursor: "pointer",
                padding: "10px",
                minWidth: "44px",
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "10px",
              }}
              title="Bağla"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleRedirectToPaycell} style={{ padding: "22px 20px" }}>
          <div
            style={{
              background: "#f0fdfa",
              border: "1px solid #99f6e4",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#0f766e", fontWeight: 700 }}>
                SEÇİLƏN PAKET
              </div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                {plan.toUpperCase()} {extraBranches > 0 ? `(+${extraBranches} filial)` : ""}
              </div>
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                Müddət: 30 gün (1 ay)
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#475569" }}>Yekun məbləğ</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f766e" }}>
                {amountAzn}.00 AZN
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              fontSize: "12.5px",
              lineHeight: "1.7",
              color: "#334155",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#475569" }}>Ödəniş provayderi:</span>
              <strong style={{ color: "#0f172a" }}>Paycell.Az (Site #89)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#475569" }}>Tərəfdaş domen:</span>
              <strong style={{ color: "#0f172a" }}>panelim.az</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#475569" }}>Kart məlumatları:</span>
              <span style={{ color: "#0f766e", fontWeight: 600 }}>
                Birbaşa Paycell / Bank səhifəsində
              </span>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "12px",
                marginBottom: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={processing}
            style={{
              width: "100%",
              minHeight: "48px",
              padding: "14px",
              borderRadius: "10px",
              background: processing ? "#64748b" : "#0f766e",
              border: "none",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              cursor: processing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Lock size={15} />
            <span>
              {processing
                ? "Paycell.Az şlüzünə yönləndirilir…"
                : `Paycell.Az ilə Ödə (${amountAzn}.00 AZN)`}
            </span>
            {!processing && <ExternalLink size={15} />}
          </button>

          <div
            style={{
              marginTop: "12px",
              fontSize: "11.5px",
              color: "#475569",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <Sparkles size={12} color="#0f766e" />
            Ödəniş təsdiqləndikdən sonra abunəlik avtomatik aktivləşir
          </div>
        </form>
      </div>
    </div>
  );
}
