"use client";
import { tr } from "@/shared/i18n/catalog";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Download,
  QrCode,
  RefreshCw,
  X,
} from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { Modal } from "@/shared/ui/modal";
import { api } from "@/shared/client/api";
import { date, time } from "@/shared/i18n/az";
import type { Attendance, Correction, Workspace } from "@/shared/types";
import { EmptyState } from "./employee-workspace";
type ManagerData = {
  corrections: Correction[];
  attendance: Attendance[];
  members: { id: string; display_name: string }[];
};
export function ManagerWorkspace({ configured }: { configured: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [selected, setSelected] = useState("");
  const [data, setData] = useState<ManagerData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<{ image: string; expiresAt: number } | null>(
      null,
    ),
    [qrOpen, setQrOpen] = useState(false),
    [tick, setTick] = useState(0);
  const [decision, setDecision] = useState<{
      id: string;
      decision: "approved" | "rejected";
    } | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    api<Workspace>("/api/workspace")
      .then((result) => {
        if (cancelled) return;
        if (!["owner", "manager"].includes(result.member.role)) {
          setError(tr("Rəhbər əməliyyatları üçün icazəniz yoxdur."));
          return;
        }
        setWorkspace(result);
        setSelected(result.branches[0]?.id || "");
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    api<ManagerData>(`/api/corrections?branch=${encodeURIComponent(selected)}`)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);
  useEffect(() => {
    if (!qrOpen) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [qrOpen]);
  async function generateQr() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ image: string; expiresAt: number }>(
        "/api/qr",
        { branchId: selected },
      );
      setQr(result);
      setTick(Date.now());
      setQrOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("QR kod yaradılmadı."));
    } finally {
      setBusy(false);
    }
  }
  async function submitDecision(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) return;
    setBusy(true);
    setError("");
    const reason = new FormData(event.currentTarget).get("reason");
    try {
      await api("/api/corrections", { ...decision, reason });
      setDecision(null);
      setNotice(tr("Qərar saxlanıldı və auditə yazıldı."));
      setData(
        await api<ManagerData>(
          `/api/corrections?branch=${encodeURIComponent(selected)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Qərar saxlanılmadı."));
    } finally {
      setBusy(false);
    }
  }
  const person = (id: string) =>
    data?.members.find((m) => m.id === id)?.display_name || tr("İşçi");
  const secondsLeft = qr
    ? Math.max(0, Math.ceil((qr.expiresAt - tick) / 1000))
    : 0;
  return (
    <main id="main" className="manager-shell">
      <header className="manager-header">
        <Link href="/isci">
          <Brand />
        </Link>
        <Link className="button secondary compact" href="/isci">
          <ArrowLeft size={15} />
          {tr("İşçi kabineti")}
        </Link>
      </header>
      <div className="manager-heading">
        <div>
          <div className="eyebrow">{tr("RƏHBƏR KABİNETİ")}</div>
          <h1>{tr("Filialın davamiyyəti")}</h1>
          <p>{tr("Qeydləri izləyin, düzəlişləri səbəbi ilə təsdiqləyin.")}</p>
        </div>
        {workspace && (
          <label className="field">
            {tr("Filial")}
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setData(null);
                setQr(null);
              }}
            >
              {workspace.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {!workspace && (
        <div className="preview-banner">
          <ClipboardCheck size={22} />
          <div>
            <strong>{tr("Rəhbər hesabınıza daxil olun")}</strong>
            <p>
              {configured
                ? tr(
                    "Yalnız təyin olunduğunuz filialların məlumatları görünəcək.",
                  )
                : tr("Bağlantı qurulduqda rəhbər əməliyyatları açılacaq.")}
            </p>
          </div>
          <Link href="/giris">{tr("Daxil ol")}</Link>
        </div>
      )}
      {error && !decision && (
        <p className="form-error" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          <Check size={17} />
          {notice}
        </p>
      )}
      <div className="manager-grid">
        <section className="card">
          <div className="section-title">
            <h2>{tr("Gözləyən düzəlişlər")}</h2>
            <span className="badge pending">
              {data?.corrections.length ?? "—"}
            </span>
          </div>
          {data?.corrections.length ? (
            data.corrections.map((c) => (
              <article key={c.id} className="manager-request">
                <strong>{person(c.membership_id)}</strong>
                <small>
                  {date(c.requested_in)} {tr("·")}
                  {time(c.requested_in)}
                  {c.requested_out
                    ? ` – ${time(c.requested_out)}`
                    : tr(" · açıq qeyd")}
                </small>
                <p>{c.reason}</p>
                <div className="decision-buttons">
                  <button
                    className="button primary compact"
                    onClick={() => {
                      setError("");
                      setDecision({ id: c.id, decision: "approved" });
                    }}
                  >
                    <Check size={15} />
                    {tr("Təsdiqlə")}
                  </button>
                  <button
                    className="button reject-button compact"
                    onClick={() => {
                      setError("");
                      setDecision({ id: c.id, decision: "rejected" });
                    }}
                  >
                    <X size={15} />
                    {tr("Rədd et")}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon="request"
              title={tr("Gözləyən müraciət yoxdur")}
              description="İşçilərin düzəliş müraciətləri burada görünəcək."
            />
          )}
        </section>
        <section className="card">
          <div className="section-title">
            <h2>{tr("Açıq və son davamiyyət qeydləri")}</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {selected && (
                <a
                  className="button secondary compact"
                  href={`/api/attendance/export?branch=${encodeURIComponent(selected)}`}
                  download
                  title="Davamiyyət cədvəlini Excel (CSV) formatında yüklə"
                >
                  <Download size={15} />
                  Excel çıxarışı
                </a>
              )}
              <button
                className="button secondary compact"
                disabled={!selected || busy}
                onClick={generateQr}
              >
                <QrCode size={16} />
                {tr("Filial QR kodu")}
              </button>
            </div>
          </div>
          {data?.attendance.length ? (
            data.attendance.map((a) => (
              <div className="manager-record" key={a.id}>
                <div>
                  <strong>{person(a.membership_id)}</strong>
                  <p>
                    {date(a.check_in)} {tr("·")}
                    {time(a.check_in)}
                    {a.check_out ? ` – ${time(a.check_out)}` : ""}
                  </p>
                </div>
                <span
                  className={`badge ${a.check_out ? "approved" : "pending"}`}
                >
                  {a.check_out ? tr("Tamamlanıb") : tr("İşdə")}
                </span>
              </div>
            ))
          ) : (
            <EmptyState
              title={tr("Hələ davamiyyət qeydi yoxdur")}
              description="Bu filialın son giriş və çıxışları burada görünəcək."
            />
          )}
        </section>
      </div>
      {qrOpen && qr && (
        <Modal title={tr("Filial QR kodu")} onClose={() => setQrOpen(false)}>
          <div className="qr-display">
            {secondsLeft > 0 ? (
              <>
                <Image
                  unoptimized
                  src={qr.image}
                  alt={tr(
                    "İşçilərin giriş və çıxış üçün oxudacağı filial QR kodu",
                  )}
                  width={320}
                  height={320}
                />
                <p>
                  {tr("Bu kod daha")}
                  {secondsLeft} {tr("saniyə etibarlıdır.")}
                </p>
              </>
            ) : (
              <div className="info-box">
                <p>
                  {tr("QR kodun vaxtı bitib. İşçilər üçün yeni kod yaradın.")}
                </p>
              </div>
            )}
            <button
              className="button primary full"
              disabled={busy}
              onClick={generateQr}
            >
              <RefreshCw size={17} />
              {tr("Kodu yenilə")}
            </button>
            <p>
              {tr("İşçi kodu öz hesabı ilə oxudur və məkanını təsdiqləyir.")}
            </p>
          </div>
        </Modal>
      )}
      {decision && (
        <Modal
          title={
            decision.decision === "approved"
              ? tr("Düzəlişi təsdiqlə")
              : tr("Müraciəti rədd et")
          }
          onClose={() => {
            if (!busy) setDecision(null);
          }}
        >
          <form className="stack" onSubmit={submitDecision}>
            <p>
              {tr(
                "Qərarın səbəbi işçiyə göstərilir və audit tarixçəsində saxlanılır.",
              )}
            </p>
            <label className="field">
              {tr("Qərarın səbəbi")}
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={1000}
                rows={3}
                placeholder={tr("Qərarınızı qısa əsaslandırın…")}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? tr("Saxlanılır…") : tr("Qərarı saxla")}
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
