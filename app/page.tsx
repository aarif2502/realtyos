import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  FileText,
  KeyRound,
  MapPinned,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { PublicServiceSelector } from "@/components/PublicServiceSelector";
import { databaseConfigured } from "@/lib/db";
import { defaultWebsiteSettings, getPublicWebsiteSettings } from "@/lib/erp-repository";
import {
  websiteHeroProofCards,
  websiteIcons,
  websiteOperatingMetrics,
  websiteOperatingSteps,
  websiteServices,
  websiteSignInHref,
  websiteTrustSignals,
} from "@/modules/website/website.config";

export const dynamic = "force-dynamic";

const signInHref = websiteSignInHref;

async function loadSettings() {
  if (!databaseConfigured()) return defaultWebsiteSettings;
  return getPublicWebsiteSettings();
}

export default async function HomePage() {
  const settings = await loadSettings();
  const primary = String(settings.primary_color || defaultWebsiteSettings.primary_color);
  const secondary = String(settings.secondary_color || defaultWebsiteSettings.secondary_color);
  const accent = String(settings.accent_color || defaultWebsiteSettings.accent_color);
  const logoPath = String(settings.logo_path || defaultWebsiteSettings.logo_path);
  const logoWidth = Math.max(64, Math.min(240, Number(settings.logo_width || defaultWebsiteSettings.logo_width)));
  const logoRadius = Math.max(0, Math.min(32, Number(settings.logo_radius || defaultWebsiteSettings.logo_radius)));
  const bodyFontSize = Math.max(14, Math.min(20, Number(settings.body_font_size || defaultWebsiteSettings.body_font_size)));
  const headingFontSize = Math.max(38, Math.min(78, Number(settings.heading_font_size || defaultWebsiteSettings.heading_font_size)));
  const navFontSize = Math.max(12, Math.min(18, Number(settings.nav_font_size || defaultWebsiteSettings.nav_font_size)));
  const heroBodyFontSize = Math.max(15, Math.min(24, Number(settings.hero_body_font_size || defaultWebsiteSettings.hero_body_font_size)));
  const cardHeadingFontSize = Math.max(16, Math.min(28, Number(settings.card_heading_font_size || defaultWebsiteSettings.card_heading_font_size)));
  const footerFontSize = Math.max(12, Math.min(18, Number(settings.footer_font_size || defaultWebsiteSettings.footer_font_size)));
  const fontFamily = String(settings.body_font_family || defaultWebsiteSettings.body_font_family);
  const navTextColor = String(settings.nav_text_color || defaultWebsiteSettings.nav_text_color);
  const heroTextColor = String(settings.hero_text_color || defaultWebsiteSettings.hero_text_color);
  const bodyTextColor = String(settings.body_text_color || defaultWebsiteSettings.body_text_color);
  const heroBadge = String(settings.hero_badge || defaultWebsiteSettings.hero_badge);
  const processHeading = String(settings.process_heading || defaultWebsiteSettings.process_heading);
  const processBody = String(settings.process_body || defaultWebsiteSettings.process_body);

  return (
    <main
      className="ush-site"
      style={{
        "--ush-primary": primary,
        "--ush-secondary": secondary,
        "--ush-accent": accent,
        "--ush-body": bodyTextColor,
        fontFamily,
        fontSize: bodyFontSize,
      } as CSSProperties}
    >
      <header className="ush-header">
        <div className="ush-header-inner">
          <Link href="/" className="ush-brand" aria-label={`${settings.site_title} home`}>
            <span className="ush-logo-wrap" style={{ width: logoWidth, height: logoWidth, borderRadius: logoRadius }}>
              <Image src={logoPath} alt={`${settings.site_title} logo`} fill sizes={`${logoWidth}px`} className="object-contain" priority />
            </span>
            <span className="ush-brand-copy">
              <span>{settings.site_title}</span>
              <small>{settings.site_tagline}</small>
            </span>
          </Link>
          <nav className="ush-nav" style={{ color: navTextColor, fontSize: navFontSize }} aria-label="Primary navigation">
            <a href="#model">Operating model</a>
            <a href="#support">Who we help</a>
            <a href="#platform">Platform</a>
            <a href="#contact">Contact</a>
          </nav>
          <Link href={signInHref} className="ush-signin">
            <KeyRound className="h-4 w-4" /> Sign in
          </Link>
        </div>
      </header>

      <section className="ush-hero">
        <div className="ush-hero-grid">
          <div className="ush-hero-copy">
            <p className="ush-badge"><websiteIcons.Sparkles className="h-4 w-4" /> {heroBadge}</p>
            <h1 style={{ color: heroTextColor, fontSize: `clamp(2.65rem, 6.2vw, ${headingFontSize}px)` }}>{settings.hero_heading}</h1>
            <p className="ush-hero-lede" style={{ color: bodyTextColor, fontSize: heroBodyFontSize }}>{settings.hero_body}</p>
            <div className="ush-hero-actions">
              <Link href={signInHref} className="ush-cta-primary">
                Sign in to ERP <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#contact" className="ush-cta-secondary">Speak to us</a>
            </div>
            <div className="ush-trust-strip" aria-label="Trust signals">
              {websiteTrustSignals.map((item) => (
                <span key={item}><ShieldCheck className="h-4 w-4" /> {item}</span>
              ))}
            </div>
          </div>

          <div className="ush-hero-visual" aria-label="Operational platform preview">
            <div className="ush-orbit ush-orbit-one" />
            <div className="ush-orbit ush-orbit-two" />
            <div className="ush-dashboard-card ush-dashboard-main">
              <div className="ush-window-dots"><span /><span /><span /></div>
              <p className="ush-mini-label">Live operating picture</p>
              <div className="ush-meter">
                <span style={{ width: "82%" }} />
              </div>
              <div className="ush-mini-grid">
                {websiteOperatingMetrics.map((item) => (
                  <div key={item.label}>
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="ush-dashboard-card ush-floating-card ush-float-one">
              <websiteIcons.CalendarCheck className="h-5 w-5" />
              <span>Support visit due</span>
            </div>
            <div className="ush-dashboard-card ush-floating-card ush-float-two">
              <websiteIcons.LockKeyhole className="h-5 w-5" />
              <span>Secure document store</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ush-proof-grid" aria-label="Business strengths">
        {websiteHeroProofCards.map(({ title, text, icon: Icon }) => (
          <article key={title}>
            <Icon className="h-7 w-7" style={{ color: accent }} />
            <h2 style={{ color: primary, fontSize: cardHeadingFontSize }}>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section id="model" className="ush-section ush-model">
        <div className="ush-section-head">
          <p className="ush-kicker" style={{ color: accent }}>The {settings.site_title} way</p>
          <h2 style={{ color: primary }}>{processHeading}</h2>
          <p>{processBody}</p>
        </div>
        <div className="ush-timeline">
          {websiteOperatingSteps.map(({ step, title, text, icon: Icon }) => (
            <article key={title}>
              <span className="ush-step-number">{step}</span>
              <Icon className="h-7 w-7" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicServiceSelector primary={primary} accent={accent} />

      <section id="platform" className="ush-section ush-platform">
        <div className="ush-section-head">
          <p className="ush-kicker" style={{ color: accent }}>Connected platform</p>
          <h2 style={{ color: primary }}>A single operating layer for housing, support and accountability.</h2>
          <p>Each part of the service is designed to connect, so staff can move from a referral to a tenancy, from a support note to a report, and from rent activity to management oversight.</p>
        </div>
        <div className="ush-service-grid">
          {websiteServices.map(({ title, text, icon: Icon }) => (
            <article key={title}>
              <Icon className="h-7 w-7" style={{ color: accent }} />
              <h3 style={{ color: primary }}>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ush-comparison" aria-label="Operational comparison">
        <div>
          <p className="ush-kicker" style={{ color: accent }}>Why it matters</p>
          <h2 style={{ color: primary }}>Less chasing. More evidence. Better decisions.</h2>
        </div>
        <div className="ush-compare-grid">
          <article>
            <h3>Without a connected model</h3>
            <ul>
              <li>Referral details sit in inboxes.</li>
              <li>Documents are hard to locate.</li>
              <li>Support evidence is fragmented.</li>
              <li>Rent and risk signals arrive late.</li>
            </ul>
          </article>
          <article className="is-positive">
            <h3>With {settings.site_title}</h3>
            <ul>
              <li>Referrals move through a visible pipeline.</li>
              <li>Tenant, property and finance records connect.</li>
              <li>Support notes build an audit trail.</li>
              <li>Managers see live storyboards and BI reports.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="ush-faq" aria-label="Frequently asked questions">
        <div className="ush-section-head">
          <p className="ush-kicker" style={{ color: accent }}>Common questions</p>
          <h2 style={{ color: primary }}>Clear answers for first-time visitors.</h2>
        </div>
        <div className="ush-faq-list">
          <details>
            <summary>What does {settings.site_title} manage?</summary>
            <p>Supported accommodation operations including residents, properties, support evidence, documents, rent tracking, CRM referrals, compliance and reporting.</p>
          </details>
          <details>
            <summary>Who is the ERP sign-in for?</summary>
            <p>The secure ERP is for authorised staff and administrators. Public visitors should use the contact details below for enquiries.</p>
          </details>
          <details>
            <summary>Can councils and partners get reports?</summary>
            <p>The platform is designed to support council-ready summaries, outcome evidence, compliance records and management reporting.</p>
          </details>
        </div>
      </section>

      <section id="contact" className="ush-contact">
        <div>
          <p className="ush-kicker" style={{ color: accent }}>Contact</p>
          <h2>Need to speak to the team?</h2>
          <p>{settings.footer_note || settings.site_tagline}</p>
        </div>
        <div className="ush-contact-card">
          <p><Phone className="h-4 w-4" /> {settings.contact_phone || "Phone details can be added by the admin."}</p>
          <p><FileText className="h-4 w-4" /> {settings.contact_email}</p>
          {settings.contact_address ? <p><MapPinned className="h-4 w-4" /> {settings.contact_address}</p> : null}
          <Link href={signInHref} className="ush-cta-primary">Staff sign in <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="ush-footer" style={{ fontSize: footerFontSize }}>
        <p><strong>{settings.site_title}</strong> - {settings.site_tagline}</p>
        <Link href={signInHref}>Secure staff sign in</Link>
      </footer>

      <div className="ush-sticky-cta">
        <span>{settings.site_title}</span>
        <div>
          <a href="#contact">Contact</a>
          <Link href={signInHref}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}
