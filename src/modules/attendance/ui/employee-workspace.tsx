"use client";
import { tr } from "@/shared/i18n/catalog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  ClipboardList,
  FilePenLine,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Timer,
  Umbrella,
  UserRound,
  WalletCards,
} from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { Modal } from "@/shared/ui/modal";
import { api } from "@/shared/client/api";
import { az, date, dateWithYear, formatMoney, time } from "@/shared/i18n/az";
import { bakuDay } from "../domain/attendance";
import type { Workspace, Attendance } from "@/shared/types";
import { QrScanner } from "./qr-scanner";
import { CorrectionForm } from "./correction-form";
import { LeaveRequestForm } from "./leave-request-form";

type View = "today" | "history" | "requests";
const nav = [
  {
    view: "today",
    href: "/isci",
    label: tr("İş günüm"),
    icon: LayoutDashboard,
  },
  {
    view: "history",
    href: "/isci/tarixce",
    label: tr("Davamiyyətim"),
    icon: History,
  },
  {
    view: "requests",
    href: "/isci/muracietler",
    label: tr("Müraciətlərim"),
    icon: ClipboardList,
  },
];
export function EmployeeWorkspace({
  configured,
  initialNow,
  view,
  basePath = "/isci",
  demo = false,
}: {
  configured: boolean;
  initialNow: string;
  view: View;
  basePath?: "/isci" | "/demo";
  demo?: boolean;
}) {
  const router = useRouter();
  const demoWorkspace: Workspace = {
    member: { id: "demo-member", company_id: "demo-company", user_id: "demo-user", display_name: "Aylin Məmmədova", role: "employee", archived_at: null },
    companyName: "Nümunə Kafe", branches: [{ id: "demo-branch", company_id: "demo-company", name: "Nizami filialı", latitude: 40.4093, longitude: 49.8671, radius_m: 100 }],
    attendance: [
      { id: "demo-a1", membership_id: "demo-member", branch_id: "demo-branch", check_in: "2026-11-01T05:00:00.000Z", check_out: null, work_date: "2026-11-01", source: "qr" },
      { id: "demo-a2", membership_id: "demo-member", branch_id: "demo-branch", check_in: "2026-10-31T05:02:00.000Z", check_out: "2026-10-31T14:01:00.000Z", work_date: "2026-10-31", source: "qr" },
      { id: "demo-a3", membership_id: "demo-member", branch_id: "demo-branch", check_in: "2026-10-30T05:04:00.000Z", check_out: "2026-10-30T14:00:00.000Z", work_date: "2026-10-30", source: "qr" },
    ],
    shifts: [{ id: "demo-shift", branch_id: "demo-branch", starts_at: "2026-11-01T05:00:00.000Z", ends_at: "2026-11-01T14:00:00.000Z" }],
    corrections: [{ id: "demo-correction", membership_id: "demo-member", branch_id: "demo-branch", attendance_id: null, requested_in: "2026-10-29T05:00:00.000Z", requested_out: "2026-10-29T14:00:00.000Z", reason: "Giriş qeydi telefondakı internet kəsintisinə görə yaranmayıb.", status: "pending", decision_reason: null, created_at: "2026-10-29T14:05:00.000Z" }],
    employmentTerms: { started_on: "2025-04-14", pay_type: "monthly", base_pay_qepik: 85000, payday_day: 5 },
    leaveRequests: [{ id: "demo-leave", request_type: "permission", starts_on: "2026-11-12", ends_on: "2026-11-12", reason: "Şəxsi iş üçün 2 saatlıq icazə", status: "pending", created_at: "2026-11-01T08:00:00.000Z" }],
  };
  const [workspace, setWorkspace] = useState<Workspace | null>(demo ? demoWorkspace : null),
    [loadError, setLoadError] = useState("");
  const [clock, setClock] = useState(initialNow),
    [dialog, setDialog] = useState<"attendance" | "correction" | "leave" | "help" | null>(
      null,
    );
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    if (!configured) return;
    try {
      const data = await api<Workspace>("/api/workspace");
      setWorkspace(data);
      setLoadError("");
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : tr("Məlumatlar yüklənmədi."),
      );
    }
  }, [configured]);
  useEffect(() => {
    const controller = new AbortController();
    if (configured)
      api<Workspace>("/api/workspace")
        .then((data) => {
          if (!controller.signal.aborted) {
            setWorkspace(data);
            setLoadError("");
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setLoadError(
              e instanceof Error ? e.message : tr("Məlumatlar yüklənmədi."),
            );
        });
    const timer = setInterval(() => setClock(new Date().toISOString()), 1000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [configured]);
  useEffect(() => {
    if (!configured) return;
    const url = new URL(window.location.href),
      qr = url.searchParams.get("qr");
    if (qr && qr.length <= 1024) {
      url.searchParams.delete("qr");
      window.history.replaceState(null, "", url.pathname + url.search);
      queueMicrotask(() => {
        setToken(qr);
        setDialog("attendance");
      });
    }
  }, [configured]);
  const loginHref =
    configured && token ? `/giris?qr=${encodeURIComponent(token)}` : "/giris";
  const onToken = useCallback((value: string) => {
    setToken(value);
    setError("");
  }, []);
  const open = workspace?.attendance.find((a) => !a.check_out);
  const currentShift = workspace?.shifts.find(
    (s) =>
      new Date(s.ends_at).getTime() >= new Date(clock).getTime() &&
      bakuDay(s.starts_at) <= bakuDay(clock),
  );
  const branch =
    workspace?.branches.find(
      (b) => b.id === (open?.branch_id || currentShift?.branch_id),
    ) || workspace?.branches[0];
  const today =
    workspace?.attendance.filter((a) => a.work_date === bakuDay(clock)) || [];
  const completedMinutes = today.reduce(
    (sum, a) =>
      sum +
      (a.check_out
        ? Math.round(
            (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) /
              60000,
          )
        : 0),
    0,
  );
  const terms = workspace?.employmentTerms;
  const currentMonthMinutes = (workspace?.attendance || []).filter((a) => a.work_date.slice(0, 7) === bakuDay(clock).slice(0, 7) && a.check_out).reduce((sum, a) => sum + Math.round((new Date(a.check_out!).getTime() - new Date(a.check_in).getTime()) / 60000), 0);
  const calculatedPay = terms ? terms.pay_type === "monthly" ? terms.base_pay_qepik : Math.round((currentMonthMinutes * terms.base_pay_qepik) / 60) : null;
  const money = (qepik: number) => formatMoney(qepik);
  const nextPayday = terms
    ? date(
        new Date(
          Date.UTC(
            new Date(clock).getUTCFullYear(),
            new Date(clock).getUTCMonth() +
              (new Date(clock).getUTCDate() > terms.payday_day ? 1 : 0),
            terms.payday_day,
            12,
            0,
            0,
          ),
        ).toISOString(),
      )
    : null;
  function showDialog(value: "attendance" | "correction" | "leave" | "help") {
    setError("");
    setToken("");
    setDialog(value);
  }
  async function submitAttendance() {
    if (!workspace || busy || demo) return;
    setBusy(true);
    setError("");
    try {
      if (!navigator.geolocation)
        throw new Error(
          tr(
            "Brauzer məkan yoxlamasını dəstəkləmir. Düzəliş müraciəti göndərə bilərsiniz.",
          ),
        );
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000,
          }),
      );
      await api("/api/attendance", {
        direction: open ? "out" : "in",
        token,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setDialog(null);
      setNotice(
        open
          ? tr("Çıxışınız qeydə alındı. Xoş istirahətlər!")
          : tr("Girişiniz qeydə alındı. Uğurlu iş günü!"),
      );
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : tr(
              "Məkan müəyyən edilmədi. İcazəni yoxlayın və ya düzəliş müraciəti göndərin.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/api/auth", { action: "logout" });
      router.push("/giris");
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : tr("Çıxış alınmadı."));
    }
  }
  const pageTitle =
    view === "history"
      ? tr("Davamiyyət tarixçəniz")
      : view === "requests"
        ? tr("Müraciətləriniz")
        : az.homeTitle;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link
          href={basePath}
          aria-label={tr("Panelim ana səhifə")}
          className="brand-link"
        >
          <Brand />
        </Link>
        <div className="workspace-label">{tr("İŞÇİ KABİNETİ")}</div>
        <nav aria-label={tr("Əsas naviqasiya")}>
          {nav.map((item) => (
            <Link
              key={item.view}
              className={`nav-item ${view === item.view ? "active" : ""}`}
              href={item.href.replace("/isci", basePath)}
              aria-current={view === item.view ? "page" : undefined}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {view === item.view && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        {(demo || (workspace && ["owner", "manager"].includes(workspace.member.role))) && (
          <Link className="nav-item manager-link" href={demo ? "/demo" : "/rehber"}>
            <Building2 size={20} />
            <span>{tr("Rəhbər paneli")}</span>
            <ArrowUpRight size={15} />
          </Link>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <ShieldCheck size={22} />
            <strong>{tr("Vaxtınız dəyərlidir.")}</strong>
            <p>{tr("Hər iş gününü rahatlıqla qeyd edin.")}</p>
            <span>
              {tr("panelim sizinlədir")}
              <span aria-hidden="true">{tr("✦")}</span>
            </span>
          </div>
          <button className="nav-item" onClick={() => showDialog("help")}>
            <CircleHelp size={19} />
            {tr("Kömək və dəstək")}
          </button>
          <div className="sidebar-footer">
            <span className="small-dot" />
            {tr("Azərbaycan üçün hazırlanıb")}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{tr("İşçi kabineti")}</span>
            <ChevronRight size={14} />
            <strong>
              {view === "today"
                ? tr("İş günüm")
                : view === "history"
                  ? az.attendance
                  : az.requests}
            </strong>
          </div>
          <div className="topbar-right">
            {demo && (
              <Link
                className="button secondary compact"
                href="/demo"
                style={{ gap: "6px", display: "inline-flex", alignItems: "center" }}
              >
                <Building2 size={15} />
                <span>Rəhbər görünüşü</span>
                <ArrowUpRight size={14} />
              </Link>
            )}
            <span className="top-date">
              <CalendarDays size={15} />
              {date(clock)}
            </span>
            <span className="top-divider" />
            {workspace ? (
              <>
                <span className="avatar">
                  {workspace.member.display_name.slice(0, 1)}
                </span>
                <span className="profile-name">
                  {workspace.member.display_name}
                </span>
                <button
                  className="icon-button"
                  title={tr("Hesabdan çıx")}
                  aria-label={tr("Hesabdan çıx")}
                  onClick={logout}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link className="login-link" href={loginHref}>
                <UserRound size={17} />
                <span>{tr("Daxil ol")}</span>
                <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {workspace
                  ? `${az.greeting}, ${workspace.member.display_name.split(" ")[0]}`
                  : tr("DAHA RAHAT İŞ GÜNÜ")}
                <span className="eyebrow-spark">{tr("✦")}</span>
              </div>
              <h1>{pageTitle}</h1>
              <p>
                {view === "today"
                  ? az.intro
                  : view === "history"
                    ? tr("Giriş və çıxış qeydləriniz həmişə əlinizin altında.")
                    : tr("Göndərdiyiniz düzəlişlərin vəziyyətini izləyin.")}
              </p>
            </div>
            <div className="branch-pill">
              <span className="branch-icon">
                <Building2 size={19} />
              </span>
              <span>
                <small>{workspace?.companyName || tr("İŞ MƏKANINIZ")}</small>
                <strong>{branch?.name || tr("Hesaba daxil olun")}</strong>
              </span>
            </div>
          </div>
          {(!workspace || demo) && (
            <div className="preview-banner">
              <div className="preview-icon">
                <Sparkles size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <strong>
                  {configured && !demo
                    ? tr("Şəxsi kabinetiniz sizi gözləyir")
                    : <><span>Tanışlıq rejimi</span> · İşçi baxışı</>}
                </strong>
                <p>
                  {loadError ||
                    (configured && !demo
                      ? tr("Hesab məlumatları yüklənir…")
                      : "Hazırda işçi ekranındasınız. Şirkət rəhbərinin kabinetinə və filial idarəetməsinə baxmaq üçün keçid edə bilərsiniz.")}
                </p>
              </div>
              {demo ? (
                <Link
                  className="button primary compact"
                  href="/demo"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                >
                  <Building2 size={16} />
                  Rəhbər kabinetinə keç
                </Link>
              ) : (
                <Link href={loginHref}>
                  {tr("Hesaba daxil ol")}
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}
          {demo && <div className="demo-sample-note"><Sparkles size={16}/><span><strong>Nümunə məlumatlar</strong> · Bu kabinetdəki şəxs, davamiyyət və maaş göstəriciləri yalnız demo üçündür.</span></div>}
          {notice && (
            <div className="notice" role="status">
              <Check size={18} />
              {notice}
              <button className="text-button" onClick={() => setNotice("")}>
                {tr("Bağla")}
              </button>
            </div>
          )}
          {view === "today" ? (
            <>
              <div className="overview-grid">
                <section
                  className="attendance-card"
                  aria-label={tr("Bugünkü davamiyyət")}
                >
                  <div className="attendance-top">
                    <span className="card-kicker">
                      <span className={`live-dot ${open ? "working" : ""}`} />
                      {tr("BUGÜNKÜ DAVAMİYYƏT")}
                    </span>
                    <span className="attendance-status">
                      {open ? tr("İşdəsiniz") : tr("Giriş gözlənilir")}
                    </span>
                  </div>
                  <div className="clock-display" aria-label={tr("Bakı vaxtı")}>
                    {new Intl.DateTimeFormat("az-AZ", {
                      timeZone: "Asia/Baku",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hourCycle: "h23",
                    }).format(new Date(clock))}
                    <span>{tr("Bakı vaxtı · GMT+4")}</span>
                  </div>
                  <div className="attendance-caption">
                    <h2>
                      {open
                        ? tr("Uğurlu iş günü!")
                        : tr("Yeni gün, yeni başlanğıc.")}
                    </h2>
                    <p>
                      {open
                        ? tr("İş gününüz bitəndə çıxış etməyi unutmayın.")
                        : tr(
                            "Filialdakı QR kodu oxudun və iş gününə başlayın.",
                          )}
                    </p>
                  </div>
                  <button
                    className="button check-button"
                    onClick={() => showDialog("attendance")}
                  >
                    <ScanLine size={21} />
                    {open ? az.checkOut : az.checkIn}
                    <ArrowRight size={19} />
                  </button>
                  <div className="attendance-security">
                    <MapPin size={13} />
                    <span>{tr("Filial QR kodu və məkan yoxlaması ilə")}</span>
                    <ShieldCheck size={14} />
                  </div>
                  <div className="card-orbit orbit-one" />
                  <div className="card-orbit orbit-two" />
                </section>
                <section className="shift-card card">
                  <div className="section-title">
                    <h2>{tr("Bugünkü növbəm")}</h2>
                    <span className="soft-icon">
                      <CalendarDays size={19} />
                    </span>
                  </div>
                  <div className="shift-time">
                    {currentShift
                      ? `${time(currentShift.starts_at)} – ${time(currentShift.ends_at)}`
                      : tr("Növbə təyin edilməyib")}
                  </div>
                  <p className="muted shift-subtitle">
                    {currentShift
                      ? `${date(currentShift.starts_at)} · ${workspace?.branches.find((b) => b.id === currentShift.branch_id)?.name || "Filial"}`
                      : tr("Təyin olunan növbəniz burada görünəcək.")}
                  </p>
                  <div className="shift-timeline">
                    <div>
                      <span className="timeline-point" />
                      <span>{tr("Giriş")}</span>
                      <strong>
                        {open
                          ? time(open.check_in)
                          : today[0]
                            ? time(today[today.length - 1].check_in)
                            : tr("— : —")}
                      </strong>
                    </div>
                    <span className="timeline-line" />
                    <div>
                      <span className="timeline-point end" />
                      <span>{tr("Çıxış")}</span>
                      <strong>
                        {today[0]?.check_out
                          ? time(today[0].check_out)
                          : tr("— : —")}
                      </strong>
                    </div>
                  </div>
                  <div className="shift-footer">
                    <Timer size={17} />
                    <span>{tr("Bu gün tamamlanmış iş vaxtı")}</span>
                    <strong>
                      {workspace
                        ? `${Math.floor(completedMinutes / 60)} s ${completedMinutes % 60} dəq`
                        : "—"}
                    </strong>
                  </div>
                </section>
              </div>
              <div className="secondary-grid">
                <section className="history-card card">
                  <div className="section-title">
                    <h2>{tr("Son qeydlərim")}</h2>
                    <Link className="subtle-link" href={`${basePath}/tarixce`}>
                      {tr("Hamısına bax")}
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <HistoryTable
                    rows={workspace?.attendance.slice(0, 4) || []}
                    branches={workspace?.branches || []}
                  />
                </section>
                <section className="quick-card card">
                  <div className="section-title">
                    <h2>{tr("Sürətli keçidlər")}</h2>
                    <span className="text-muted">
                      <Sparkles size={17} />
                    </span>
                  </div>
                  <button
                    className="quick-action"
                    onClick={() => showDialog("leave")}
                  >
                    <span className="action-icon mint">
                      <Umbrella size={21} />
                    </span>
                    <span>
                      <strong>İcazə və məzuniyyət</strong>
                      <small>Tarixi seçin, səbəbi yazın və rəhbərə göndərin</small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                  <button
                    className="quick-action"
                    onClick={() => showDialog("correction")}
                  >
                    <span className="action-icon lavender">
                      <FilePenLine size={21} />
                    </span>
                    <span>
                      <strong>{tr("Düzəliş müraciəti")}</strong>
                      <small>{tr("Qeydi unutmusunuz və ya səhv var?")}</small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                  <Link
                    className="quick-action"
                    href={`${basePath}/muracietler`}
                  >
                    <span className="action-icon peach">
                      <ClipboardList size={21} />
                    </span>
                    <span>
                      <strong>{tr("Müraciətlərim")}</strong>
                      <small>{tr("Göndərdiyiniz müraciətləri izləyin")}</small>
                    </span>
                    <ChevronRight size={17} />
                  </Link>
                  <div className="help-note">
                    <span className="small-dot" />
                    <p>
                      {tr(
                        "Hesaba daxil ola bilmirsiniz? Rəhbərinizlə birbaşa əlaqə saxlayın. Düzəliş müraciəti üçün əvvəl hesabınıza daxil olun.",
                      )}
                    </p>
                  </div>
                </section>
              </div>
              <section className="personal-summary" aria-label="İş məlumatlarım">
                <article className="summary-item">
                  <span className="summary-icon"><CalendarDays size={19} /></span>
                  <div><small>İŞƏ BAŞLAMA TARİXİ</small><strong>{terms ? dateWithYear(`${terms.started_on}T00:00:00+04:00`) : "Rəhbər tərəfindən əlavə ediləcək"}</strong></div>
                </article>
                <article className="summary-item">
                  <span className="summary-icon pay"><WalletCards size={19} /></span>
                  <div><small>BU AYIN QAZANCI</small><strong>{calculatedPay === null ? "Maaş şərtləri təyin edilməyib" : money(calculatedPay)}</strong><p>{terms?.pay_type === "hourly" ? "Tamamlanmış saatlardan nümunə hesab" : "Nümunə aylıq əsas məbləğ"}</p></div>
                </article>
                <article className="summary-item">
                  <span className="summary-icon payday"><CalendarDays size={19} /></span>
                  <div><small>NÖVBƏTİ MAAŞ GÜNÜ</small><strong>{nextPayday || "Rəhbər tərəfindən təyin ediləcək"}</strong><p>Yekun hesablaşma təsdiqdən sonra görünəcək</p></div>
                </article>
              </section>
              <div className="bottom-note">
                <ShieldCheck size={18} />
                <span>
                  {tr(
                    "Qeydləriniz təhlükəsiz saxlanılır. Məlumatlarınızı yalnız siz və səlahiyyətli rəhbəriniz görə bilər.",
                  )}
                </span>
                <span className="note-brand">
                  {tr("Sadə. Rahat. Panelim.")}
                </span>
              </div>
            </>
          ) : view === "history" ? (
            <section className="card full-card">
              <div className="section-title">
                <h2>{tr("Son 30 qeyd")}</h2>
                <span className="muted">{tr("Bakı vaxtı ilə")}</span>
              </div>
              <HistoryTable
                rows={workspace?.attendance || []}
                branches={workspace?.branches || []}
              />
              <p className="table-note">
                {tr("Vaxtlarda səhv varsa, düzəliş müraciəti göndərin.")}
              </p>
              <button
                className="button secondary"
                onClick={() => showDialog("correction")}
              >
                <FilePenLine size={17} />
                {tr("Düzəliş müraciəti")}
              </button>
            </section>
          ) : (
            <section className="card full-card">
              <div className="section-title">
                <h2>{tr("Müraciətlər")}</h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    className="button secondary compact"
                    onClick={() => showDialog("leave")}
                  >
                    <Umbrella size={16} />
                    {tr("İcazə / Məzuniyyət")}
                  </button>
                  <button
                    className="button primary compact"
                    onClick={() => showDialog("correction")}
                  >
                    <FilePenLine size={16} />
                    {tr("Düzəliş")}
                  </button>
                </div>
              </div>
              {workspace?.corrections.length ? (
                <div className="request-list">
                  {workspace.leaveRequests.map((request) => (
                    <article className="request-row" key={request.id}>
                      <span className="action-icon mint"><Umbrella size={19} /></span>
                      <div><strong>{request.request_type === "leave" ? "Məzuniyyət" : "İcazə"} · {request.starts_on}{request.ends_on !== request.starts_on ? ` — ${request.ends_on}` : ""}</strong><p>{request.reason}</p></div>
                      <span className={`badge ${request.status}`}>{request.status === "pending" ? "Gözləyir" : request.status === "approved" ? "Təsdiqlənib" : "Rədd edilib"}</span>
                    </article>
                  ))}
                  {workspace.corrections.map((c) => (
                    <article className="request-row" key={c.id}>
                      <span className="action-icon lavender">
                        <FilePenLine size={19} />
                      </span>
                      <div>
                        <strong>
                          {date(c.requested_in)} {tr("·")}
                          {time(c.requested_in)}
                          {c.requested_out ? ` – ${time(c.requested_out)}` : ""}
                        </strong>
                        <p>{c.reason}</p>
                        {c.decision_reason && (
                          <small>
                            {tr("Rəhbərin qeydi:")}
                            {c.decision_reason}
                          </small>
                        )}
                      </div>
                      <span className={`badge ${c.status}`}>
                        {c.status === "pending"
                          ? tr("Gözləyir")
                          : c.status === "approved"
                            ? tr("Təsdiqlənib")
                            : tr("Rədd edilib")}
                      </span>
                    </article>
                  ))}
                </div>
              ) : workspace?.leaveRequests.length ? (
                <div className="request-list">{workspace.leaveRequests.map((request) => <article className="request-row" key={request.id}><span className="action-icon mint"><Umbrella size={19} /></span><div><strong>{request.request_type === "leave" ? "Məzuniyyət" : "İcazə"} · {request.starts_on}</strong><p>{request.reason}</p></div><span className={`badge ${request.status}`}>{request.status === "pending" ? "Gözləyir" : "Təsdiqlənib"}</span></article>)}</div>
              ) : (
                <EmptyState
                  icon="request"
                  title={tr("Hələ müraciətiniz yoxdur")}
                  description="Düzəliş tələb olunarsa, yeni müraciət göndərə bilərsiniz."
                />
              )}
            </section>
          )}
          <footer className="content-footer">
            <span>
              {tr("©")}
              {new Date(initialNow).getFullYear()} {tr("panelim.az")}
            </span>
            <span>{tr("İşin vaxtında. Hər şey qaydasında.")}</span>
          </footer>
        </main>
      </div>
      {dialog && (
        <Modal
          title={
            dialog === "attendance"
              ? open
                ? tr("İş gününü tamamla")
                : tr("İş gününə başla")
              : dialog === "correction"
                ? tr("Düzəliş müraciəti")
                : dialog === "leave"
                  ? "İcazə və məzuniyyət müraciəti"
                : tr("Kömək və dəstək")
          }
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          {dialog === "help" ? (
            <div className="stack">
              <p>
                {tr(
                  "Giriş və çıxış üçün filialınızda göstərilən, hər iki dəqiqədə yenilənən QR kodu oxudun və məkan icazəsi verin.",
                )}
              </p>
              <div className="info-box">
                <MapPin size={19} />
                <p>
                  {tr(
                    "Məkan yoxlaması telefonun GPS məlumatından asılıdır və dəqiq mövqeyə zəmanət vermir. İnternet, GPS və ya unudulmuş qeyd problemi varsa, düzəliş müraciəti göndərin.",
                  )}
                </p>
              </div>
              <p>
                {tr(
                  "Hesab və filial təyinatı üçün biznes sahibinizə müraciət edin.",
                )}
              </p>
            </div>
          ) : !workspace || demo ? (
            <div className="login-prompt">
              <span className="prompt-icon">
                <UserRound size={28} />
              </span>
              <h3>{az.login}</h3>
              <p>
                {tr(
                  "Bu əməliyyat şəxsi işçi hesabınızla mümkündür. Tanışlıq rejimində davamiyyət qeydi yaradılmır.",
                )}
              </p>
              <Link className="button primary full" href={loginHref}>
                {tr("Giriş səhifəsinə keç")}
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : dialog === "correction" ? (
            <CorrectionForm
              workspace={workspace}
              demo={demo}
              onSuccess={() => {
                setDialog(null);
                setNotice(
                  demo
                    ? "Demo rejimində müraciətiniz qəbul edildi (nümunə)."
                    : tr("Müraciətiniz rəhbərə göndərildi."),
                );
                if (!demo) void refresh();
              }}
            />
          ) : dialog === "leave" ? (
            <LeaveRequestForm
              demo={demo}
              onSuccess={() => {
                setDialog(null);
                setNotice(
                  demo
                    ? "Demo rejimində müraciətiniz qəbul edildi (nümunə)."
                    : "Müraciətiniz rəhbərə göndərildi.",
                );
                if (!demo) void refresh();
              }}
            />
          ) : (
            <div className="stack">
              {!token ? (
                <QrScanner onToken={onToken} />
              ) : (
                <>
                  <div className="qr-confirmed">
                    <QrCode size={28} />
                    <div>
                      <strong>{tr("QR kod oxundu")}</strong>
                      <p>{tr("İndi məkanınızı təsdiqləyin.")}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setToken("")}
                    >
                      {tr("Yenidən oxut")}
                    </button>
                  </div>
                  <p className="muted">
                    {tr(
                      "Əməliyyat yalnız filialın qeydiyyat sahəsində və server təsdiqindən sonra tamamlanır.",
                    )}
                  </p>
                  <button
                    className="button primary full"
                    onClick={submitAttendance}
                    disabled={busy}
                  >
                    <MapPin size={18} />
                    {busy ? tr("Yoxlanılır…") : tr("Məkanı yoxla və təsdiqlə")}
                  </button>
                </>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setDialog("correction");
                }}
              >
                {tr("Problem var? Düzəliş müraciəti göndər")}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: "request";
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        {icon ? (
          <ClipboardList size={25} strokeWidth={1.5} />
        ) : (
          <Clock3 size={25} strokeWidth={1.5} />
        )}
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
function HistoryTable({
  rows,
  branches,
}: {
  rows: Attendance[];
  branches: { id: string; name: string }[];
}) {
  if (!rows.length)
    return (
      <EmptyState
        title={tr("İlk qeydinizlə başlayır")}
        description="Giriş və çıxış etdikcə davamiyyətiniz burada görünəcək."
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{tr("Tarix / filial")}</th>
            <th>{tr("Giriş")}</th>
            <th>{tr("Çıxış")}</th>
            <th>{tr("Vəziyyət")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>{date(a.check_in)}</strong>
                <small>
                  {branches.find((b) => b.id === a.branch_id)?.name || "Filial"}
                </small>
              </td>
              <td>
                <span className="table-time">
                  <ArrowDownLeft size={14} />
                  {time(a.check_in)}
                </span>
              </td>
              <td>
                <span className="table-time checkout">
                  <ArrowUpRight size={14} />
                  {a.check_out ? time(a.check_out) : "—"}
                </span>
              </td>
              <td>
                <span
                  className={`badge ${a.check_out ? "approved" : "pending"}`}
                >
                  {a.check_out ? tr("Tamamlanıb") : tr("İşdə")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
