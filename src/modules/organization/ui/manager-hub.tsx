"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  LayoutDashboard,
  Plus,
  ReceiptText,
  Settings,
  UsersRound,
} from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { Modal } from "@/shared/ui/modal";
import { api } from "@/shared/client/api";
import { SubscriptionPanel } from "./subscription-panel";
import { DEMO_MANAGER_DATA } from "./demo-data";
import { DemoTourGuide } from "./demo-tour-guide";
import type { ManagerHubData, SalaryAdvance } from "@/shared/types";
import { date, formatMoney, time } from "@/shared/i18n/az";

const modules = [
  ["overview", "İcmal", LayoutDashboard, "Bu günün iş axını"],
  ["team", "İşçilər", UsersRound, "Heyət, rol və filiallar"],
  ["schedule", "Növbələr", CalendarDays, "Qrafik və növbələr"],
  ["requests", "Müraciətlər", ClipboardList, "İcazə və düzəliş qərarları"],
  ["payroll", "Hesablaşma", ReceiptText, "Maaş, avans və yekun hesab"],
  ["tasks", "Tapşırıqlar", CheckCircle2, "Gündəlik işlər və nəticələr"],
  ["reports", "Hesabatlar", BarChart3, "Filial və davamiyyət göstəriciləri"],
  ["plan", "Abunə", CreditCard, "Paket və istifadə limitləri"],
] as const;

