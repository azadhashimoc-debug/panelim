"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  QrCode,
  Sparkles,
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
  const [dismissed, setDismissed] = useState(true);
  const [minimized, setMinimized] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768,
  );

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
          setMinimized(false);
        }}
        className="tour-guide-floating-btn"
      >
        <Sparkles size={14} style={{ color: "#0f766e" }} />
        <span>Bələdçi turu ({stepIdx + 1}/4)</span>
      </button>
    );
  }

  if (!isOpen) return null;

  if (minimized) {
    return (
      <aside aria-label="Demo Bələdçi Turu" className="tour-guide-mini-bar">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="tour-guide-mini-content"
          aria-label="Turu genişləndir"
        >
          <span className="tour-guide-icon-badge">
            <Icon size={12} />
          </span>
          <span className="tour-guide-mini-title">
            <strong>{stepIdx + 1}/4</strong> · {step.title}
          </span>
        </button>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {stepIdx < TOUR_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="tour-guide-mini-next"
            >
              Növbəti
              <ChevronRight size={13} />
            </button>
          ) : (
            <Link href="/qeydiyyat" className="tour-guide-mini-cta">
              Başla
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label="Genişləndir"
            className="tour-guide-close-btn"
            style={{ padding: "4px 6px" }}
          >
            <ChevronLeft size={14} style={{ transform: "rotate(90deg)" }} />
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Turu bağla"
            className="tour-guide-close-btn"
          >
            <X size={15} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Demo Bələdçi Turu"
      className="tour-guide-aside"
    >
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span className="tour-guide-icon-badge">
            <Icon size={13} />
          </span>
          <span className="tour-guide-badge-text">
            {step.badge}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Turu yığcamlaşdır"
            className="tour-guide-close-btn"
            title="Yığcamlaşdır"
          >
            <ChevronRight size={15} style={{ transform: "rotate(90deg)" }} />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Turu bağla"
            className="tour-guide-close-btn"
            title="Bağla"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <h3 className="tour-guide-title">
        {step.title}
      </h3>

      <p className="tour-guide-desc">
        {step.description}
      </p>

      {/* Highlight Pill */}
      <div className="tour-guide-highlight">
        <Check size={13} style={{ flexShrink: 0 }} />
        <span>{step.highlight}</span>
      </div>

      {/* Bottom Navigation & CTAs */}
      <div className="tour-guide-footer">
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
                background: idx === stepIdx ? "#0f766e" : "#cbd5e1",
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
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
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
                background: "#0f766e",
                color: "#ffffff",
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
                background: "#0f766e",
                color: "#ffffff",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
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
