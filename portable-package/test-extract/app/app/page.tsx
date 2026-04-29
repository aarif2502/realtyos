"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Banknote, BedDouble, Building2, ClipboardCheck, FileArchive, Plus, Search, UserRoundPlus, Users } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  staff?: unknown[];
  properties?: Array<{ id: string; address: string; total_rooms?: number }>;
  rooms?: Array<{ id: string; property_id: string; status: string; weekly_rent?: string }>;
  tenants?: Array<{ id: string; checkout_date?: string | null; risk_assessment?: string | null }>;
  supportNotes?: unknown[];
  documents?: unknown[];
  claims?: Array<{ amount?: string; status?: string }>;
  incidents?: Array<{ status?: string; severity?: string }>;
  referrals?: Array<{ status?: string }>;
  supportPlans?: Array<{ status?: string; review_date?: string }>;
  automationTasks?: Array<{ status?: string; due_date?: string }>;
  summary?: {
    residents: number;
    occupancyRate: number;
    openIncidents: number;
    highRiskResidents: number;
    weeklyHousingBenefit: number;
    voids: number;
  };
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setSnapshot(payload))
      .finally(() => setLoading(false));
  }, []);

  const currency = snapshot.agency?.currency_code ?? "GBP";
  const activeTenants = snapshot.tenants?.filter((tenant) => !tenant.checkout_date).length ?? 0;
  const occupiedRooms = snapshot.rooms?.filter((room) => room.status === "occupied").length ?? 0;
  const totalRooms = snapshot.rooms?.length ?? 0;
  const weeklyRentRoll = useMemo(
    () => (snapshot.rooms ?? []).filter((room) => room.status === "occupied").reduce((sum, room) => sum + Number(room.weekly_rent ?? 0), 0),
    [snapshot.rooms],
  );
  const tiles = [
    { label: "Active Tenants", value: activeTenants, helper: "Live residents without checkout date", icon: Users },
    { label: "Properties", value: snapshot.properties?.length ?? 0, helper: `${totalRooms} configured rooms`, icon: Building2 },
    { label: "Occupancy", value: totalRooms ? `${Math.round((occupiedRooms / totalRooms) * 100)}%` : "0%", helper: `${occupiedRooms}/${totalRooms} rooms occupied`, icon: BedDouble },
    { label: "Weekly Rent Roll", value: money(weeklyRentRoll, currency), helper: "Based on occupied room rates", icon: Banknote },
  ];

  const actions = [
    { label: "Find a tenant", href: "/app/tenants", icon: Search },
    { label: "Add support note", href: "/app/support-notes", icon: Plus },
    { label: "Open rent ledger", href: "/app/payments", icon: Banknote },
    { label: "Upload document", href: "/app/documents", icon: FileArchive },
    { label: "Manage property", href: "/app/properties", icon: Building2 },
    { label: "Create contract", href: "/app/contracts", icon: Plus },
    { label: "New referral", href: "/app/crm", icon: UserRoundPlus },
    { label: "Support plan", href: "/app/compliance", icon: ClipboardCheck },
  ];

  const modules = [
    { title: "PMS", text: "Tenants, properties, maintenance, documents and rent tracking.", href: "/app/tenants" },
    { title: "CRM", text: "Referrers, councils, partner contacts, referrals and communication logs.", href: "/app/crm" },
    { title: "Compliance", text: "Support plans, case notes, weekly check-ins, risk and safeguarding.", href: "/app/compliance" },
    { title: "Finance", text: "Rent reconciliation, HB/UC tracking, expenses and landlord payments.", href: "/app/finance" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <article key={tile.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{tile.label}</p>
              <tile.icon className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{loading ? "..." : tile.value}</p>
            <p className="mt-1 text-xs text-slate-500">{tile.helper}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <SectionCard title="Core Stack" subtitle="One workflow from referral to tenancy, support delivery and finance">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => (
              <Link key={module.title} href={module.href} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm transition hover:-translate-y-0.5 hover:bg-slate-50">
                <p className="font-semibold text-slate-900">{module.title}</p>
                <p className="mt-2 text-slate-600">{module.text}</p>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Common Tasks" subtitle="Quick routes for day-to-day supported housing work">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm transition hover:-translate-y-0.5 hover:bg-slate-50">
                <action.icon className="h-5 w-5 text-slate-600" />
                <p className="mt-3 font-semibold text-slate-900">{action.label}</p>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Needs Attention" subtitle="Small list of work that may need review">
          <div className="space-y-3 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">Open referrals</p>
              <p className="mt-1 text-slate-600">{snapshot.referrals?.filter((referral) => !["rejected", "converted"].includes(referral.status ?? "")).length ?? 0} referrals are still in progress.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">Support plan reviews</p>
              <p className="mt-1 text-slate-600">{snapshot.supportPlans?.filter((plan) => plan.review_date && new Date(plan.review_date).getTime() < Date.now()).length ?? 0} plans have passed their review date.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">Overdue reminders</p>
              <p className="mt-1 text-slate-600">{snapshot.automationTasks?.filter((task) => task.status !== "done" && task.due_date && new Date(task.due_date).getTime() < Date.now()).length ?? 0} tasks are overdue.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">Void rooms</p>
              <p className="mt-1 text-slate-600">{snapshot.rooms?.filter((room) => room.status !== "occupied").length ?? 0} rooms are not occupied.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">Housing benefit claims</p>
              <p className="mt-1 text-slate-600">{snapshot.claims?.filter((claim) => claim.status !== "paid").length ?? 0} claims are not marked paid.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">Incidents</p>
              <p className="mt-1 text-slate-600">{snapshot.incidents?.filter((incident) => incident.status !== "closed").length ?? 0} incidents remain open.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">High risk tenants</p>
              <p className="mt-1 text-slate-600">{snapshot.tenants?.filter((tenant) => tenant.risk_assessment === "HIGH").length ?? 0} tenant records are marked high risk.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
