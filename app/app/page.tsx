"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Banknote, BedDouble, Building2, ClipboardCheck, FileArchive, Plus, Search, ShieldCheck, Sparkles, UserRoundPlus, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  properties?: Array<{ id: string; address: string; local_authority?: string; total_rooms?: number }>;
  rooms?: Array<{ id: string; property_id: string; status: string; weekly_rent?: string }>;
  tenants?: Array<{ id: string; first_name?: string; last_name?: string; record_status?: string | null; status_reason?: string | null; checkout_date?: string | null; risk_assessment?: string | null; property_id?: string; room_id?: string }>;
  occupancyRecords?: Array<{ id: string; record_status?: string; status_reason?: string; property_id?: string; room_id?: string; room_label?: string; tenant_id?: string }>;
  claims?: Array<{ amount?: string; status?: string }>;
  incidents?: Array<{ status?: string; severity?: string }>;
  referrals?: Array<{ status?: string }>;
  supportPlans?: Array<{ status?: string; review_date?: string }>;
  automationTasks?: Array<{ status?: string; due_date?: string }>;
  propertyCertificates?: Array<{ id: string; status?: string; certificate_type?: string; expiry_date?: string; property_id?: string }>;
  summary?: { remittanceReceived?: number; unmatchedRemittanceLines?: number; onwardPaymentsPending?: number; councilTaxNeedsReview?: number };
};

type BI = {
  dashboards?: any;
  trends?: any;
  predictive?: any;
  alerts?: Array<{ title: string; detail: string; action: string; priority: string }>;
};

const storyTabs = [
  ["portfolio", "Portfolio"],
  ["support", "Support"],
  ["finance", "Finance"],
  ["risk", "Risk"],
] as const;

function money(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}

function pct(value: number) {
  return `${Math.round(Number(value || 0))}%`;
}

