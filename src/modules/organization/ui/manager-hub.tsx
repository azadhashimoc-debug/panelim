"use client";
import { useState } from "react";
import Link from "next/link";
import { BarChart3, Building2, CalendarDays, ClipboardList, CreditCard, Download, LayoutDashboard, ReceiptText, Settings, UsersRound, CheckCircle2, ArrowUpRight, Bell } from "lucide-react";
import { Brand } from "@/shared/ui/brand";

const modules = [
  ["overview", "İcmal", LayoutDashboard, "Bu günün iş axını"],
  ["team", "İşçilər", UsersRound, "Heyət, rol və maaş şərtləri"],
  ["schedule", "Növbələr", CalendarDays, "Qrafik və dəyişikliklər"],
  ["requests", "Müraciətlər", ClipboardList, "İcazə, məzuniyyət və düzəlişlər"],
  ["payroll", "Hesablaşma", ReceiptText, "Maaş, avans və əlavə saat"],
  ["tasks", "Tapşırıqlar", CheckCircle2, "Gündəlik işlər və nəticələr"],
  ["reports", "Hesabatlar", BarChart3, "Filial və davamiyyət göstəriciləri"],
  ["plan", "Abunə", CreditCard, "Paket və istifadə limitləri"],
] as const;
export function ManagerHub() {
  const [active, setActive] = useState<(typeof modules)[number][0]>("overview");
  const current = modules.find(([id]) => id === active)!;
  const Icon = current[2];
  return <div className="hub-shell">
    <aside className="hub-sidebar"><Link className="brand-link" href="/"><Brand /></Link><p>ŞİRKƏT KABİNETİ</p>
      <nav aria-label="Rəhbər naviqasiyası">{modules.map(([id, label, ItemIcon]) => <button key={id} className={active === id ? "hub-nav active" : "hub-nav"} onClick={() => setActive(id)}><ItemIcon size={19}/><span>{label}</span></button>)}</nav>
      <button className="hub-nav"><Settings size={19}/><span>Parametrlər</span></button>
    </aside>
    <main className="hub-main"><header className="hub-top"><div><small>NÜMUNƏ KAFE · NİZAMİ FİLİALI</small><h1>{current[1]}</h1></div><div className="hub-profile"><span className="hub-profile-avatar">N</span><span><strong>Nigar Əliyeva</strong><small>Rəhbər · nümunə hesab</small></span></div></header>
      {active === "overview" ? <Overview onSelect={setActive}/> : active === "team" ? <TeamSample/> : active === "schedule" ? <ScheduleSample/> : active === "requests" ? <RequestsSample/> : active === "payroll" ? <PayrollSample/> : active === "tasks" ? <TasksSample/> : active === "reports" ? <ReportsSample/> : active === "plan" ? <PlanSample/> : <ModulePlaceholder icon={<Icon size={25}/>} title={current[1]} description={current[3]}/>}
    </main>
  </div>;
}
function Overview({ onSelect }: { onSelect: (v: (typeof modules)[number][0]) => void }) { return <>
  <div className="hub-demo-note"><Bell size={16}/> Nümunə məlumatlar · Ekrandakı işçi, davamiyyət və maaş göstəriciləri demo üçündür.</div>
  <section className="hub-hero"><div><p>1 noyabr · Bazar günü</p><h2>Salam, Nigar. Filialınızın iş günü belə gedir.</h2><span>Aylin Məmmədovanın davamiyyəti və müraciət vəziyyəti nümunə olaraq göstərilir.</span></div><Building2 size={52}/></section>
  <section className="hub-metrics"><article><small>İŞÇİLƏR</small><strong>1</strong><span>aktiv işçi</span></article><article><small>İŞDƏDİR</small><strong>1</strong><span>Aylin · giriş 09:00</span></article><article><small>GÖZLƏYƏN MÜRACİƏT</small><strong>1</strong><span>icazə sorğusu</span></article><article><small>BU AYIN ƏSAS MAAŞI</small><strong>850 ₼</strong><span>nümunə tarif</span></article></section>
  <section className="hub-actions">{modules.slice(1, 5).map(([id,label,ItemIcon,description]) => <button key={id} onClick={() => onSelect(id)}><span><ItemIcon size={19}/></span><strong>{label}</strong><small>{description}</small><ArrowUpRight size={16}/></button>)}</section>
  <section className="hub-worker-row"><div><span className="hub-profile-avatar">A</span><div><strong>Aylin Məmmədova</strong><small>İşçi · Nizami filialı</small></div></div><span className="hub-presence"><i/> İşdə · 09:00</span><button onClick={() => onSelect("team")}>İşçiyə bax <ArrowUpRight size={15}/></button></section>
</> }
function TeamSample() { return <><div className="hub-demo-note"><Bell size={16}/> Nümunə işçi profili · Bu məlumatlar real işçi hesabına aid deyil.</div><section className="hub-data-panel"><div className="hub-panel-title"><div><small>NÜMUNƏ KAFE · 1 AKTİV İŞÇİ</small><h2>İşçilər</h2></div><button className="button primary compact" disabled title="Demo rejimində hesab yaradılmır">+ İşçi əlavə et</button></div><div className="hub-team-row"><span className="hub-profile-avatar">A</span><div><strong>Aylin Məmmədova</strong><small>İşçi · Nizami filialı · İşə başlama: 14 aprel 2025</small></div><span>850 ₼ / ay</span><b className="hub-presence"><i/> Aktiv</b></div></section><section className="hub-data-panel"><h3>Maaş şərtləri</h3><p>Aylıq əsas maaş: <strong>850,00 ₼</strong></p><p>Maaş günü: <strong>hər ayın 5-i</strong></p><small>Nümunə tarif · dəyişiklik üçün işçi profilini açın</small></section></> }
function ScheduleSample() { return <><div className="hub-demo-note"><Bell size={16}/> Nümunə növbə qrafiki · Qrafik və dəyişikliklər demo rejimindədir.</div><section className="hub-data-panel"><div className="hub-panel-title"><div><small>NİZAMİ FİLİALI · AKTİV NÖVBƏLƏR</small><h2>Növbələr və İş Qrafiki</h2></div><button className="button primary compact" disabled title="Demo rejimində növbə yaradılmır">+ Növbə əlavə et</button></div><div className="hub-team-row"><span className="hub-profile-avatar">A</span><div><strong>Aylin Məmmədova</strong><small>Səhər növbəsi · 09:00–18:00 (1 saat fasilə) · B.e – Cümə</small></div><span>Həftəlik 40 saat</span><b className="hub-presence"><i/> Təyin edilib</b></div></section><section className="hub-data-panel"><h3>Növbə qaydaları</h3><p>Gecəni keçən növbə başladığı günə bağlanır.</p><p>Növbə dəyişikliyi yalnız rəhbər təsdiqindən sonra qüvvəyə minir.</p><small>Dəyişiklik müraciətləri «Müraciətlər» bölməsindən idarə olunur</small></section></> }
function RequestsSample() { return <><div className="hub-demo-note"><Bell size={16}/> Nümunə müraciət · Qərarlar demo rejimində saxlanılmır.</div><section className="hub-data-panel"><div className="hub-panel-title"><div><small>NİZAMİ FİLİALI</small><h2>Gözləyən müraciətlər</h2></div><span className="hub-count">1</span></div><article className="hub-request"><span className="hub-profile-avatar">A</span><div><strong>Aylin Məmmədova · İcazə</strong><p>12 noyabr, 14:00–16:00</p><small>Şəxsi iş üçün 2 saatlıq icazə</small></div><span className="hub-pending">Gözləyir</span></article><div className="hub-decision"><button className="button primary compact" disabled title="Demo rejimində qərar saxlanılmır">Təsdiqlə</button><button className="button secondary compact" disabled title="Demo rejimində qərar saxlanılmır">Rədd et</button><small>Qərar səbəbi tələb olunur</small></div></section></> }
function PayrollSample() {
  const [advances, setAdvances] = useState([
    { id: 1, date: "15 oktyabr", amount: 100, note: "Məişət xərcləri üçün" },
  ]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advAmount, setAdvAmount] = useState("");
  const [advNote, setAdvNote] = useState("");
  const [closed, setClosed] = useState(false);

  const basePay = 850;
  const overtime = 45;
  const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
  const netPay = Math.max(0, basePay + overtime - totalAdvances);

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(advAmount);
    if (!val || val <= 0) return;
    setAdvances([...advances, { id: Date.now(), date: "1 noyabr", amount: val, note: advNote || "Avans ödənişi" }]);
    setShowAdvanceModal(false);
    setAdvAmount("");
    setAdvNote("");
  };

  return (
    <>
      <div className="hub-demo-note"><Bell size={16}/> Nümunə maaş və avans uçotu · AZN qəpik dəqiqliyi ilə daxili hesablaşma.</div>
      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div><small>AYLIQ HESABLAŞMA · NOYABR 2026</small><h2>Aylin Məmmədova</h2></div>
          <span className={closed ? "hub-presence" : "hub-pending"}><i/> {closed ? "Ay bağlanıb" : "Cari hesab"}</span>
        </div>
        <div className="hub-metrics" style={{ marginTop: 16 }}>
          <article><small>ƏSAS MAAŞ</small><strong>{basePay.toFixed(2)} ₼</strong><span>Sabit tarif</span></article>
          <article><small>ƏLAVƏ SAAT (3 S)</small><strong style={{ color: "#236c60" }}>+{overtime.toFixed(2)} ₼</strong><span>Təsdiqlənib</span></article>
          <article><small>AVANSLAR</small><strong style={{ color: "#c0392b" }}>-{totalAdvances.toFixed(2)} ₼</strong><span>{advances.length} ödəniş</span></article>
          <article style={{ background: "#edf7f3", borderColor: "#c3e6dc" }}><small style={{ color: "#173d40" }}>YEKUN ÖDƏNİLƏCƏK</small><strong style={{ color: "#173d40" }}>{netPay.toFixed(2)} ₼</strong><span>Növbəti maaş: 5 noyabr</span></article>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="button primary compact" onClick={() => setShowAdvanceModal(true)} disabled={closed}>+ Avans ver</button>
          <button className="button secondary compact" onClick={() => setClosed(!closed)}>{closed ? "Hesabı yenidən aç" : "Noyabr ayını bağla"}</button>
        </div>
      </section>

      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div><small>BU AYIN ÖDƏNİŞLƏRİ</small><h2>Verilmiş Avanslar</h2></div>
          <span className="hub-count">{advances.length} qeyd</span>
        </div>
        {advances.map((a) => (
          <div key={a.id} className="hub-team-row">
            <div>
              <strong>{a.amount.toFixed(2)} ₼ avans</strong>
              <small>Tarix: {a.date} · Qeyd: {a.note}</small>
            </div>
            <span style={{ color: "#c0392b", fontWeight: 700 }}>-{a.amount.toFixed(2)} ₼</span>
          </div>
        ))}
      </section>

      {showAdvanceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: "min(400px, 100%)", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Yeni Avans Qeydi</h3>
            <form onSubmit={handleAddAdvance} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                Məbləğ (AZN)
                <input type="number" step="0.01" min="1" max="1000" required value={advAmount} onChange={(e) => setAdvAmount(e.target.value)} placeholder="Məs. 50" style={{ padding: 10, border: "1px solid #dfe6e4", borderRadius: 8 }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                Qeyd
                <input type="text" value={advNote} onChange={(e) => setAdvNote(e.target.value)} placeholder="Səbəb və ya qeyd" style={{ padding: 10, border: "1px solid #dfe6e4", borderRadius: 8 }} />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="button secondary compact" onClick={() => setShowAdvanceModal(false)}>İmtina</button>
                <button type="submit" className="button primary compact">Avansı təsdiqlə</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function TasksSample() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Kassa açılışı və ilkin çek hesabatı", assignee: "Aylin Məmmədova", done: true, due: "09:15" },
    { id: 2, title: "Səhər vitrin və soyuducu dərəcələrinin qeydi", assignee: "Aylin Məmmədova", done: true, due: "10:00" },
    { id: 3, title: "Tədarükçüdən süd və qəhvə dənələrinin qəbulu", assignee: "Aylin Məmmədova", done: false, due: "15:30" },
    { id: 4, title: "Axşam kassa bağlama və Z-hesabat", assignee: "Aylin Məmmədova", done: false, due: "18:00" },
  ]);
  const toggle = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };
  return (
    <>
      <div className="hub-demo-note"><Bell size={16}/> Nümunə tapşırıqlar · İşçilərə gündəlik və növbəlik tapşırıq təyinatı.</div>
      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div><small>GÜNDƏLİK VƏZİFƏLƏR · NİZAMİ FİLİALI</small><h2>Tapşırıqlar</h2></div>
          <span className="hub-count">{tasks.filter((t) => t.done).length} / {tasks.length} tamamlanıb</span>
        </div>
        {tasks.map((task) => (
          <div key={task.id} className="hub-team-row" style={{ cursor: "pointer" }} onClick={() => toggle(task.id)}>
            <input type="checkbox" checked={task.done} readOnly style={{ width: 18, height: 18, accentColor: "#10b6a7" }} />
            <div>
              <strong style={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? "#738182" : "inherit" }}>{task.title}</strong>
              <small>Təyin edilib: {task.assignee} · İcra vaxtı: {task.due}</small>
            </div>
            <b className={task.done ? "hub-presence" : "hub-pending"}>{task.done ? "Tamamlandı" : "Gözləyir"}</b>
          </div>
        ))}
      </section>
    </>
  );
}
function ReportsSample() {
  return (
    <>
      <div className="hub-demo-note"><Bell size={16}/> Nümunə hesabat · Filial və davamiyyət göstəriciləri demo üçündür.</div>
      <section className="hub-metrics">
        <article><small>DAVAMİYYƏT FAİZİ</small><strong>98%</strong><span>son 30 gündə</span></article>
        <article><small>ÜMUMİ İŞ SAATI</small><strong>168 s</strong><span>plan: 160 s</span></article>
        <article><small>GECİKMƏLƏR</small><strong>0 dəq</strong><span>intizam qaydasında</span></article>
        <article><small>İCAZƏ / MƏZUNİYYƏT</small><strong>2 saat</strong><span>təsdiqlənmiş icazə</span></article>
      </section>
      <section className="hub-data-panel" style={{ marginTop: 16 }}>
        <div className="hub-panel-title">
          <div><small>FİLİAL MÜQAYİSƏSİ</small><h2>Filial Göstəriciləri</h2></div>
          <button className="button secondary compact" title="Davamiyyət hesabatını yüklə"><Download size={14}/> Excel çıxarışı</button>
        </div>
        <div className="hub-team-row">
          <div>
            <strong>Nizami filialı</strong>
            <small>1 aktiv işçi · Orta gündəlik iş vaxtı: 8.4 saat</small>
          </div>
          <span>Davamiyyət: 98%</span>
          <b className="hub-presence"><i/> Normal</b>
        </div>
      </section>
    </>
  );
}
function PlanSample() {
  const [selectedPlan, setSelectedPlan] = useState<"free" | "start" | "business" | "growth">("business");
  const [extraBranches, setExtraBranches] = useState(0);
  const [status, setStatus] = useState<"trialing" | "active">("trialing");
  const [daysLeft, setDaysLeft] = useState(11);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const planPrices = {
    free: 0,
    start: 15,
    business: 29 + extraBranches * 5,
    growth: 49,
  };

  const planEmployees = {
    free: 3,
    start: 10,
    business: 25,
    growth: 50,
  };

  const planBranches = {
    free: 1,
    start: 1,
    business: 2 + extraBranches,
    growth: 3,
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          extraBranches: selectedPlan === "business" ? extraBranches : 0,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("active");
        setDaysLeft(30);
        setSuccessMsg(`Təbriklər! ${selectedPlan.toUpperCase()} paketi uğurla aktivləşdirildi (Sandbox).`);
        setShowCheckoutModal(false);
      } else {
        alert("Xəta baş verdi: " + data.error);
      }
    } catch (err: any) {
      alert("Şəbəkə xətası: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="hub-demo-note">
        <Bell size={16}/> Abunə və paket limitləri · {status === "trialing" ? "14 günlük sınaq müddəti aktivdir." : "Aktiv ödənişli abunə."}
      </div>

      {successMsg && (
        <div style={{ background: "#e6f4ea", border: "1px solid #137333", color: "#137333", padding: "12px 16px", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={18} />
          <strong>{successMsg}</strong>
        </div>
      )}

      <section className="hub-data-panel">
        <div className="hub-panel-title">
          <div><small>CARİ PAKET</small><h2>{selectedPlan.toUpperCase()} Paket</h2></div>
          <span className="hub-presence">
            <i/> {status === "trialing" ? `14 günlük sınaq (${daysLeft} gün qalıb)` : `Aktiv abunə (${daysLeft} gün qalıb)`}
          </span>
        </div>
        <div className="hub-pay-summary">
          <div><small>AYLIQ QİYMƏT</small><strong>{planPrices[selectedPlan]} ₼ / ay</strong><span>{status === "trialing" ? "Sınaq bitdikdən sonra" : "Növbəti çıxarış: 30 gün sonra"}</span></div>
          <div><small>AKTİV HEYƏT LİMİTİ</small><strong>1 / {planEmployees[selectedPlan]} işçi</strong><span>Bütün filiallar üzrə ümumi</span></div>
        </div>
        <div style={{ borderTop: "1px solid #e8edeb", paddingTop: 16, marginTop: 10 }}>
          <p><strong>Filial limiti:</strong> 1 / {planBranches[selectedPlan]} filial aktivdir (Əlavə filial: +5 ₼ / ay, maks. 3)</p>
          <p><strong>Daxildir:</strong> QR və GPS davamiyyət, Növbə qrafiki, Maaş & avans uçotu, Filial hesabatları</p>
        </div>
      </section>

      <section className="hub-data-panel" style={{ marginTop: 16 }}>
        <div className="hub-panel-title">
          <div><small>TARİFLƏR VƏ YENİLƏNMƏ</small><h2>Paket Seçimi</h2></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 12 }}>
          {/* Free Tier */}
          <div style={{
            border: selectedPlan === "free" ? "2px solid #0052cc" : "1px solid #dfe1e6",
            borderRadius: 8,
            padding: 16,
            background: selectedPlan === "free" ? "#f4f8ff" : "#fff",
            cursor: "pointer",
          }} onClick={() => setSelectedPlan("free")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Free</h3>
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>0 ₼ <small>/ ay</small></span>
            </div>
            <p style={{ margin: "8px 0", fontSize: "0.85rem", color: "#5e6c84" }}>3 işçiyə qədər · 1 filial</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "#42526e" }}>
              <li>QR və GPS davamiyyət</li>
              <li>Sabit iş qrafiki</li>
              <li>Davamiyyət tarixçəsi</li>
            </ul>
          </div>

          {/* Start Tier */}
          <div style={{
            border: selectedPlan === "start" ? "2px solid #0052cc" : "1px solid #dfe1e6",
            borderRadius: 8,
            padding: 16,
            background: selectedPlan === "start" ? "#f4f8ff" : "#fff",
            cursor: "pointer",
          }} onClick={() => setSelectedPlan("start")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Start</h3>
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>15 ₼ <small>/ ay</small></span>
            </div>
            <p style={{ margin: "8px 0", fontSize: "0.85rem", color: "#5e6c84" }}>10 işçiyə qədər · 1 filial</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "#42526e" }}>
              <li>Növbə cədvəli</li>
              <li>İcazə və məzuniyyətlər</li>
              <li>Excel çıxarışı</li>
            </ul>
          </div>

          {/* Business Tier */}
          <div style={{
            border: selectedPlan === "business" ? "2px solid #0052cc" : "1px solid #dfe1e6",
            borderRadius: 8,
            padding: 16,
            background: selectedPlan === "business" ? "#f4f8ff" : "#fff",
            cursor: "pointer",
          }} onClick={() => setSelectedPlan("business")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Business</h3>
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>29 ₼ <small>/ ay</small></span>
            </div>
            <p style={{ margin: "8px 0", fontSize: "0.85rem", color: "#5e6c84" }}>25 işçiyə qədər · 2 filial</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "#42526e" }}>
              <li>Bütün Start imkanları</li>
              <li>Daxili maaş və avans uçotu</li>
              <li>Əlavə saat hesablanması</li>
              <li>Tapşırıqlar və filial səlahiyyətləri</li>
            </ul>
          </div>

          {/* Growth Tier */}
          <div style={{
            border: selectedPlan === "growth" ? "2px solid #0052cc" : "1px solid #dfe1e6",
            borderRadius: 8,
            padding: 16,
            background: selectedPlan === "growth" ? "#f4f8ff" : "#fff",
            cursor: "pointer",
          }} onClick={() => setSelectedPlan("growth")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Growth</h3>
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>49 ₼ <small>/ ay</small></span>
            </div>
            <p style={{ margin: "8px 0", fontSize: "0.85rem", color: "#5e6c84" }}>50 işçiyə qədər · 3 filial</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "#42526e" }}>
              <li>Bütün Business imkanları</li>
              <li>Müqayisəli filial analitikası</li>
              <li>Maksimal heyət həcmi</li>
            </ul>
          </div>
        </div>

        {selectedPlan === "business" && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#fafbfc", border: "1px solid #ebecf0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Əlavə filial (+5 ₼ / ay):</strong>
              <small style={{ display: "block", color: "#6b778c" }}>Maksimal 3 filiala qədər artırıla bilər</small>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="button secondary compact"
                onClick={() => setExtraBranches(Math.max(0, extraBranches - 1))}
                disabled={extraBranches === 0}
              >-</button>
              <span style={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>+{extraBranches}</span>
              <button
                type="button"
                className="button secondary compact"
                onClick={() => setExtraBranches(Math.min(1, extraBranches + 1))}
                disabled={extraBranches === 1}
              >+</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            className="button primary"
            onClick={() => setShowCheckoutModal(true)}
          >
            <CreditCard size={16} /> {selectedPlan === "free" ? "Free Paketə keç (0 ₼ / ay)" : `Paketi seç və Abunə ol (${planPrices[selectedPlan]} ₼ / ay)`}
          </button>
        </div>
      </section>

      {/* Sandbox Checkout / Switch Modal */}
      {showCheckoutModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 440, width: "90%", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ margin: "0 0 8px" }}>
              {selectedPlan === "free" ? "Free Paketə Keçid" : "Təhlükəsiz Sandbox Ödənişi"}
            </h3>
            <p style={{ margin: "0 0 16px", color: "#6b778c", fontSize: "0.9rem" }}>
              {selectedPlan === "free"
                ? "Ödənişsiz Free paketinə keçid. Aktiv işçi limiti 3 nəfər, filial sayı 1 olaraq tənzimlənir."
                : "AGENTS.md qaydalarına uyğun sınaq mühiti. Real bank kartı tələb olunmur; əməliyyat idempotent gateway simulyasiyası ilə icra edilir."}
            </p>

            <div style={{ background: "#f4f5f7", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Paket:</span> <strong>{selectedPlan.toUpperCase()}</strong>
              </div>
              {selectedPlan === "business" && extraBranches > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Əlavə filial:</span> <strong>+{extraBranches} (+5 ₼)</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #dfe1e6", paddingTop: 6, fontWeight: 700 }}>
                <span>Yekun məbləğ:</span> <span>{planPrices[selectedPlan]},00 ₼ / ay</span>
              </div>
            </div>

            <form onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowCheckoutModal(false)}
                  disabled={isProcessing}
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? "İcra edilir..."
                    : selectedPlan === "free"
                    ? "Free Paketi təsdiqlə"
                    : "Ödənişi təsdiqlə (Sandbox)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function ModulePlaceholder({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) { return <section className="module-placeholder"><span>{icon}</span><h2>{title}</h2><p>{description}</p><div><strong>Frontend axını hazırlanır</strong><p>Bu bölmənin formaları, siyahıları, boş və xəta vəziyyətləri backend məlumat modeli ilə birlikdə aktivləşdiriləcək.</p></div></section> }
