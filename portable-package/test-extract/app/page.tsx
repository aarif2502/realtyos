import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Building2, FileText, HeartHandshake, Home, Phone, ShieldCheck, UserRoundCheck, Wrench } from "lucide-react";
import { databaseConfigured } from "@/lib/db";
import { defaultWebsiteSettings, getWebsiteSettings } from "@/lib/erp-repository";

export const dynamic = "force-dynamic";

const signInHref = "/realtyos/admin/login";

const quickLinks = [
  { title: "Residents", text: "Support, tenancy information, documents, and weekly engagement.", icon: HeartHandshake },
  { title: "Repairs", text: "Report maintenance concerns and track property incidents.", icon: Wrench },
  { title: "Landlords", text: "Property assignments, contracts, rent ledger, and documents.", icon: Building2 },
  { title: "Referrals", text: "Eligibility checks, safe placements, and move-on readiness.", icon: UserRoundCheck },
];

const services = [
  "Supported accommodation management",
  "Housing benefit and rent ledger administration",
  "Property compliance and document storage",
  "Weekly resident support note tracking",
  "Landlord and owner account management",
  "Operational reporting for managers",
];

async function loadSettings() {
  if (!databaseConfigured()) return defaultWebsiteSettings;
  return getWebsiteSettings();
}

