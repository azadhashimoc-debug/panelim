"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Coffee,
  FilePenLine,
  History,
  MapPin,
  Menu,
  Plus,
  QrCode,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Store,
  UsersRound,
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
        <Image src="/logo.png" alt="" width={154} height={103} priority />
      </span>
      <span>
        panelim<span className={styles.logoDomain}>.az</span>
      </span>
    </Link>
  );
}
function DemoLink({
  dark = false,
  small = false,
}: {
  dark?: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href="/demo"
      className={`${styles.demoButton} ${dark ? styles.darkDemo : ""} ${small ? styles.smallDemo : ""}`}
    >
      {m.demo}
      <ArrowUpRight size={17} aria-hidden="true" />
    </Link>
  );
}
const featureIcons = [QrCode, CalendarDays, ReceiptText, FilePenLine, Building2];
const audienceIcons = [Coffee, Store, UsersRound];

export function WelcomePage({ year }: { year: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <div className={styles.site}>
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
            <Link href="/qeydiyyat" className={styles.loginLink} style={{ color: "#0052cc", fontWeight: 600 }}>
              Qeydiyyat
            </Link>
            <DemoLink small />
            <button
              ref={menuButton}
              className={styles.menuButton}
              aria-label={menuOpen ? m.closeMenu : m.openMenu}
              aria-expanded={menuOpen}
              aria-controls="mobile-site-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
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
                <ChevronRight size={17} aria-hidden="true" />
              </a>
            ))}
            <Link
              href="/qeydiyyat"
              style={{ fontWeight: 600, color: "#0052cc", padding: "12px 16px", display: "flex", justifyContent: "space-between" }}
              onClick={() => setMenuOpen(false)}
            >
              Qeydiyyat (14 günlük sınaq)
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          </nav>
        )}
      </header>
      <main id="main">
        <section className={`${styles.hero} ${styles.container}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span />
              {m.eyebrow}
            </p>
            <h1>
              {m.titleFirst}
              <br />
              <span>{m.titleAccent}</span>
            </h1>
            <p className={styles.heroIntro}>{m.intro}</p>
            <div className={styles.heroActions}>
              <Link href="/qeydiyyat" className={styles.demoButton} style={{ background: "#0052cc", color: "#fff" }}>
                14 günlük sınağa başla
              </Link>
              <DemoLink />
              <Link href="/giris" className={styles.secondaryLink}>
                {m.login}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.demoNote}>{m.demoNote}</p>
            <div className={styles.heroChecks}>
              {m.heroChecks.map((text) => (
                <span key={text}>
                  <Check size={14} aria-hidden="true" />
                  {text}
                </span>
              ))}
            </div>
          </div>
          <figure className={styles.heroArt} aria-label={m.sampleDescription}>
            <div className={styles.sampleLabel}>
              <span />
              {m.sample}
            </div>
            <div className={styles.artCircle} />
            <div className={styles.artCircleSmall} />
            <div className={styles.productWindow} aria-hidden="true">
              <div className={styles.windowBar}>
                <span className={styles.windowBrand}>
                  panelim<span>.az</span>
                </span>
                <span>{m.sampleCompany}</span>
                <span className={styles.windowAvatar}>P</span>
              </div>
              <div className={styles.windowBody}>
                <div className={styles.miniSidebar}>
                  <ScanLine size={16} />
                  <History size={16} />
                  <FilePenLine size={16} />
                  <span />
                </div>
                <div className={styles.miniMain}>
                  <div className={styles.miniGreeting}>
                    <span>{m.sampleGreeting}</span>
                    <CalendarDays size={15} />
                  </div>
                  <div className={styles.miniClock}>
                    <div>
                      <small>{m.sampleClockLabel}</small>
                      <span className={styles.workingPill}>
                        {m.sampleStatus}
                      </span>
                    </div>
                    <strong>
                      09:01<span>:24</span>
                    </strong>
                    <p>{m.sampleTime}</p>
                    <div className={styles.miniConfirmation}>
                      <CheckCheck size={18} />
                      {m.sampleRecorded}
                    </div>
                  </div>
                  <div className={styles.miniShift}>
                    <CalendarDays size={18} />
                    <span>
                      {m.sampleShift}
                      <strong>{m.sampleSchedule}</strong>
                    </span>
                    <span className={styles.miniShiftDot} />
                  </div>
                  <div className={styles.miniHistory}>
                    <span>{m.sampleHistory}</span>
                    <div>
                      <span>
                        <ArrowDownLeft size={13} />
                        {m.sampleIn}
                      </span>
                      <strong>09:01</strong>
                      <span>{m.sampleConfirmed}</span>
                    </div>
                    <div>
                      <span>
                        <ArrowUpRight size={13} />
                        {m.sampleOut}
                      </span>
                      <strong>— : —</strong>
                      <span>{m.samplePending}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.floatingQr} aria-hidden="true">
              <QrCode size={39} strokeWidth={1.4} />
              <span>
                {m.sampleQr}
                <strong>{m.sampleSecure}</strong>
              </span>
              <span className={styles.verified}>
                <Check size={12} />
              </span>
            </div>
            <div className={styles.locationBubble} aria-hidden="true">
              <MapPin size={16} />
              {m.sampleLocation}
              <span />
            </div>
          </figure>
        </section>
        <section className={`${styles.audience} ${styles.container}`}>
          <p>{m.audienceLead}</p>
          <div>
            {m.audiences.map((text, index) => {
              const Icon = audienceIcons[index];
              return (
                <span key={text}>
                  <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                  {text}
                </span>
              );
            })}
          </div>
        </section>
        <section
          id="imkanlar"
          className={`${styles.features} ${styles.container}`}
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{m.featureEyebrow}</p>
            <h2>{m.featureTitle}</h2>
            <p>{m.featureIntro}</p>
          </div>
          <div className={styles.featureLayout}>
            <div className={styles.accordions}>
              {m.features.map((feature, index) => {
                const Icon = featureIcons[index];
                return (
                  <details
                    key={feature.title}
                    name="panelim-features"
                    open={index === 0}
                    className={styles.feature}
                  >
                    <summary>
                      <span className={styles.featureIcon}>
                        <Icon size={21} />
                      </span>
                      <h3>{feature.title}</h3>
                      <Plus size={19} className={styles.plus} />
                    </summary>
                    <div className={styles.featureContent}>
                      <p>{feature.description}</p>
                      <ul>
                        {feature.bullets.map((item) => (
                          <li key={item}>
                            <Check size={15} aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={
                          index === 3
                            ? "/demo/muracietler"
                            : index === 0
                              ? "/demo"
                              : "/rehber"
                        }
                      >
                        {feature.link}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </details>
                );
              })}
            </div>
            <div className={styles.featureIllustration}>
              <div className={styles.bigQr}>
                <QrCode size={110} strokeWidth={1.2} aria-hidden="true" />
                <span>
                  <ScanLine size={17} />
                  {m.sampleQr}
                </span>
              </div>
              <div className={styles.scanPath}>
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className={styles.featurePhone}>
                <div className={styles.phoneNotch} />
                <div className={styles.phoneCheck}>
                  <Check size={34} />
                </div>
                <strong>{m.sampleRecorded}</strong>
                <p>09:01 · {m.sampleTime}</p>
                <span>
                  <MapPin size={13} />
                  {m.sampleLocation}
                </span>
              </div>
              <div className={styles.illustrationBadge}>
                <ShieldCheck size={16} />
                {m.sampleSecure}
              </div>
            </div>
          </div>
        </section>
        <section id="yol-xeritesi" className={styles.roadmapSection}>
          <div className={`${styles.container} ${styles.roadmapInner}`}>
            <div className={styles.roadmapHeading}>
              <p className={styles.eyebrow}>{m.roadmapEyebrow}</p>
              <h2>{m.roadmapTitle}</h2>
              <p>{m.roadmapIntro}</p>
            </div>
            <div className={styles.roadmapList}>
              {m.roadmapItems.map((item, index) => (
                <article key={item.title} className={styles.roadmapItem}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="nece-isleyir" className={styles.stepsSection}>
          <div className={styles.container}>
            <div className={styles.stepsHeading}>
              <p className={styles.eyebrow}>{m.stepsEyebrow}</p>
              <h2>{m.stepsTitle}</h2>
            </div>
            <div className={styles.steps}>
              {m.steps.map((step, index) => (
                <article key={step.title}>
                  <span className={styles.stepNumber}>0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
            <p className={styles.locationNote}>
              <MapPin size={17} aria-hidden="true" />
              {m.locationNote}
            </p>
          </div>
        </section>
        <section className={`${styles.records} ${styles.container}`}>
          <div className={styles.recordIllustration}>
            <span className={styles.historyLabel}>
              <History size={15} />
              {m.sampleHistory}
              <span>{m.sample}</span>
            </span>
            <div className={styles.recordTimeline}>
              {m.recordItems.map((item, index) => (
                <div key={item.title}>
                  <span className={styles.timelineCheck}>
                    {index === 0 ? (
                      <QrCode size={19} />
                    ) : index === 1 ? (
                      <Check size={19} />
                    ) : (
                      <History size={19} />
                    )}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                  <time>{item.time}</time>
                </div>
              ))}
            </div>
            <div className={styles.recordFoot}>
              <ShieldCheck size={15} />
              <span>{m.privacyTitle}</span>
            </div>
          </div>
          <div className={styles.recordCopy}>
            <p className={styles.eyebrow}>{m.recordEyebrow}</p>
            <h2>{m.recordTitle}</h2>
            <p>{m.recordIntro}</p>
            <div className={styles.privacy}>
              <ShieldCheck size={23} />
              <div>
                <strong>{m.privacyTitle}</strong>
                <p>{m.privacyText}</p>
              </div>
            </div>
            <Link className={styles.textCta} href="/demo/tarixce">
              {m.features[0].link}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section
          id="suallar"
          className={`${styles.faqSection} ${styles.container}`}
        >
          <div>
            <p className={styles.eyebrow}>{m.faqEyebrow}</p>
            <h2>{m.faqTitle}</h2>
          </div>
          <div className={styles.faqs}>
            {m.faqs.map((faq) => (
              <details key={faq.question}>
                <summary>
                  <h3>{faq.question}</h3>
                  <Plus size={19} className={styles.plus} />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalSection}>
          <div className={styles.container}>
            <span className={styles.finalMark}>
              <ScanLine size={30} />
            </span>
            <p className={styles.eyebrow}>{m.finalEyebrow}</p>
            <h2>{m.finalTitle}</h2>
            <p>{m.finalIntro}</p>
            <DemoLink />
            <span className={styles.finalLogin}>
              {m.existingAccount}
              <Link href="/giris">
                {m.login}
                <ArrowUpRight size={14} />
              </Link>
            </span>
          </div>
        </section>
      </main>
      <footer className={`${styles.footer} ${styles.container}`}>
        <div>
          <MarketingLogo />
          <p>{m.footerTagline}</p>
        </div>
        <nav aria-label={m.navigation}>
          {m.links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <Link href="/giris">{m.login}</Link>
        </nav>
        <div className={styles.footerBottom}>
          <span>© {year} panelim.az</span>
          <span>{m.footerCountry}</span>
        </div>
      </footer>
    </div>
  );
}