export default function OverviewPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [bi, setBi] = useState<BI>({});
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<(typeof storyTabs)[number][0]>("portfolio");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    Promise.all([
      fetch("/api/erp", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
      fetch("/api/reports/bi", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
    ]).then(([erpPayload, biPayload]) => {
      setSnapshot(erpPayload);
      setBi(biPayload);
    }).finally(() => setLoading(false));
  }, []);

  const currency = snapshot.agency?.currency_code ?? "GBP";
  const activeOccupancy = (snapshot.occupancyRecords ?? []).filter((record) => !["expired", "archived", "superseded", "vacant"].includes(String(record.record_status || "").toLowerCase()));
  const activeOccupancyTenantIds = new Set(activeOccupancy.map((record) => record.tenant_id).filter(Boolean));
  const activeOccupancyRoomKeys = new Set(
    activeOccupancy
      .map((record) => record.room_id ? `room:${record.room_id}` : record.room_label ? `label:${record.property_id || "none"}:${record.room_label}` : null)
      .filter(Boolean),
  );
  const activeTenants = activeOccupancyTenantIds.size || (snapshot.tenants?.filter((tenant) => !tenant.checkout_date).length ?? 0);
  const occupiedRooms = activeOccupancyRoomKeys.size || (snapshot.rooms?.filter((room) => room.status === "occupied").length ?? 0);
  const declaredTotalRooms = (snapshot.properties ?? []).reduce((sum, property) => sum + Number(property.total_rooms || 0), 0);
  const totalRooms = declaredTotalRooms > 0 ? declaredTotalRooms : snapshot.rooms?.length ?? 0;
  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const portfolioRows = bi.dashboards?.portfolio?.rows || [];
  const monthlyRows = bi.trends?.monthly || [];
  const supportRows = bi.dashboards?.support?.rows || [];
  const alerts = bi.alerts || [];
  const highRisk = snapshot.tenants?.filter((tenant) => tenant.risk_assessment === "HIGH").length ?? 0;
  const openIncidents = snapshot.incidents?.filter((incident) => incident.status !== "closed").length ?? 0;
  const arrears = bi.dashboards?.finance?.kpis?.arrears ?? 0;
  const expiredCertificates = snapshot.propertyCertificates?.filter((certificate) => certificate.status === "expired").length ?? 0;
  const expiringCertificates = snapshot.propertyCertificates?.filter((certificate) => certificate.status === "expiring_soon").length ?? 0;
  const certificateAlertCount = expiredCertificates + expiringCertificates;
  const remittanceReceived = snapshot.summary?.remittanceReceived ?? 0;
  const unmatchedRemittanceLines = snapshot.summary?.unmatchedRemittanceLines ?? 0;
  const onwardPaymentsPending = snapshot.summary?.onwardPaymentsPending ?? 0;
  const councilTaxNeedsReview = snapshot.summary?.councilTaxNeedsReview ?? 0;
  const recordStatusRows = snapshot.occupancyRecords?.length ? snapshot.occupancyRecords : snapshot.tenants ?? [];
  const statusCounts = recordStatusRows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.record_status || "needs_review");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const statusCards = [
    { key: "active", label: "Active", tone: "active" as const },
    { key: "vacant", label: "Vacant", tone: "pending" as const },
    { key: "pending", label: "Pending", tone: "pending" as const },
    { key: "ending_soon", label: "Ending Soon", tone: "pending" as const },
    { key: "expired", label: "Expired", tone: "overdue" as const },
    { key: "needs_review", label: "Needs Review", tone: "overdue" as const },
  ];
  const needsReviewRows = (snapshot.tenants ?? []).filter((tenant) => tenant.record_status === "needs_review").slice(0, 6);

  const heroTiles = [
    { label: "Residents", value: activeTenants, helper: "active tenant records", icon: Users },
    { label: "Occupancy", value: pct(occupancyRate), helper: `${occupiedRooms}/${totalRooms} rooms occupied`, icon: BedDouble },
    { label: "Certificate Alerts", value: certificateAlertCount, helper: `${expiredCertificates} expired · ${expiringCertificates} expiring soon`, icon: ClipboardCheck },
    { label: "Open risk items", value: openIncidents + highRisk, helper: `${highRisk} high-risk tenants`, icon: AlertTriangle },
    { label: "Cycle Remittance", value: money(remittanceReceived, currency), helper: `${unmatchedRemittanceLines} unmatched lines`, icon: Banknote },
    { label: "Payment Actions", value: onwardPaymentsPending, helper: `${councilTaxNeedsReview} council tax rows need review`, icon: ClipboardCheck },
  ];

  const actions = [
    { label: "Find tenant", href: "/app/tenants", icon: Search },
    { label: "Add support note", href: "/app/support-notes", icon: Plus },
    { label: "Open rent ledger", href: "/app/payments", icon: Banknote },
    { label: "Upload document", href: "/app/documents", icon: FileArchive },
    { label: "Manage property", href: "/app/properties", icon: Building2 },
    { label: "Create contract", href: "/app/contracts", icon: Plus },
    { label: "New referral", href: "/app/crm", icon: UserRoundPlus },
    { label: "Support plan", href: "/app/compliance", icon: ClipboardCheck },
  ];
  const priorities = [
    { label: "Open referrals", value: `${snapshot.referrals?.filter((referral) => !["rejected", "converted"].includes(referral.status ?? "")).length ?? 0} referrals in progress`, icon: UserRoundPlus },
    { label: "Support plan reviews", value: `${snapshot.supportPlans?.filter((plan) => plan.review_date && new Date(plan.review_date).getTime() < now).length ?? 0} reviews overdue`, icon: ShieldCheck },
    { label: "Overdue reminders", value: `${snapshot.automationTasks?.filter((task) => task.status !== "done" && task.due_date && new Date(task.due_date).getTime() < now).length ?? 0} tasks overdue`, icon: ClipboardCheck },
    { label: "Housing benefit claims", value: `${snapshot.claims?.filter((claim) => claim.status !== "paid").length ?? 0} claims not marked paid`, icon: Banknote },
  ];

  const occupancyPie = [
    { name: "Occupied", value: occupiedRooms, color: "#16a34a" },
    { name: "Available / void", value: Math.max(0, totalRooms - occupiedRooms), color: "#f59e0b" },
  ];

  const storyCopy: Record<string, { title: string; text: string; metric: string; link: string }> = {
    portfolio: { title: "Portfolio health", text: "Track occupancy, void pressure, property revenue and rooms that need operational attention.", metric: pct(occupancyRate), link: "/app/properties" },
    support: { title: "Support delivery", text: "See who needs contact, where weekly notes are missing, and how support sessions connect to outcomes.", metric: String(bi.dashboards?.support?.kpis?.sessions ?? 0), link: "/app/support-notes" },
    finance: { title: "Rent and benefits", text: "Watch rent due, collected payments, HB/UC delays and arrears so finance can act early.", metric: money(arrears, currency), link: "/app/payments" },
    risk: { title: "Safeguarding focus", text: "Surface incidents, high-risk residents, overdue reviews and placement risks before they escalate.", metric: String(openIncidents + highRisk), link: "/app/compliance" },
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-xl">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
              <Sparkles className="h-4 w-4" /> Live operational overview
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-5xl">One command centre for homes, people, support and money.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">A visual story built from the live PostgreSQL ERP: portfolio pressure, tenancy movement, support workload, finance risk and the actions your staff need today.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/app/analytics" className="button-primary bg-amber-300 text-slate-950 hover:bg-amber-200">Open BI Reports</Link>
              <Link href="/app/setup" className="button-secondary border-white/20 bg-white/10 text-white hover:bg-white/15">Admin Setup</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {heroTiles.map((tile) => (
              <article key={tile.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3 text-slate-300">
                  <p className="text-xs uppercase tracking-[0.14em]">{tile.label}</p>
                  <tile.icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-black">{loading ? "..." : tile.value}</p>
                <p className="mt-1 text-xs text-slate-400">{tile.helper}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard title="Executive Story Board" subtitle="Click a story to change the charts and narrative without leaving the overview.">
          <div className="mb-4 flex flex-wrap gap-2">
            {storyTabs.map(([id, label]) => (
              <button key={id} className={story === id ? "button-primary" : "button-secondary"} onClick={() => setStory(id)}>{label}</button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <article className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Current story</p>
              <h2 className="mt-3 text-2xl font-black">{storyCopy[story].title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{storyCopy[story].text}</p>
              <p className="mt-6 text-5xl font-black text-amber-200">{storyCopy[story].metric}</p>
              <Link href={storyCopy[story].link} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-amber-200">Open records <ArrowRight className="h-4 w-4" /></Link>
            </article>
            <div className="h-[360px] rounded-2xl border border-slate-200 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                {story === "finance" ? (
                  <AreaChart data={monthlyRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Area dataKey="due" stroke="#334155" fill="#cbd5e1" /><Area dataKey="collected" stroke="#16a34a" fill="#bbf7d0" /></AreaChart>
                ) : story === "support" ? (
                  <BarChart data={supportRows.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="tenant" hide /><YAxis /><Tooltip /><Bar dataKey="supportSessions" fill="#0ea5e9" /><Bar dataKey="outcomeScore" fill="#22c55e" /></BarChart>
                ) : story === "risk" ? (
                  <BarChart data={(bi.predictive?.arrearsRisk || []).slice(0, 10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="tenant" hide /><YAxis /><Tooltip /><Bar dataKey="arrearsRisk" fill="#e11d48" /><Bar dataKey="placementFailureRisk" fill="#f59e0b" /></BarChart>
                ) : (
                  <BarChart data={portfolioRows.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="property" hide /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#0f766e" /><Bar dataKey="arrears" fill="#e11d48" /><Bar dataKey="issues" fill="#f59e0b" /></BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Occupancy Pulse" subtitle="Occupied rooms against all configured rooms">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={occupancyPie} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                  {occupancyPie.map((row) => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 text-sm">
            {occupancyPie.map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />{row.name}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Record Status Control" subtitle="Automatic PMS status calculated from imported tenant-cycle data and current occupancy dates">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {statusCards.map((status) => (
            <article key={status.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <StatusBadge label={status.label} tone={status.tone} />
              <p className="mt-3 text-3xl font-black text-slate-950">{statusCounts[status.key] || 0}</p>
              <p className="mt-1 text-xs text-slate-500">occupancy record(s)</p>
            </article>
          ))}
        </div>
        {needsReviewRows.length ? (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-rose-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-rose-50 text-rose-900">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Record Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {needsReviewRows.map((tenant) => (
                  <tr key={tenant.id} className="border-t border-rose-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{`${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || "Tenant record"}</td>
                    <td className="px-4 py-3"><StatusBadge label="Needs Review" tone="overdue" /></td>
                    <td className="px-4 py-3 text-slate-600">{tenant.status_reason || "Imported data needs admin review."}</td>
                    <td className="px-4 py-3"><Link href="/app/tenants" className="button-secondary">Open tenants</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Today’s Priorities" subtitle="Short, practical list for managers and support staff">
          <div className="space-y-3 text-sm">
            {priorities.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <Icon className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="font-semibold text-slate-900">{label}</p>
                  <p className="text-slate-600">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick Workbench" subtitle="Fast routes for day-to-day supported housing work">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm transition hover:-translate-y-0.5 hover:bg-slate-50">
                <action.icon className="h-5 w-5 text-slate-600" />
                <p className="mt-3 font-semibold text-slate-900">{action.label}</p>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      {alerts.length ? (
        <SectionCard title="Automated Signals" subtitle="Rule-based early warning alerts from live ERP data">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {alerts.slice(0, 6).map((alert) => (
              <article key={alert.title} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-semibold text-amber-950">{alert.title}</p>
                <p className="mt-1 text-amber-800">{alert.action}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
