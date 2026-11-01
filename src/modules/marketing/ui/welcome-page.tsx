"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  MapPin,
  Menu,
  Play,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { marketing as m } from "../content";
import styles from "./welcome.module.css";

function MarketingLogo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={m.homeLabel}
      className={`${styles.logo} ${light ? styles.lightLogo : ""}`}
    >
      <span className={styles.logoMark}>
        <QrCode size={17} strokeWidth={2.4} />
      </span>
      <span className={styles.logoText}>
        panelim<span className={styles.logoDomain}>.az</span>
      </span>
    </Link>
  );
}

const featureIcons = [QrCode, CalendarDays, ReceiptText, FilePenLine, Building2];
const audienceIcons = [Coffee, Store, UsersRound];

// Distinct Cockpit Interactive Scenarios for panelim.az
const AUDIT_SCENARIOS = [
  {
    id: "late-check",
    question: "Bu gün hansı filialda gecikmə və ya növbə çatışmazlığı var?",
    readingText: "2 filial və 18 işçi qrafiki analiz edilir...",
    tags: ["Nizami filialı", "Sahil filialı", "Gündüz növbəsi", "QR Loqları"],
    stats: { activeStaff: "15 / 18", shiftTime: "09:00 – 18:00", advanceTotal: "180.00 ₼" },
    answerHeading: "Nizami filialında 1 gecikmə qeydə alınıb",
    answerLead: "Rəşad Əliyev saat 09:18-də GPS (12m radius) və QR ilə giriş edib (18 dəqiqə gecikmə). Sahil filialında bütün 8 işçi vaxtında növbədədir.",
    sources: [
      { name: "Nizami filialı QR canlı jurnalı", ext: "LIVE", time: "09:18:04", status: "ok" },
      { name: "Oktyabr növbə qrafiki.xlsx", ext: "XLSX", time: "18 işçi", status: "verified" },
      { name: "Sahil filialı GPS radius yoxlaması", ext: "GEO", time: "8/8 heyət", status: "verified" },
    ],
  },
  {
    id: "payroll-check",
    question: "Bu ay təsdiq gözləyən əlavə saat və avans ödənişləri nə qədərdir?",
    readingText: "Daxili maaş modulu və avans blankları hesablanır...",
    tags: ["Maaş uçotu", "Avans sorğuları", "Əlavə saatlar", "Rəhbər təsdiqi"],
    stats: { activeStaff: "18 / 18", shiftTime: "Aylıq bağlama", advanceTotal: "340.00 ₼" },
    answerHeading: "2 əlavə saat və 1 avans müraciəti təsdiq gözləyir",
    answerLead: "Mətbəx heyətindən 4 saatlıq əlavə iş vaxtı (28 ₼) və servis heyətindən 100 ₼ avans sorğusu rəhbər qərarı üçün hazırdır.",
    sources: [
      { name: "Aylıq daxili maaş cədvəli.pdf", ext: "PDF", time: "Cari dövr", status: "verified" },
      { name: "Avans blankları (Nizami filialı)", ext: "DOC", time: "340.00 ₼", status: "ok" },
      { name: "Audit & qərar tarixçəsi", ext: "SEC", time: "2 gözləmədə", status: "verified" },
    ],
  },
];

