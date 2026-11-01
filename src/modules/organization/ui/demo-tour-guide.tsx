"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  QrCode,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

export type TourStep = {
  id: string;
  badge: string;
  title: string;
  description: string;
  highlight: string;
  moduleTarget: "overview" | "team" | "payroll" | "requests";
  icon: typeof Sparkles;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    badge: "1/4 · BİR BAXIŞDA NƏZARƏT",
    title: "Filialda kim var, kim gecikib? Anlıq görün.",
    description:
      "Bahalı turniket və ya barmaq izi cihazı almadan, hər filialınızın işçi heyətini, açıq növbələrini və günlük davamiyyətini smartfonunuzdan izləyin.",
    highlight: "14 / 16 işçi hazırda növbədədir · 2 filial aktiv",
    moduleTarget: "overview",
    icon: Building2,
  },
  {
    id: "attendance-qr",
    badge: "2/4 · TURNİKETSİZ QR & GPS",
    title: "Saxta girişlərə və kağız jurnallara son.",
    description:
      "İşçi yalnız filialın fiziki GPS koordinatlarında olduqda dinamik QR kodu oxuda bilir. Başqasının yerinə imza atmaq qeyri-mümkündür.",
    highlight: "100% auditli: kim, nə vaxt, hansı filialda qeyd edib",
    moduleTarget: "team",
    icon: QrCode,
  },
  {
    id: "payroll",
    badge: "3/4 · AVTOMATİK MAAŞ & AVANS",
    title: "Ay sonunda Excel-də günlərlə vaxt itirməyin.",
    description:
      "Aylıq və saatlıq tariflər, götürülən avanslar və rəhbər tərəfindən təsdiqlənmiş əlavə saatlar avtomatik yekun ödəniş cədvəlinə çevrilir.",
    highlight: "Avanslar, cəriməsiz dəqiq saat uçotu və bağlanış",
    moduleTarget: "payroll",
    icon: Coins,
  },
  {
    id: "start-free",
    badge: "4/4 · DAİMİ PULSUZ PAKET",
    title: "3 işçiyə qədər həmişəlik Pulsuz. Kart tələb olunmur.",
    description:
      "2 dəqiqəyə şirkətinizi qeydiyyatdan keçirin, filialınızı xəritədə qeyd edin və kollektivinizi dərhal qoşun. Heç bir ödəniş tələbi və ya xidmət dayanması yoxdur.",
    highlight: "0 AZN ödəniş · Limitsiz istifadə",
    moduleTarget: "overview",
    icon: Sparkles,
  },
];

export function DemoTourGuide({
  onSelectModule,
}: {
  onSelectModule: (module: "overview" | "team" | "schedule" | "requests" | "payroll" | "tasks" | "reports" | "plan") => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const step = TOUR_STEPS[stepIdx];
  const Icon = step.icon;

  const handleNext = () => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      const next = stepIdx + 1;
      setStepIdx(next);
      onSelectModule(TOUR_STEPS[next].moduleTarget);
    }
  };

  const handlePrev = () => {
    if (stepIdx > 0) {
      const prev = stepIdx - 1;
      setStepIdx(prev);
      onSelectModule(TOUR_STEPS[prev].moduleTarget);
    }
  };

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => {
          setDismissed(false);
          setIsOpen(true);
        }}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 100,
          background: "linear-gradient(135deg, #26221f 0%, #171513 100%)",
          color: "#fff",
          border: "1px solid rgba(242, 200, 168, 0.35)",
          borderRadius: 9999,
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
          transition: "transform 0.2s ease",
        }}
      >
        <Sparkles size={15} style={{ color: "#f2c8a8" }} />
        <span>Bələdçi turunu aç</span>
      </button>
    );
  }

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Demo Bələdçi Turu"
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 99,
        maxWidth: 420,
        width: "calc(100vw - 40px)",
        background: "rgba(22, 19, 17, 0.94)",
        border: "1px solid rgba(242, 200, 168, 0.3)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 18,
        padding: "20px 22px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(242, 200, 168, 0.12)",
        animation: "slideTourUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(242, 200, 168, 0.15)",
              color: "#f2c8a8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={14} />
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "#f2c8a8",
            }}
          >
            {step.badge}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Turu bağla"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.4)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          lineHeight: 1.35,
          marginBottom: 8,
        }}
      >
        {step.title}
      </h3>

      <p
        style={{
          fontSize: 13,
          color: "rgba(255, 255, 255, 0.72)",
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        {step.description}
      </p>

      {/* Highlight Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(180, 199, 166, 0.12)",
          border: "1px solid rgba(180, 199, 166, 0.25)",
          borderRadius: 8,
          padding: "6px 10px",
          marginBottom: 16,
          fontSize: 11.5,
          color: "#b4c7a6",
          fontWeight: 500,
        }}
      >
        <Check size={13} style={{ flexShrink: 0 }} />
        <span>{step.highlight}</span>
      </div>

      {/* Bottom Navigation & CTAs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
        {/* Step Indicator Dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setStepIdx(idx);
                onSelectModule(s.moduleTarget);
              }}
              style={{
                width: idx === stepIdx ? 20 : 6,
                height: 6,
                borderRadius: 9999,
                background: idx === stepIdx ? "#f2c8a8" : "rgba(255, 255, 255, 0.2)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.25s ease",
              }}
              aria-label={`Addım ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {stepIdx > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fff",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {stepIdx < TOUR_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                background: "#ffffff",
                color: "#13110f",
                border: "none",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>Növbəti</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <Link
              href="/qeydiyyat"
              style={{
                background: "linear-gradient(135deg, #f2c8a8 0%, #ffffff 100%)",
                color: "#13110f",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 14px rgba(242, 200, 168, 0.3)",
              }}
            >
              <span>Ödənişsiz başla</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