export function ManagerHub({ demo = false }: { demo?: boolean }) {
  const [isDemo, setIsDemo] = useState(demo);
  const [data, setData] = useState<ManagerHubData | null>(demo ? DEMO_MANAGER_DATA : null);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState("");
  const [active, setActive] = useState<(typeof modules)[number][0]>("overview");

  // Modal dialog states
  const [modal, setModal] = useState<
    "addEmployee" | "addBranch" | "addShift" | "addAdvance" | "decision" | null
  >(null);
  const [decisionTarget, setDecisionTarget] = useState<{
    type: "leave" | "correction";
    id: string;
    decision: "approved" | "rejected";
    title: string;
  } | null>(null);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    demo ? DEMO_MANAGER_DATA.team[0]?.id || "" : ""
  );

  async function loadData(signal?: AbortSignal) {
    if (isDemo) return;
    try {
      const res = await api<ManagerHubData>("/api/rehber", { signal });
      if (signal?.aborted) return;
      setData(res);
      setError("");
      if (res.team.length > 0 && !selectedMemberId) {
        setSelectedMemberId(res.team[0].id);
      }
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setData(DEMO_MANAGER_DATA);
      setIsDemo(true);
      setError("");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (isDemo) {
      setData(DEMO_MANAGER_DATA);
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    api<ManagerHubData>("/api/rehber", undefined, controller.signal)
      .then((res) => {
        if (!active) return;
        setData(res);
        setLoading(false);
        setError("");
        if (res.team.length > 0) {
          setSelectedMemberId((prev) => prev || res.team[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setData(DEMO_MANAGER_DATA);
        setIsDemo(true);
        setError("");
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isDemo]);

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setActionError("");
    const form = new FormData(e.currentTarget);

    if (isDemo) {
      const newMember = {
        id: `demo-m-${Date.now()}`,
        company_id: data?.company.id || "demo-comp-1",
        user_id: `demo-u-${Date.now()}`,
        display_name: (form.get("displayName") as string) || "Yeni İşçi",
        role: (form.get("role") as any) || "employee",
        archived_at: null,
      };
      setData((prev) =>
        prev
          ? {
              ...prev,
              team: [...prev.team, newMember],
              employmentTerms: [
                ...prev.employmentTerms,
                {
                  id: `et-${Date.now()}`,
                  company_id: prev.company.id,
                  membership_id: newMember.id,
                  started_on: new Date().toISOString().slice(0, 10),
                  pay_type: (form.get("payType") as any) || "monthly",
                  base_pay_qepik: Math.round(
                    parseFloat((form.get("basePayAZN") as string) || "0") * 100
                  ),
                  payday_day: parseInt((form.get("paydayDay") as string) || "5", 10),
                },
              ],
              branchAssignments: [
                ...prev.branchAssignments,
                {
                  membership_id: newMember.id,
                  branch_id:
                    (form.get("branchId") as string) || prev.branches[0]?.id || "",
                  company_id: prev.company.id,
                },
              ],
            }
          : null
      );
      setModal(null);
      setBusy(false);
      return;
    }

    try {
      await api("/api/rehber", {
        action: "add_employee",
        displayName: form.get("displayName"),
        email: form.get("email"),
        role: form.get("role"),
        branchId: form.get("branchId"),
        payType: form.get("payType"),
        basePayQepik: Math.round(parseFloat(form.get("basePayAZN") as string || "0") * 100),
        paydayDay: parseInt(form.get("paydayDay") as string || "5", 10),
      });
      setModal(null);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Xəta baş verdi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddBranch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setActionError("");
    const form = new FormData(e.currentTarget);

    if (isDemo) {
      const newBranch = {
        id: `demo-b-${Date.now()}`,
        company_id: data?.company.id || "demo-comp-1",
        name: (form.get("name") as string) || "Yeni Filial",
        latitude: parseFloat((form.get("latitude") as string) || "40.3756"),
        longitude: parseFloat((form.get("longitude") as string) || "49.8465"),
        radius_m: parseInt((form.get("radiusM") as string) || "100", 10),
      };
      setData((prev) =>
        prev ? { ...prev, branches: [...prev.branches, newBranch] } : null
      );
      setModal(null);
      setBusy(false);
      return;
    }

    try {
      await api("/api/rehber", {
        action: "add_branch",
        name: form.get("name"),
        latitude: parseFloat(form.get("latitude") as string || "40.3756"),
        longitude: parseFloat(form.get("longitude") as string || "49.8465"),
        radiusM: parseInt(form.get("radiusM") as string || "100", 10),
      });
      setModal(null);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Xəta baş verdi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setActionError("");
    const form = new FormData(e.currentTarget);

    if (isDemo) {
      const newShift = {
        id: `demo-s-${Date.now()}`,
        company_id: data?.company.id || "demo-comp-1",
        membership_id:
          (form.get("membershipId") as string) || data?.team[0]?.id || "",
        branch_id: (form.get("branchId") as string) || data?.branches[0]?.id || "",
        starts_at: (form.get("startsAt") as string) || new Date().toISOString(),
        ends_at:
          (form.get("endsAt") as string) ||
          new Date(Date.now() + 8 * 3600000).toISOString(),
      };
      setData((prev) =>
        prev ? { ...prev, shifts: [...prev.shifts, newShift] } : null
      );
      setModal(null);
      setBusy(false);
      return;
    }

    try {
      const startVal = form.get("startsAt") as string;
      const endVal = form.get("endsAt") as string;
      await api("/api/rehber", {
        action: "add_shift",
        membershipId: form.get("membershipId"),
        branchId: form.get("branchId"),
        startsAt: new Date(startVal).toISOString(),
        endsAt: new Date(endVal).toISOString(),
      });
      setModal(null);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Növbə əlavə edilmədi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddAdvance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setActionError("");
    const form = new FormData(e.currentTarget);

    if (isDemo) {
      const amount = parseFloat((form.get("amountAZN") as string) || "0");
      const newAdv: SalaryAdvance = {
        id: `demo-adv-${Date.now()}`,
        company_id: data?.company.id || "demo-comp-1",
        membership_id:
          (form.get("membershipId") as string) || data?.team[0]?.id || "",
        amount_qepik: Math.round(amount * 100),
        recorded_by: data?.member.id || "demo-m-owner",
        note: (form.get("note") as string) || "Avans ödənişi",
        issued_on:
          (form.get("date") as string) || new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      };
      setData((prev) =>
        prev ? { ...prev, advances: [newAdv, ...prev.advances] } : null
      );
      setModal(null);
      setBusy(false);
      return;
    }

    try {
      const amount = parseFloat(form.get("amountAZN") as string || "0");
      await api("/api/payroll", {
        membershipId: form.get("membershipId"),
        amountQepik: Math.round(amount * 100),
        note: form.get("note") || "Avans ödənişi",
        date: form.get("date") || new Date().toISOString().slice(0, 10),
      });
      setModal(null);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Xəta baş verdi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleCloseMonth(memberId: string) {
    setBusy(true);

    if (isDemo) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              payrollPeriods: prev.payrollPeriods.map((p) =>
                p.membership_id === memberId
                  ? {
                      ...p,
                      status: p.status === "closed" ? "draft" : "closed",
                      closed_at: p.status === "closed" ? null : new Date().toISOString(),
                    }
                  : p
              ),
            }
          : null
      );
      setBusy(false);
      return;
    }

    const month = new Date().toISOString().slice(0, 7);
    try {
      await api("/api/payroll", {
        membershipId: memberId,
        periodMonth: month,
        overtimeQepik: 0,
      });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDecisionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!decisionTarget) return;
    setBusy(true);
    setActionError("");
    const form = new FormData(e.currentTarget);
    const reason = (form.get("reason") as string)?.trim() || "";

    if (reason.length < 3) {
      setActionError("Qərar səbəbi ən azı 3 simvol olmalıdır.");
      setBusy(false);
      return;
    }

    if (isDemo) {
      if (decisionTarget.type === "leave") {
        setData((prev) =>
          prev
            ? {
                ...prev,
                leaveRequests: prev.leaveRequests.map((lr) =>
                  lr.id === decisionTarget.id
                    ? {
                        ...lr,
                        status: decisionTarget.decision,
                        decision_reason: reason,
                      }
                    : lr
                ),
              }
            : null
        );
      } else {
        setData((prev) =>
          prev
            ? {
                ...prev,
                corrections: prev.corrections.map((cr) =>
                  cr.id === decisionTarget.id
                    ? {
                        ...cr,
                        status: decisionTarget.decision,
                        decision_reason: reason,
                      }
                    : cr
                ),
              }
            : null
        );
      }
      setModal(null);
      setDecisionTarget(null);
      setBusy(false);
      return;
    }

    try {
      if (decisionTarget.type === "leave") {
        await api("/api/leave-requests", {
          requestId: decisionTarget.id,
          decision: decisionTarget.decision,
          reason,
        });
      } else {
        await api("/api/corrections", {
          correctionId: decisionTarget.id,
          decision: decisionTarget.decision,
          reason,
        });
      }
      setModal(null);
      setDecisionTarget(null);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Qərar saxlanılmadı.");
    } finally {
      setBusy(false);
    }
  }

  const current = modules.find(([id]) => id === active)!;
  const companyName = data?.company.name || "Panelim Biznes";
  const primaryBranch = data?.branches[0]?.name || "Baş Filial";
  const managerName = data?.member.display_name || "Rəhbər";

  return (
    <div className="hub-shell">
      <aside className="hub-sidebar">
        <Link className="brand-link" href="/">
          <Brand />
        </Link>
        <p>ŞİRKƏT KABİNETİ</p>
        <nav aria-label="Rəhbər naviqasiyası">
          {modules.map(([id, label, ItemIcon]) => (
            <button
              key={id}
              className={active === id ? "hub-nav active" : "hub-nav"}
              onClick={() => setActive(id)}
            >
              <ItemIcon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <Link className="hub-nav" href="/giris">
          <Settings size={19} />
          <span>Hesabdan çıx</span>
        </Link>
      </aside>

      <main className="hub-main">
        <header className="hub-top">
          <div>
            <small>
              {companyName.toUpperCase()} · {primaryBranch.toUpperCase()}
            </small>
            <h1>{current[1]}</h1>
          </div>
          <div className="hub-profile">
            <span className="hub-profile-avatar">
              {managerName.charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>{managerName}</strong>
              <small>
                {data?.member.role === "owner"
                  ? "Şirkət Sahibi"
                  : "Filial Rəhbəri"}
              </small>
            </span>
          </div>
        </header>

        {isDemo && (
          <div className="demo-header-banner">
            <div className="demo-header-info">
              <span className="demo-header-badge">RƏHBƏR DEMO</span>
              <p>Canlı nümunə məlumatlar: işçilər, növbələr və daxili maaş aktivdir.</p>
            </div>
            <div className="demo-header-actions">
              <Link href="/demo/isci" className="demo-switch-link">
                İşçi kabinetinə bax ➔
              </Link>
              <Link href="/qeydiyyat" className="button primary compact">
                Ödənişsiz başla
              </Link>
            </div>
          </div>
        )}

        {active === "plan" ? (
          <SubscriptionPanel demo={isDemo} />
        ) : loading ? (
          <div className="hub-data-panel">Məlumatlar yüklənir…</div>
        ) : error ? (
          <div className="hub-demo-note" style={{ background: "#fdf2e9", color: "#a04000", borderColor: "#f5cba7", padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bell size={16} />
              <span>{error}</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="button primary compact"
                onClick={() => {
                  setData(DEMO_MANAGER_DATA);
                  setIsDemo(true);
                  setError("");
                }}
              >
                İnteraktiv Demo Rejiminə Keç
              </button>
              <Link href="/giris" className="button secondary compact">
                Daxil ol
              </Link>
            </div>
          </div>
        ) : !data ? null : (
          <>
            {active === "overview" && (
              <Overview data={data} onSelect={setActive} />
            )}

            {active === "team" && (
              <TeamPanel
                data={data}
                onOpenAddEmployee={() => {
                  setActionError("");
                  setModal("addEmployee");
                }}
                onOpenAddBranch={() => {
                  setActionError("");
                  setModal("addBranch");
                }}
              />
            )}

            {active === "schedule" && (
              <SchedulePanel
                data={data}
                onOpenAddShift={() => {
                  setActionError("");
                  setModal("addShift");
                }}
              />
            )}

            {active === "requests" && (
              <RequestsPanel
                data={data}
                onDecide={(type, id, dec, title) => {
                  setActionError("");
                  setDecisionTarget({ type, id, decision: dec, title });
                  setModal("decision");
                }}
              />
            )}

            {active === "payroll" && (
              <PayrollPanel
                data={data}
                selectedMemberId={selectedMemberId || data.team[0]?.id || ""}
                onSelectMember={setSelectedMemberId}
                onOpenAdvance={() => {
                  setActionError("");
                  setModal("addAdvance");
                }}
                onToggleCloseMonth={handleToggleCloseMonth}
              />
            )}

            {active === "tasks" && <TasksSample />}
            {active === "reports" && <ReportsPanel data={data} />}
          </>
        )}
      </main>

      {/* MODAL: Add Employee */}
      {modal === "addEmployee" && data && (
        <Modal title="Yeni İşçi Əlavə Et" onClose={() => setModal(null)}>
          <form className="stack" onSubmit={handleAddEmployee} style={{ padding: 20 }}>
            <label className="field">
              Ad və Soyad
              <input name="displayName" type="text" required placeholder="Aylin Məmmədova" maxLength={100} />
            </label>
            <label className="field">
              Rəsmi E-poçt
              <input name="email" type="email" required placeholder="aylin@biznes.az" maxLength={254} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="field">
                Vəzifə / Rol
                <select name="role" defaultValue="employee">
                  <option value="employee">İşçi</option>
                  <option value="manager">Filial Rəhbəri</option>
                  <option value="accountant">Mühasib</option>
                </select>
              </label>
              <label className="field">
                Təyin olunan filial
                <select name="branchId" defaultValue={data.branches[0]?.id}>
                  {data.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <label className="field">
                Maaş növü
                <select name="payType" defaultValue="monthly">
                  <option value="monthly">Aylıq</option>
                  <option value="hourly">Saatlıq</option>
                </select>
              </label>
              <label className="field">
                Məbləğ (AZN)
                <input name="basePayAZN" type="number" step="0.01" min="0" required defaultValue="850" />
              </label>
              <label className="field">
                Maaş günü
                <input name="paydayDay" type="number" min="1" max="31" defaultValue="5" />
              </label>
            </div>
            {actionError && <p className="form-error">{actionError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="button secondary" onClick={() => setModal(null)}>İmtina</button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Yadda saxlanılır…" : "İşçini təsdiqlə"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Branch */}
      {modal === "addBranch" && (
        <Modal title="Yeni Filial Yarat" onClose={() => setModal(null)}>
          <form className="stack" onSubmit={handleAddBranch} style={{ padding: 20 }}>
            <label className="field">
              Filialın adı
              <input name="name" type="text" required placeholder="Məsələn: Sahil filialı" maxLength={120} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <label className="field">
                En dairəsi (Latitude)
                <input name="latitude" type="number" step="0.0001" defaultValue="40.3756" required />
              </label>
              <label className="field">
                Uzunluq (Longitude)
                <input name="longitude" type="number" step="0.0001" defaultValue="49.8465" required />
              </label>
              <label className="field">
                Radius (metr)
                <input name="radiusM" type="number" min="20" max="500" defaultValue="100" required />
              </label>
            </div>
            {actionError && <p className="form-error">{actionError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="button secondary" onClick={() => setModal(null)}>İmtina</button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Yaradılır…" : "Filialı yarat"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Shift */}
      {modal === "addShift" && data && (
        <Modal title="Yeni Növbə Təyin Et" onClose={() => setModal(null)}>
          <form className="stack" onSubmit={handleAddShift} style={{ padding: 20 }}>
            <label className="field">
              İşçi seçimi
              <select name="membershipId" defaultValue={data.team[0]?.id}>
                {data.team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({m.role})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Filial seçimi
              <select name="branchId" defaultValue={data.branches[0]?.id}>
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="field">
                Başlama vaxtı
                <input name="startsAt" type="datetime-local" required />
              </label>
              <label className="field">
                Bitmə vaxtı
                <input
                  name="endsAt"
                  type="datetime-local"
                  required
                />
              </label>
            </div>
            {actionError && <p className="form-error">{actionError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="button secondary" onClick={() => setModal(null)}>İmtina</button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Təyin edilir…" : "Növbəni təsdiqlə"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Advance */}
      {modal === "addAdvance" && data && (
        <Modal title="Yeni Avans Ödənişi" onClose={() => setModal(null)}>
          <form className="stack" onSubmit={handleAddAdvance} style={{ padding: 20 }}>
            <label className="field">
              İşçi seçimi
              <select name="membershipId" defaultValue={selectedMemberId || data.team[0]?.id}>
                {data.team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="field">
                Məbləğ (AZN)
                <input name="amountAZN" type="number" step="0.01" min="1" max="10000" required placeholder="50.00" />
              </label>
              <label className="field">
                Tarix
                <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
            </div>
            <label className="field">
              Qeyd və ya səbəb
              <input name="note" type="text" placeholder="Məs. Məişət xərcləri üçün avans" maxLength={200} />
            </label>
            {actionError && <p className="form-error">{actionError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="button secondary" onClick={() => setModal(null)}>İmtina</button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Ödənilir…" : "Avansı təsdiqlə"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Decision for Requests */}
      {modal === "decision" && decisionTarget && (
        <Modal title={decisionTarget.title} onClose={() => setModal(null)}>
          <form className="stack" onSubmit={handleDecisionSubmit} style={{ padding: 20 }}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#536869" }}>
              Qərar: <strong>{decisionTarget.decision === "approved" ? "Təsdiqlə" : "Rədd et"}</strong>
            </p>
            <label className="field" style={{ marginTop: 12 }}>
              Qərar səbəbi (mütləq qeyd edilməlidir, ən azı 3 simvol)
              <textarea
                name="reason"
                required
                rows={3}
                minLength={3}
                maxLength={500}
                placeholder="Məsələn: İş qrafikinə uyğundur və ya Əvəzləyici işçi olmadığı üçün"
              />
            </label>
            {actionError && <p className="form-error">{actionError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="button secondary" onClick={() => setModal(null)}>İmtina</button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Yadda saxlanılır…" : "Qərarı təsdiq et"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isDemo && <DemoTourGuide onSelectModule={setActive} />}
    </div>
  );
}

// 1. Overview Panel
function Overview({
  data,
  onSelect,
}: {
  data: ManagerHubData;
  onSelect: (v: (typeof modules)[number][0]) => void;
}) {
  const activeWorkers = (data.team || []).filter((m) => !m.plan_disabled_at).length;
  const inWorkCount = (data.todayAttendance || []).filter((a) => !a.check_out).length;
  const pendingRequests =
    (data.leaveRequests || []).filter((l) => l.status === "pending").length +
    (data.corrections || []).filter((c) => c.status === "pending").length;

  const totalBasePayQepik = (data.employmentTerms || []).reduce(
    (sum, t) => sum + (t.pay_type === "monthly" ? t.base_pay_qepik : 0),
    0,
  );

  return (
    <>
      <section className="hub-hero">
        <div>
          <p>{date(new Date().toISOString())} · İş günü</p>
          <h2>Salam, {data.member.display_name}. Şirkətinizin cari fəaliyyəti:</h2>
          <span>
            {data.company.name} üzrə {data.branches.length} filial və {activeWorkers} aktiv işçi qeydiyyatdadır.
          </span>
        </div>
        <Building2 size={52} />
      </section>

      <section className="hub-metrics">
        <article>
          <small>AKTİV İŞÇİLƏR</small>
          <strong>{activeWorkers}</strong>
          <span>heyət qeydiyyatda</span>
        </article>
        <article>
          <small>HAZIRDA İŞDƏDİR</small>
          <strong>{inWorkCount}</strong>
          <span>açıq giriş qeydi</span>
        </article>
        <article>
          <small>GÖZLƏYƏN MÜRACİƏTLƏR</small>
          <strong>{pendingRequests}</strong>
          <span>qərar gözləyən sorğu</span>
        </article>
        <article>
          <small>BU AYIN ƏSAS MAAŞ CƏMİ</small>
          <strong>{formatMoney(totalBasePayQepik)}</strong>
          <span>sabit tarif cəmi</span>
        </article>
      </section>

      <section className="hub-actions">
        {modules.slice(1, 5).map(([id, label, ItemIcon, description]) => (
          <button key={id} onClick={() => onSelect(id)}>
            <span>
              <ItemIcon size={19} />
            </span>
            <strong>{label}</strong>
            <small>{description}</small>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </section>

      <section className="hub-data-panel" style={{ marginTop: 20 }}>
        <div className="hub-panel-title">
          <div>
            <small>CANLI DAVAMİYYƏT</small>
            <h2>Hazırda İşdə Olan Heyət</h2>
          </div>
          <span className="hub-count">{inWorkCount} nəfər</span>
        </div>
        {inWorkCount === 0 ? (
          <p style={{ color: "#738182", padding: "16px 0", fontSize: "0.9rem" }}>
            Hazırda filialda açıq giriş qeydi olan işçi yoxdur.
          </p>
        ) : (
          (data.todayAttendance || [])
            .filter((a) => !a.check_out)
            .map((att) => {
              const worker = (data.team || []).find((m) => m.id === att.membership_id);
              const branch = (data.branches || []).find((b) => b.id === att.branch_id);
              return (
                <div key={att.id} className="hub-worker-row">
                  <div>
                    <span className="hub-profile-avatar">
                      {worker?.display_name.charAt(0).toUpperCase() || "İ"}
                    </span>
                    <div>
                      <strong>{worker?.display_name || "İşçi"}</strong>
                      <small>
                        {branch?.name || "Filial"} · Giriş: {time(att.check_in)}
                      </small>
                    </div>
                  </div>
                  <span className="hub-presence">
                    <i /> İşdədir
                  </span>
                </div>
              );
            })
        )}
      </section>
    </>
  );
}

// 2. Team & Branch Panel
function TeamPanel({
  data,
  onOpenAddEmployee,
  onOpenAddBranch,
}: {
  data: ManagerHubData;
  onOpenAddEmployee: () => void;
  onOpenAddBranch: () => void;
}) {
  return (
    <>
      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div>
            <small>{data.company.name.toUpperCase()} · HEYƏT SİYAHISI</small>
            <h2>İşçilər ({data.team.length})</h2>
          </div>
          <button className="button primary compact" onClick={onOpenAddEmployee}>
            <Plus size={16} /> İşçi əlavə et
          </button>
        </div>

        {data.team.length === 0 ? (
          <p style={{ padding: "16px 0", color: "#738182" }}>Hələ heç bir işçi əlavə edilməyib.</p>
        ) : (
          data.team.map((member) => {
            const assignment = data.branchAssignments.find((a) => a.membership_id === member.id);
            const branch = data.branches.find((b) => b.id === assignment?.branch_id);
            const term = data.employmentTerms.find((t) => t.membership_id === member.id);

            return (
              <div key={member.id} className="hub-team-row">
                <span className="hub-profile-avatar">
                  {member.display_name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>{member.display_name}</strong>
                  <small>
                    Rol: {member.role === "owner" ? "Sahib" : member.role === "manager" ? "Filial Rəhbəri" : member.role === "accountant" ? "Mühasib" : "İşçi"}
                    {branch ? ` · ${branch.name}` : ""}
                    {term?.started_on ? ` · Başlama: ${term.started_on}` : ""}
                  </small>
                </div>
                <span>
                  {term ? `${formatMoney(term.base_pay_qepik)} / ${term.pay_type === "monthly" ? "ay" : "saat"}` : "Tarif yoxdur"}
                </span>
                <b className={member.plan_disabled_at ? "hub-pending" : "hub-presence"}>
                  <i /> {member.plan_disabled_at ? "Paket limiti" : "Aktiv"}
                </b>
              </div>
            );
          })
        )}
      </section>

      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div>
            <small>FİLİALLAR VƏ MƏKAN TƏNZİMLƏMƏLƏRİ</small>
            <h2>Filiallar ({data.branches.length})</h2>
          </div>
          {data.member.role === "owner" && (
            <button className="button secondary compact" onClick={onOpenAddBranch}>
              <Plus size={16} /> Filial əlavə et
            </button>
          )}
        </div>
        {data.branches.map((b) => {
          const assignedCount = data.branchAssignments.filter((a) => a.branch_id === b.id).length;
          return (
            <div key={b.id} className="hub-team-row">
              <div>
                <strong>{b.name}</strong>
                <small>
                  Radius: {b.radius_m} m · Koordinat: {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
                </small>
              </div>
              <span>{assignedCount} işçi təyin edilib</span>
              <b className={b.plan_disabled_at ? "hub-pending" : "hub-presence"}>
                <i /> {b.plan_disabled_at ? "Dayandırılıb" : "Aktiv"}
              </b>
            </div>
          );
        })}
      </section>
    </>
  );
}

// 3. Schedule Panel
function SchedulePanel({
  data,
  onOpenAddShift,
}: {
  data: ManagerHubData;
  onOpenAddShift: () => void;
}) {
  return (
    <>
      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div>
            <small>NÖVBƏ VƏ İŞ QRAFİKİ</small>
            <h2>Planlaşdırılmış Növbələr ({data.shifts.length})</h2>
          </div>
          <button className="button primary compact" onClick={onOpenAddShift}>
            <Plus size={16} /> Növbə əlavə et
          </button>
        </div>

        {data.shifts.length === 0 ? (
          <p style={{ padding: "16px 0", color: "#738182" }}>
            Hələ heç bir növbə təyin edilməyib. Yeni növbə əlavə edin.
          </p>
        ) : (
          data.shifts.map((shift) => {
            const worker = data.team.find((m) => m.id === shift.membership_id);
            const branch = data.branches.find((b) => b.id === shift.branch_id);
            return (
              <div key={shift.id} className="hub-team-row">
                <span className="hub-profile-avatar">
                  {worker?.display_name.charAt(0).toUpperCase() || "N"}
                </span>
                <div>
                  <strong>{worker?.display_name || "İşçi"}</strong>
                  <small>
                    {branch?.name || "Filial"} · {date(shift.starts_at)} {time(shift.starts_at)} – {time(shift.ends_at)}
                  </small>
                </div>
                <span>Təyin edilib</span>
                <b className="hub-presence">
                  <i /> Planlaşdırılıb
                </b>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}

// 4. Requests Panel
function RequestsPanel({
  data,
  onDecide,
}: {
  data: ManagerHubData;
  onDecide: (type: "leave" | "correction", id: string, dec: "approved" | "rejected", title: string) => void;
}) {
  const pendingLeaves = data.leaveRequests.filter((l) => l.status === "pending");
  const pendingCorrections = data.corrections.filter((c) => c.status === "pending");
  const totalPending = pendingLeaves.length + pendingCorrections.length;

  return (
    <>
      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div>
            <small>GÖZLƏYƏN MÜRACİƏTLƏR</small>
            <h2>Təsdiq Gözləyən Sorğular</h2>
          </div>
          <span className="hub-count">{totalPending} gözləyir</span>
        </div>

        {totalPending === 0 ? (
          <p style={{ padding: "16px 0", color: "#738182" }}>
            Hal-hazırda gözləyən müraciət yoxdur. Bütün müraciətlər cavablandırılıb.
          </p>
        ) : (
          <>
            {pendingLeaves.map((lr) => {
              const worker = data.team.find((m) => m.id === lr.membership_id);
              const typeLabel = lr.request_type === "permission" ? "İcazə" : "Məzuniyyət";
              return (
                <article key={lr.id} className="hub-request" style={{ borderBottom: "1px solid #f0f4f4", paddingBottom: 14 }}>
                  <span className="hub-profile-avatar">
                    {worker?.display_name.charAt(0).toUpperCase() || "M"}
                  </span>
                  <div>
                    <strong>{worker?.display_name || "İşçi"} · {typeLabel}</strong>
                    <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>
                      Tarix aralığı: {lr.starts_on} — {lr.ends_on}
                    </p>
                    <small>Səbəb: {lr.reason}</small>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="button primary compact"
                      onClick={() => onDecide("leave", lr.id, "approved", `${worker?.display_name} — ${typeLabel} təsdiqi`)}
                    >
                      Təsdiqlə
                    </button>
                    <button
                      className="button secondary compact"
                      onClick={() => onDecide("leave", lr.id, "rejected", `${worker?.display_name} — ${typeLabel} rədd edilməsi`)}
                    >
                      Rədd et
                    </button>
                  </div>
                </article>
              );
            })}

            {pendingCorrections.map((cor) => {
              const worker = data.team.find((m) => m.id === cor.membership_id);
              return (
                <article key={cor.id} className="hub-request" style={{ borderBottom: "1px solid #f0f4f4", paddingBottom: 14 }}>
                  <span className="hub-profile-avatar">
                    {worker?.display_name.charAt(0).toUpperCase() || "D"}
                  </span>
                  <div>
                    <strong>{worker?.display_name || "İşçi"} · Davamiyyət Düzəlişi</strong>
                    <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>
                      Giriş: {time(cor.requested_in)} {cor.requested_out ? `· Çıxış: ${time(cor.requested_out)}` : ""}
                    </p>
                    <small>Səbəb: {cor.reason}</small>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="button primary compact"
                      onClick={() => onDecide("correction", cor.id, "approved", `${worker?.display_name} — Düzəliş təsdiqi`)}
                    >
                      Təsdiqlə
                    </button>
                    <button
                      className="button secondary compact"
                      onClick={() => onDecide("correction", cor.id, "rejected", `${worker?.display_name} — Düzəliş rədd edilməsi`)}
                    >
                      Rədd et
                    </button>
                  </div>
                </article>
              );
            })}
          </>
        )}
      </section>
    </>
  );
}

// 5. Payroll Panel
function PayrollPanel({
  data,
  selectedMemberId,
  onSelectMember,
  onOpenAdvance,
  onToggleCloseMonth,
}: {
  data: ManagerHubData;
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  onOpenAdvance: () => void;
  onToggleCloseMonth: (memberId: string) => void;
}) {
  const currentMember = data.team.find((m) => m.id === selectedMemberId) || data.team[0];
  const terms = data.employmentTerms.find((t) => t.membership_id === currentMember?.id);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const memberAdvances = data.advances.filter(
    (a) => a.membership_id === currentMember?.id && a.issued_on.startsWith(currentMonth),
  );
  const totalAdvancesQepik = memberAdvances.reduce((sum, a) => sum + a.amount_qepik, 0);

  const closedPeriod = data.payrollPeriods.find(
    (p) => p.membership_id === currentMember?.id && p.period_month === currentMonth,
  );
  const isClosed = Boolean(closedPeriod);

  const basePayQepik = terms ? terms.base_pay_qepik : 0;
  const netPayQepik = Math.max(0, basePayQepik - totalAdvancesQepik);

  return (
    <>
      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <small>HESABLAŞMA AYI · {currentMonth.toUpperCase()}</small>
              <h2>{currentMember?.display_name || "İşçi seçin"}</h2>
            </div>
            {data.team.length > 1 && (
              <select
                value={selectedMemberId}
                onChange={(e) => onSelectMember(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #dfe6e4" }}
              >
                {data.team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <span className={isClosed ? "hub-presence" : "hub-pending"}>
            <i /> {isClosed ? "Ay bağlanıb" : "Cari hesab"}
          </span>
        </div>

        <div className="hub-metrics" style={{ marginTop: 16 }}>
          <article>
            <small>ƏSAS MAAŞ</small>
            <strong>{formatMoney(basePayQepik)}</strong>
            <span>{terms?.pay_type === "monthly" ? "Aylıq sabit" : "Saatlıq"}</span>
          </article>
          <article>
            <small>BU AYIN AVANSLARI</small>
            <strong style={{ color: "#c0392b" }}>-{formatMoney(totalAdvancesQepik)}</strong>
            <span>{memberAdvances.length} ödəniş</span>
          </article>
          <article style={{ background: "#edf7f3", borderColor: "#c3e6dc" }}>
            <small style={{ color: "#173d40" }}>YEKUN ÖDƏNİLƏCƏK</small>
            <strong style={{ color: "#173d40" }}>{formatMoney(netPayQepik)}</strong>
            <span>Maaş günü: hər ayın {terms?.payday_day || 5}-i</span>
          </article>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="button primary compact" onClick={onOpenAdvance} disabled={isClosed}>
            + Avans ver
          </button>
          <button
            className="button secondary compact"
            onClick={() => onToggleCloseMonth(currentMember?.id || "")}
          >
            {isClosed ? "Hesabı yenidən aç" : `${currentMonth} ayını bağla`}
          </button>
        </div>
      </section>

      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div>
            <small>BU AYIN AVANS TARİXÇƏSİ</small>
            <h2>Verilmiş Avanslar ({memberAdvances.length})</h2>
          </div>
        </div>
        {memberAdvances.length === 0 ? (
          <p style={{ padding: "16px 0", color: "#738182" }}>Bu ay üçün heç bir avans verilməyib.</p>
        ) : (
          memberAdvances.map((adv) => (
            <div key={adv.id} className="hub-team-row">
              <div>
                <strong>{formatMoney(adv.amount_qepik)} avans</strong>
                <small>Tarix: {adv.issued_on} · Qeyd: {adv.note || "Qeyd yoxdur"}</small>
              </div>
              <span style={{ color: "#c0392b", fontWeight: 700 }}>-{formatMoney(adv.amount_qepik)}</span>
            </div>
          ))
        )}
      </section>
    </>
  );
}

// 6. Reports Panel
function ReportsPanel({ data }: { data: ManagerHubData }) {
  return (
    <>
      <section className="hub-metrics">
        <article>
          <small>ÜMUMİ FİLİAL SAYI</small>
          <strong>{data.branches.length}</strong>
          <span>qeydiyyatda</span>
        </article>
        <article>
          <small>ÜMUMİ HEYƏT</small>
          <strong>{data.team.length}</strong>
          <span>bütün vəzifələr</span>
        </article>
        <article>
          <small>GÜNLÜK DAVAMİYYƏT</small>
          <strong>{data.todayAttendance.length}</strong>
          <span>bu günün qeydləri</span>
        </article>
        <article>
          <small>PLANLAŞDIRILMIŞ NÖVBƏ</small>
          <strong>{data.shifts.length}</strong>
          <span>aktiv növbə</span>
        </article>
      </section>

      <section className="hub-data-panel" style={{ marginTop: 16 }}>
        <div className="hub-panel-title">
          <div>
            <small>FİLİAL GÖSTƏRİCİLƏRİ</small>
            <h2>Filiallar Üzrə Davamiyyət</h2>
          </div>
          <button className="button secondary compact" title="Davamiyyət hesabatını yüklə">
            <Download size={14} /> Excel çıxarışı
          </button>
        </div>
        {data.branches.map((b) => {
          const assigned = data.branchAssignments.filter((a) => a.branch_id === b.id).length;
          const todayBranchAtt = data.todayAttendance.filter((a) => a.branch_id === b.id).length;
          return (
            <div key={b.id} className="hub-team-row">
              <div>
                <strong>{b.name}</strong>
                <small>
                  {assigned} təyin edilmiş işçi · Bu gün {todayBranchAtt} davamiyyət qeydi
                </small>
              </div>
              <span>Radius: {b.radius_m} m</span>
              <b className="hub-presence">
                <i /> Aktiv
              </b>
            </div>
          );
        })}
      </section>
    </>
  );
}

// 7. Interactive Tasks Sample
function TasksSample() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Kassa açılışı və ilkin çek hesabatı", assignee: "Növbətçi", done: true, due: "09:15" },
    { id: 2, title: "Vitrin və soyuducu dərəcələrinin qeydi", assignee: "Barista", done: true, due: "10:00" },
    { id: 3, title: "Tədarükçüdən süd və qəhvə dənələrinin qəbulu", assignee: "Növbətçi", done: false, due: "15:30" },
    { id: 4, title: "Axşam kassa bağlama və Z-hesabat", assignee: "Rəhbər", done: false, due: "18:00" },
  ]);

  const toggle = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <section className="hub-data-panel">
      <div className="hub-panel-title">
        <div>
          <small>GÜNDƏLİK VƏZİFƏLƏR</small>
          <h2>Tapşırıqlar</h2>
        </div>
        <span className="hub-count">
          {tasks.filter((t) => t.done).length} / {tasks.length} tamamlanıb
        </span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="hub-team-row"
          style={{ cursor: "pointer" }}
          onClick={() => toggle(task.id)}
        >
          <input
            type="checkbox"
            checked={task.done}
            readOnly
            style={{ width: 18, height: 18, accentColor: "#10b6a7" }}
          />
          <div>
            <strong
              style={{
                textDecoration: task.done ? "line-through" : "none",
                color: task.done ? "#738182" : "inherit",
              }}
            >
              {task.title}
            </strong>
            <small>
              Təyin edilib: {task.assignee} · İcra vaxtı: {task.due}
            </small>
          </div>
          <b className={task.done ? "hub-presence" : "hub-pending"}>
            {task.done ? "Tamamlandı" : "Gözləyir"}
          </b>
        </div>
      ))}
    </section>
  );
}