export function WelcomePage({ year }: { year: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [streamProgress, setStreamProgress] = useState(100);
  const [sidebarTab, setSidebarTab] = useState<"davamiyyet" | "nobveler" | "maas">("davamiyyet");
  const [cursorPos, setCursorPos] = useState({ x: 340, y: 38, isClicking: false, visible: true });
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const cockpitRef = useRef<HTMLDivElement>(null);

  const scenario = AUDIT_SCENARIOS[activeScenarioIdx];

  // Switch scenario smoothly with animated stream effect
  const handleSwitchScenario = (nextIdx: number) => {
    if (nextIdx === activeScenarioIdx) return;
    setIsTyping(true);
    setStreamProgress(20);
    setActiveScenarioIdx(nextIdx);
    setTimeout(() => {
      setStreamProgress(70);
    }, 300);
    setTimeout(() => {
      setStreamProgress(100);
      setIsTyping(false);
    }, 700);
  };

  // Autonomous Self-Playing Cursor Simulation (Framer-grade cinematic demo)
  useEffect(() => {
    if (isUserInteracting) return;

    let step = 0;
    // Pre-calculated target coordinates inside the cockpit screen:
    // Tab 0: { x: 310, y: 44 }
    // Tab 1: { x: 470, y: 44 }
    // Sources card: { x: 740, y: 140 }
    // Sidebar nav: { x: 80, y: 120 }
    const script = [
      // Step 0: Move to Tab 1 (Maaş & Avans)
      { x: 475, y: 46, click: false, delay: 1800, action: () => {} },
      // Step 1: Click Tab 1
      { x: 475, y: 46, click: true, delay: 600, action: () => handleSwitchScenario(1) },
      // Step 2: Move toward response result
      { x: 430, y: 220, click: false, delay: 2200, action: () => {} },
      // Step 3: Move over to sources panel
      { x: 740, y: 155, click: false, delay: 2000, action: () => {} },
      // Step 4: Click a source preview
      { x: 740, y: 155, click: true, delay: 500, action: () => {} },
      // Step 5: Hover left sidebar menu
      { x: 90, y: 118, click: false, delay: 2200, action: () => setSidebarTab("nobveler") },
      // Step 6: Move back to Tab 0 (Davamiyyət & Gecikmələr)
      { x: 310, y: 46, click: false, delay: 2000, action: () => {} },
      // Step 7: Click Tab 0
      { x: 310, y: 46, click: true, delay: 600, action: () => {
        handleSwitchScenario(0);
        setSidebarTab("davamiyyet");
      } },
      // Step 8: Rest in center
      { x: 390, y: 180, click: false, delay: 2600, action: () => {} },
    ];

    let timer: NodeJS.Timeout;

    const runScriptStep = (idx: number) => {
      const current = script[idx];
      setCursorPos((prev) => ({
        ...prev,
        x: current.x,
        y: current.y,
        isClicking: current.click,
        visible: true,
      }));

      if (current.action) {
        current.action();
      }

      const nextIdx = (idx + 1) % script.length;
      timer = setTimeout(() => {
        runScriptStep(nextIdx);
      }, current.delay);
    };

    timer = setTimeout(() => {
      runScriptStep(0);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isUserInteracting]);

  // Split title into animated words for the staggered blur-fade entrance
  const titleWords = m.title.split(" ");

  return (
    <div className={styles.site}>
      {/* Framer Sunset Sky Atmosphere & Dusk Fog */}
      <div className={styles.heroAtmosphere} aria-hidden="true" />
      <div className={styles.duskFog} aria-hidden="true" />

      {/* Navigation Header */}
      <header
        className={styles.header}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <div className={styles.headerInner}>
          <MarketingLogo />
          <nav aria-label={m.navigation} className={styles.desktopNav}>
            {m.links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className={styles.headerActions}>
            <Link href="/giris" className={styles.loginLink}>
              {m.login}
            </Link>
            <Link href="/demo" className={styles.demoLink}>
              {m.demo}
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
            <Link href="/qeydiyyat" className={styles.primaryCta}>
              Ödənişsiz başla
            </Link>
            <button
              ref={menuButton}
              className={styles.menuButton}
              aria-label={menuOpen ? m.closeMenu : m.openMenu}
              aria-expanded={menuOpen}
              aria-controls="mobile-site-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-site-navigation"
            aria-label={m.mobileNavigation}
            className={styles.mobileNav}
          >
            {m.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
                <ChevronRight size={16} aria-hidden="true" />
              </a>
            ))}
            <div className={styles.mobileActionBox}>
              <Link
                href="/giris"
                className={styles.mobileLoginBtn}
                onClick={() => setMenuOpen(false)}
              >
                {m.login}
              </Link>
              <Link
                href="/demo"
                className={styles.mobileDemoBtn}
                onClick={() => setMenuOpen(false)}
              >
                {m.demo}
              </Link>
              <Link
                href="/qeydiyyat"
                className={styles.mobileCta}
                onClick={() => setMenuOpen(false)}
              >
                Ödənişsiz başla
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main id="main">
        {/* Luxury Framer Hero Section */}
        <section className={`${styles.hero} ${styles.container}`}>
          <div className={styles.heroContent}>
            <div className={styles.badgePill}>
              <span className={styles.badgeDot} />
              <span>{m.eyebrow}</span>
            </div>

            <h1 className={styles.heroTitle} aria-label={m.title}>
              {titleWords.map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  className={styles.animatedWord}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  {word}&nbsp;
                </span>
              ))}
            </h1>

            <p className={styles.heroSubHeadline}>
              Kağız jurnallara və bahalı turniketlərə son: Dinamik QR davamiyyət, dəqiq növbələr və daxili maaş uçotu cibinizdə.
            </p>

            {/* Framer-style Input Pill */}
            <div className={styles.heroActionBar}>
              <input
                type="email"
                placeholder="İş e-poçt ünvanınız"
                className={styles.actionEmailInput}
                aria-label="E-poçt ünvanınız"
              />
              <Link href="/qeydiyyat" className={styles.heroButtonPrimary}>
                Ödənişsiz başla
                <ArrowRight size={15} />
              </Link>
            </div>

            <div style={{ marginTop: "12px" }}>
              <Link href="/demo" className={styles.heroWatchDemo}>
                <Play size={13} fill="currentColor" />
                <span>Canlı 2 dəqiqəlik demoya bax</span>
              </Link>
            </div>
          </div>

          {/* Floating Cinematic Distinct Cockpit for panelim.az */}
          <div
            ref={cockpitRef}
            className={styles.heroFloatingCockpit}
            onMouseEnter={() => setIsUserInteracting(true)}
            onMouseLeave={() => setIsUserInteracting(false)}
          >
            {/* Autonomous Virtual Mouse Cursor */}
            <div
              className={`${styles.virtualCursor} ${cursorPos.isClicking ? styles.virtualCursorClick : ""} ${
                !cursorPos.visible || isUserInteracting ? styles.virtualCursorHidden : ""
              }`}
              style={{
                transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
              }}
              aria-hidden="true"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.cursorSvg}>
                <path
                  d="M4.5 3.5L10.5 20.5L13.5 13.5L20.5 10.5L4.5 3.5Z"
                  fill="#ffffff"
                  stroke="#13110f"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              <div className={styles.cursorRipple} />
            </div>

            <div className={styles.cockpitScreen}>
              {/* Cockpit Top Bar */}
              <div className={styles.cockpitTopNav}>
                <div className={styles.cockpitNavLeft}>
                  <div className={styles.cockpitBrand}>
                    <Sparkles size={16} className={styles.sparkleIcon} />
                    <span>panelim.az Köməkçi</span>
                  </div>
                  <div className={styles.branchSelector}>
                    <span>Mado · Nizami filialı</span>
                    <span className={styles.branchTagLive}>Canlı</span>
                  </div>
                </div>

                <div className={styles.cockpitNavRight}>
                  <div className={styles.cockpitGpsBadge}>
                    <MapPin size={12} />
                    <span>Geolokasiya: 12m aktiv</span>
                  </div>
                  <div className={styles.cockpitDateFilter}>
                    <Clock size={12} />
                    <span>Bugün · Canlı izləmə</span>
                  </div>
                </div>
              </div>

              {/* Cockpit 3-Column Glass Layout */}
              <div className={styles.cockpitBody}>
                {/* Left Navigation & Agent Panel */}
                <div className={styles.cockpitSidebar}>
                  <div className={styles.cockpitSearchBox}>
                    <Search size={13} className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="İşçi və ya filial axtar..."
                      readOnly
                      value=""
                      className={styles.cockpitSearchInput}
                      aria-label="Axtarış paneli"
                    />
                    <kbd className={styles.cockpitKbd}>⌘K</kbd>
                  </div>

                  <div className={styles.cockpitNavMenu}>
                    <button
                      type="button"
                      className={`${styles.cockpitNavItem} ${sidebarTab === "davamiyyet" ? styles.activeNavItem : ""}`}
                      onClick={() => setSidebarTab("davamiyyet")}
                    >
                      <QrCode size={15} />
                      <span>Davamiyyət</span>
                      <span className={styles.navCountBadge}>15/18</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.cockpitNavItem} ${sidebarTab === "nobveler" ? styles.activeNavItem : ""}`}
                      onClick={() => setSidebarTab("nobveler")}
                    >
                      <CalendarDays size={15} />
                      <span>Növbə qrafiki</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.cockpitNavItem} ${sidebarTab === "maas" ? styles.activeNavItem : ""}`}
                      onClick={() => setSidebarTab("maas")}
                    >
                      <Wallet size={15} />
                      <span>Daxili maaş & avans</span>
                    </button>
                  </div>

                  <div className={styles.cockpitAgentsSection}>
                    <span className={styles.agentsTitle}>CANLI FİLİAL HEYƏTİ</span>
                    <div className={styles.agentsList}>
                      <div className={styles.agentItem}>
                        <span className={`${styles.agentStatusDot} ${styles.dotLive}`} />
                        <span className={styles.agentName}>Mətbəx heyəti</span>
                        <span className={styles.agentStateTag}>Canlı</span>
                      </div>
                      <div className={styles.agentItem}>
                        <span className={`${styles.agentStatusDot} ${styles.dotLive}`} />
                        <span className={styles.agentName}>Servis & Zal</span>
                        <span className={styles.agentStateTag}>Canlı</span>
                      </div>
                      <div className={styles.agentItem}>
                        <span className={`${styles.agentStatusDot} ${styles.dotPaused}`} />
                        <span className={styles.agentName}>Təchizat & Anbar</span>
                        <span className={styles.agentStatePaused}>Fasilə</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick User Identity */}
                  <div className={styles.cockpitManagerFooter}>
                    <div className={styles.managerAvatar}>RM</div>
                    <div className={styles.managerInfo}>
                      <span className={styles.managerName}>Rəhbər / Menecer</span>
                      <span className={styles.managerRole}>Baş inzibatçı</span>
                    </div>
                  </div>
                </div>

                {/* Center AI Auditor & Stream Dialogue */}
                <div className={styles.cockpitMainStage}>
                  {/* Scenario Toggle Pills */}
                  <div className={styles.scenarioPills}>
                    <button
                      type="button"
                      className={`${styles.scenarioTab} ${activeScenarioIdx === 0 ? styles.scenarioTabActive : ""}`}
                      onClick={() => handleSwitchScenario(0)}
                    >
                      Davamiyyət & Gecikmələr
                    </button>
                    <button
                      type="button"
                      className={`${styles.scenarioTab} ${activeScenarioIdx === 1 ? styles.scenarioTabActive : ""}`}
                      onClick={() => handleSwitchScenario(1)}
                    >
                      Maaş & Avans Hesablaması
                    </button>
                  </div>

                  {/* Manager Query Message Bubble */}
                  <div className={styles.dialogueBubbleWrapper}>
                    <div className={styles.managerBubble}>
                      <span>{scenario.question}</span>
                    </div>
                  </div>

                  {/* Response Engine Card */}
                  <div className={styles.assistantResponseCard}>
                    <div className={styles.responseStatusHeader}>
                      <span className={styles.pulsingIndicator} />
                      <span className={styles.readingLabel}>{scenario.readingText}</span>
                    </div>

                    {/* Chips for scanned entities */}
                    <div className={styles.analyzedChips}>
                      {scenario.tags.map((tag) => (
                        <div key={tag} className={styles.analyzedChip}>
                          <FileText size={11} className={styles.chipIcon} />
                          <span>{tag}</span>
                        </div>
                      ))}
                    </div>

                    {/* Verified Result Card */}
                    <div className={`${styles.resultBox} ${isTyping ? styles.resultBoxBlur : ""}`}>
                      <div className={styles.resultHeader}>
                        <UserCheck size={16} className={styles.resultCheckIcon} />
                        <h4>{scenario.answerHeading}</h4>
                      </div>
                      <p className={styles.resultParagraph}>{scenario.answerLead}</p>

                      {/* Stream Progress Bar */}
                      <div className={styles.streamProgressTrack}>
                        <div
                          className={styles.streamProgressBar}
                          style={{ width: `${streamProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Interactive Command Bar */}
                  <div className={styles.cockpitInputBar}>
                    <Plus size={14} className={styles.inputPlusIcon} />
                    <span className={styles.inputPlaceholderText}>
                      Əmrlər: &quot;Filial üzrə bu günün çıxarışını hazırla&quot; və ya &quot;İcazə ver&quot;...
                    </span>
                    <button type="button" className={styles.inputSendBtn} aria-label="Sorğu göndər">
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Right Verified Sources & Realtime Log */}
                <div className={styles.cockpitRightInspector}>
                  <div className={styles.sourcesHeader}>
                    <div className={styles.sourcesTitle}>
                      <FileSpreadsheet size={13} className={styles.sourcesIcon} />
                      <span>Yoxlanılan Mənbələr</span>
                    </div>
                    <span className={styles.sourcesCount}>{scenario.sources.length} aktiv</span>
                  </div>

                  <div className={styles.sourcesList}>
                    {scenario.sources.map((src) => (
                      <div key={src.name} className={styles.sourceCard}>
                        <div className={styles.sourceCardTop}>
                          <span className={styles.sourceBadge}>{src.ext}</span>
                          <span className={styles.sourceStatusIndicator}>
                            <ShieldCheck size={12} />
                            {src.status === "verified" ? "Doğrulandı" : "Canlı"}
                          </span>
                        </div>
                        <span className={styles.sourceName}>{src.name}</span>
                        <div className={styles.sourceMeta}>
                          <span>{src.time}</span>
                          <span className={styles.sourceDetailDot}>•</span>
                          <span>Audit qeydi #2026</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live Verification Summary Footer */}
                  <div className={styles.sourcesAuditFooter}>
                    <div className={styles.auditSecurityNote}>
                      <ShieldCheck size={14} className={styles.shieldIcon} />
                      <div>
                        <strong>100% Audit Bütövlüyü</strong>
                        <p>QR oxunuşu və GPS mütləq yoxlanılır, manual dəyişikliklər qeyd olunur.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Audience Strip */}
        <section className={styles.audienceSection}>
          <div className={styles.container}>
            <div className={styles.audienceGrid}>
              <div>
                <span className={styles.audienceIntroTitle}>Hədəf auditoriyamız:</span>
                <p className={styles.audienceIntroDesc}>5–50 işçili növbəli xidmət və ticarət şəbəkələri</p>
              </div>
              <div className={styles.audiencePills}>
                {m.audiences.map((text, idx) => {
                  const Icon = audienceIcons[idx];
                  return (
                    <div key={text} className={styles.audiencePill}>
                      <Icon size={16} className={styles.audienceIcon} />
                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Features Workbench */}
        <section id="imkanlar" className={`${styles.featuresSection} ${styles.container}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.badgePill}>{m.featureEyebrow}</div>
            <h2 className={styles.sectionHeading}>{m.featureTitle}</h2>
            <p className={styles.sectionLead}>{m.featureIntro}</p>
          </div>

          <div className={styles.featureWorkbench}>
            {/* Interactive Feature Accordion */}
            <div className={styles.featureAccordionList}>
              {m.features.map((feature, index) => {
                const Icon = featureIcons[index];
                const isSelected = activeFeature === index;
                return (
                  <div
                    key={feature.title}
                    className={`${styles.featureItem} ${isSelected ? styles.featureItemActive : ""}`}
                    onClick={() => setActiveFeature(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setActiveFeature(index);
                    }}
                  >
                    <div className={styles.featureItemHeader}>
                      <div className={styles.featureIconWrap}>
                        <Icon size={18} />
                      </div>
                      <h3 className={styles.featureItemTitle}>{feature.title}</h3>
                    </div>
                    {isSelected && (
                      <>
                        <p className={styles.featureItemDesc}>{feature.description}</p>
                        <ul className={styles.featureBulletList}>
                          {feature.bullets.map((b) => (
                            <li key={b}>
                              <Check size={14} className={styles.bulletCheck} />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Visual Feature Showcase */}
            <div className={styles.featureDisplayCard}>
              <div className={styles.displayCardHeader}>
                <div className={styles.displayIconBox}>
                  <QrCode size={24} />
                </div>
                <div>
                  <h4 className={styles.displayTitle}>{m.features[activeFeature].title}</h4>
                  <span className={styles.displaySub}>panelim.az daxili modul</span>
                </div>
              </div>

              <div className={styles.displayMetricBox}>
                <div className={styles.metricItem}>
                  <Clock size={16} color="var(--color-peach)" />
                  <span>Dəqiq qeydiyyat: <strong>09:01:24</strong></span>
                </div>
                <div className={styles.metricItem}>
                  <MapPin size={16} color="var(--color-sage)" />
                  <span>Məkan statusu: <strong>Filial daxili (12 m)</strong></span>
                </div>
                <div className={styles.metricItem}>
                  <Wallet size={16} color="var(--color-peach)" />
                  <span>Maaş hesablaması: <strong>Avtomatik</strong></span>
                </div>
              </div>

              <div style={{ marginTop: "24px" }}>
                <Link href="/demo" className={styles.featureActionBtn}>
                  Canlı demoda sına
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Matrix */}
        <section id="tarifler" className={`${styles.pricingSection} ${styles.container}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.badgePill}>Şəffaf tariflər</div>
            <h2 className={styles.sectionHeading}>Biznesinizə uyğun dəqiq tariflər.</h2>
            <p className={styles.sectionLead}>
              3 işçiyə qədər həmişəlik Pulsuz. Bütün imkanları dərhal sınaqdan keçirin. Kart tələb olunmur.
            </p>
          </div>

          <div className={styles.pricingGrid}>
            {/* Free */}
            <div className={styles.priceCard}>
              <div>
                <span className={styles.tierTag}>Başlanğıc</span>
                <h3 className={styles.tierName}>Free</h3>
                <div className={styles.tierPrice}>
                  0 ₼ <small className={styles.tierPricePeriod}>/ ömürlük</small>
                </div>
                <p className={styles.tierScope}>3 aktiv işçi · 1 filial</p>
                <ul className={styles.tierList}>
                  <li><Check size={15} className={styles.tierCheck} /> QR və GPS ilə davamiyyət</li>
                  <li><Check size={15} className={styles.tierCheck} /> Sabit iş qrafiki</li>
                  <li><Check size={15} className={styles.tierCheck} /> Giriş-çıxış tarixçəsi</li>
                </ul>
              </div>
              <Link href="/qeydiyyat" className={styles.priceButtonSecondary}>
                Free ilə başla
              </Link>
            </div>

            {/* Start */}
            <div className={styles.priceCard}>
              <div>
                <span className={styles.tierTag}>Kiçik komanda</span>
                <h3 className={styles.tierName}>Start</h3>
                <div className={styles.tierPrice}>
                  15 ₼ <small className={styles.tierPricePeriod}>/ ay</small>
                </div>
                <p className={styles.tierScope}>10 aktiv işçi · 1 filial</p>
                <ul className={styles.tierList}>
                  <li><Check size={15} className={styles.tierCheck} /> Bütün Free imkanları</li>
                  <li><Check size={15} className={styles.tierCheck} /> Növbə cədvəli & gecə növbəsi</li>
                  <li><Check size={15} className={styles.tierCheck} /> İcazə və məzuniyyətlər</li>
                  <li><Check size={15} className={styles.tierCheck} /> Excel çıxarışı (BOM dəstəkli)</li>
                </ul>
              </div>
              <Link href="/qeydiyyat" className={styles.priceButtonSecondary}>
                Start seç
              </Link>
            </div>

            {/* Business */}
            <div className={`${styles.priceCard} ${styles.priceCardFeatured}`}>
              <div className={styles.featuredBadge}>
                Ən çox seçilən · Tam imkanlar
              </div>
              <div>
                <span className={styles.tierTagFeatured}>Biznes idarəetmə</span>
                <h3 className={styles.tierName}>Business</h3>
                <div className={styles.tierPriceFeatured}>
                  29 ₼ <small className={styles.tierPricePeriod}>/ ay</small>
                </div>
                <p className={styles.tierScope}>25 aktiv işçi · 2 filial</p>
                <ul className={styles.tierList}>
                  <li><Check size={15} className={styles.tierCheckFeatured} /> Bütün Start imkanları</li>
                  <li><Check size={15} className={styles.tierCheckFeatured} /> Daxili maaş və avans uçotu</li>
                  <li><Check size={15} className={styles.tierCheckFeatured} /> Təsdiqlənmiş əlavə saatlar</li>
                  <li><Check size={15} className={styles.tierCheckFeatured} /> Tapşırıqlar və filial rolları</li>
                </ul>
              </div>
              <Link href="/qeydiyyat" className={styles.priceButtonPrimary}>
                Ödənişsiz başla
              </Link>
            </div>

            {/* Growth */}
            <div className={styles.priceCard}>
              <div>
                <span className={styles.tierTag}>Şəbəkələr</span>
                <h3 className={styles.tierName}>Growth</h3>
                <div className={styles.tierPrice}>
                  49 ₼ <small className={styles.tierPricePeriod}>/ ay</small>
                </div>
                <p className={styles.tierScope}>50 aktiv işçi · 3 filial</p>
                <ul className={styles.tierList}>
                  <li><Check size={15} className={styles.tierCheck} /> Bütün Business imkanları</li>
                  <li><Check size={15} className={styles.tierCheck} /> Filialların müqayisəli analitikası</li>
                  <li><Check size={15} className={styles.tierCheck} /> Maksimal işçi və filial həcmi</li>
                </ul>
              </div>
              <Link href="/qeydiyyat" className={styles.priceButtonSecondary}>
                Growth seç
              </Link>
            </div>
          </div>
        </section>

        {/* 3-Step Setup */}
        <section id="nece-isleyir" className={`${styles.stepsSection} ${styles.container}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.badgePill}>{m.stepsEyebrow}</div>
            <h2 className={styles.sectionHeading}>{m.stepsTitle}</h2>
          </div>

          <div className={styles.stepGrid}>
            {m.steps.map((step, idx) => (
              <div key={step.title} className={styles.stepCard}>
                <div className={styles.stepBadge}>Addım 0{idx + 1}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </div>
            ))}
          </div>

          <div className={styles.locationNoteBanner}>
            <MapPin size={18} className={styles.locationNoteIcon} />
            <span>{m.locationNote}</span>
          </div>
        </section>

        {/* FAQ */}
        <section id="suallar" className={`${styles.faqSection} ${styles.container}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.badgePill}>{m.faqEyebrow}</div>
            <h2 className={styles.sectionHeading}>{m.faqTitle}</h2>
          </div>

          <div className={styles.faqList}>
            {m.faqs.map((faq) => (
              <details key={faq.question} className={styles.faqItem}>
                <summary className={styles.faqSummary}>
                  <h3 className={styles.faqQuestion}>{faq.question}</h3>
                  <Plus size={18} className={styles.faqPlus} />
                </summary>
                <div className={styles.faqAnswerWrap}>
                  <p className={styles.faqAnswer}>{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={styles.finalCallout}>
          <div className={styles.container}>
            <div className={styles.finalCard}>
              <div className={styles.finalContent}>
                <h2 className={styles.finalHeading}>Kollektivinizdə davamiyyət və maaş nizamını bu gün qurun.</h2>
                <p className={styles.finalLead}>Daimi Pulsuz paketlə dərhal başlayın. Kart tələb olunmur.</p>
                <div className={styles.finalActions}>
                  <Link href="/qeydiyyat" className={styles.priceButtonPrimary} style={{ padding: "12px 28px" }}>
                    Ödənişsiz başla
                  </Link>
                  <Link href="/demo" className={styles.priceButtonSecondary} style={{ padding: "12px 24px" }}>
                    {m.demo}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div>
            <MarketingLogo light />
            <p className={styles.footerTagline}>{m.footerTagline}</p>
            <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--color-dim)", display: "flex", flexDirection: "column", gap: "4px" }}>
              <span>Ünvan: {m.footerAddress}</span>
              <span>Dəstək: <a href={`mailto:${m.footerSupportEmail}`} style={{ color: "var(--color-peach)" }}>{m.footerSupportEmail}</a></span>
            </div>
          </div>
          <div className={styles.footerLinks}>
            {m.links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            <Link href="/giris">{m.login}</Link>
          </div>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}>
          <span>© {year} panelim.az · Bütün hüquqlar qorunur.</span>
          <span>{m.footerCountry}</span>
        </div>
      </footer>
    </div>
  );
}