export default async function HomePage() {
  const settings = await loadSettings();
  const primary = String(settings.primary_color || defaultWebsiteSettings.primary_color);
  const secondary = String(settings.secondary_color || defaultWebsiteSettings.secondary_color);
  const accent = String(settings.accent_color || defaultWebsiteSettings.accent_color);
  const logoPath = String(settings.logo_path || defaultWebsiteSettings.logo_path);
  const logoWidth = Math.max(56, Math.min(180, Number(settings.logo_width || defaultWebsiteSettings.logo_width)));
  const logoRadius = Math.max(0, Math.min(32, Number(settings.logo_radius || defaultWebsiteSettings.logo_radius)));
  const bodyFontSize = Math.max(14, Math.min(20, Number(settings.body_font_size || defaultWebsiteSettings.body_font_size)));
  const headingFontSize = Math.max(36, Math.min(72, Number(settings.heading_font_size || defaultWebsiteSettings.heading_font_size)));
  const navFontSize = Math.max(12, Math.min(18, Number(settings.nav_font_size || defaultWebsiteSettings.nav_font_size)));
  const heroBodyFontSize = Math.max(15, Math.min(24, Number(settings.hero_body_font_size || defaultWebsiteSettings.hero_body_font_size)));
  const cardHeadingFontSize = Math.max(16, Math.min(28, Number(settings.card_heading_font_size || defaultWebsiteSettings.card_heading_font_size)));
  const footerFontSize = Math.max(12, Math.min(18, Number(settings.footer_font_size || defaultWebsiteSettings.footer_font_size)));
  const fontFamily = String(settings.body_font_family || defaultWebsiteSettings.body_font_family);
  const navTextColor = String(settings.nav_text_color || defaultWebsiteSettings.nav_text_color);
  const heroTextColor = String(settings.hero_text_color || defaultWebsiteSettings.hero_text_color);
  const bodyTextColor = String(settings.body_text_color || defaultWebsiteSettings.body_text_color);

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-[#172033]" style={{ "--brand-primary": primary, "--brand-secondary": secondary, "--brand-accent": accent, fontFamily, fontSize: bodyFontSize } as CSSProperties}>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative overflow-hidden bg-white" style={{ width: logoWidth, height: logoWidth, borderRadius: logoRadius }}>
              <Image src={logoPath} alt={`${settings.site_title} logo`} fill sizes={`${logoWidth}px`} className="object-contain" priority />
            </span>
            <span>
              <span className="block text-xl font-bold tracking-tight md:text-2xl">{settings.site_title}</span>
              <span className="block text-xs uppercase tracking-[0.14em] text-slate-500">{settings.site_tagline}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 font-semibold md:flex" style={{ color: navTextColor, fontSize: navFontSize }}>
            <a href="#your-home">Your home</a>
            <a href="#support">Support services</a>
            <a href="#landlords">Landlords</a>
            <a href="#contact">Contact</a>
          </nav>
          <Link href={signInHref} className="inline-flex rounded-sm px-5 py-3 text-sm font-bold text-white transition" style={{ backgroundColor: primary }}>
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ backgroundColor: primary }}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center opacity-30" />
        <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-end px-5 py-12">
          <div className="mb-5 max-w-2xl p-7 shadow-2xl md:p-10" style={{ backgroundColor: secondary, color: heroTextColor }}>
            <p className="text-sm font-bold uppercase tracking-[0.18em]">Housing support that keeps people safe</p>
            <h1 className="mt-4 font-black leading-tight" style={{ fontSize: `clamp(2.25rem, 5vw, ${headingFontSize}px)` }}>{settings.hero_heading}</h1>
            <p className="mt-5 max-w-xl leading-8" style={{ fontSize: heroBodyFontSize }}>{settings.hero_body}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={signInHref} className="rounded-sm px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: primary }}>
                Sign in to RealtyOS
              </Link>
              <a href="#contact" className="rounded-sm border-2 px-6 py-3 text-sm font-bold" style={{ borderColor: primary, color: primary }}>
                Contact us
              </a>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Quick actions" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-px border-x border-stone-200 bg-stone-200 md:grid-cols-4">
          {quickLinks.map((item) => (
            <a key={item.title} href={item.title === "Landlords" ? "#landlords" : "#support"} className="group bg-white p-6 transition hover:bg-amber-50">
              <item.icon className="h-8 w-8" style={{ color: accent }} />
              <h2 className="mt-4 font-extrabold" style={{ color: primary, fontSize: cardHeadingFontSize }}>{item.title}</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: bodyTextColor }}>{item.text}</p>
              <span className="mt-5 inline-block text-sm font-bold group-hover:underline" style={{ color: primary }}>Find out more</span>
            </a>
          ))}
        </div>
      </section>

      <section id="your-home" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>Your home</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl" style={{ color: primary }}>Practical help for residents and housing teams.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <div key={service} className="border border-stone-200 bg-white p-5">
              <ShieldCheck className="h-6 w-6" style={{ color: accent }} />
              <p className="mt-3 font-bold" style={{ color: primary }}>{service}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="support" className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-3">
          {[
            { title: "Manage accommodation", icon: Home, text: "Track rooms, residents, property metadata, repairs and operational risk from one managed platform." },
            { title: "Keep records clear", icon: FileText, text: "Create contracts, upload documents, and maintain auditable support and finance records." },
            { title: "Work with partners", icon: Phone, text: "Support referrals, landlords, finance teams and managers with live reporting and accountable workflows." },
          ].map((item) => (
            <article key={item.title} className="border-t-4 bg-stone-50 p-7" style={{ borderColor: secondary }}>
              <item.icon className="h-8 w-8" style={{ color: primary }} />
              <h3 className="mt-5 text-2xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="landlords" className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>Landlords and partners</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl" style={{ color: primary }}>A clean operational view for every property.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            RealtyOS connects property assignments, tenancy contracts, rent ledgers and document storage so the housing operation can scale without losing control.
          </p>
        </div>
        <div className="p-7 text-white" style={{ backgroundColor: primary }}>
          <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: secondary }}>Secure workspace</p>
          <h3 className="mt-3 text-3xl font-black">Already part of the team?</h3>
          <p className="mt-4 leading-7 text-slate-200">Staff can sign in to manage tenants, properties, contracts, payments, documents and reports.</p>
          <Link href={signInHref} className="mt-6 inline-flex rounded-sm px-6 py-3 text-sm font-bold" style={{ backgroundColor: secondary, color: primary }}>
            Sign in to RealtyOS
          </Link>
        </div>
      </section>

      <footer id="contact" className="text-white" style={{ backgroundColor: primary }}>
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-3" style={{ fontSize: footerFontSize }}>
          <div>
            <p className="text-lg font-black">{settings.site_title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{settings.footer_note || settings.site_tagline}</p>
          </div>
          <div>
            <p className="font-bold">Contact</p>
            <p className="mt-3 text-sm text-slate-300">Email: {settings.contact_email}</p>
            {settings.contact_phone ? <p className="mt-1 text-sm text-slate-300">Phone: {settings.contact_phone}</p> : null}
            {settings.contact_address ? <p className="mt-1 text-sm text-slate-300">{settings.contact_address}</p> : null}
            <p className="mt-1 text-sm text-slate-300">For urgent resident issues, contact your support worker or housing officer.</p>
          </div>
          <div className="md:text-right">
            <Link href={signInHref} className="inline-flex rounded-sm bg-white px-5 py-3 text-sm font-bold" style={{ color: primary }}>Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
