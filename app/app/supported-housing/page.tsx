"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  BedDouble,
  ClipboardCheck,
  FilePlus2,
  Home,
  ListChecks,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { SlidePanel } from "@/components/SlidePanel";
import { StatusBadge } from "@/components/StatusBadge";
import { useSupportedHousing } from "@/hooks/useSupportedHousing";
import type { SupportedIncident, SupportedReferral, SupportedResident, SupportedTask } from "@/lib/supported-housing-store";
import { cn } from "@/lib/utils";

const tabs = ["Command", "Residents", "Referrals", "Support", "Compliance", "Finance"] as const;
type Tab = (typeof tabs)[number];

const riskTone = {
  Low: "status-active",
  Medium: "status-pending",
  High: "status-overdue",
};

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

function fieldValue(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export default function SupportedHousingPage() {
  const {
    summary,
    residents,
    referrals,
    properties,
    incidents,
    tasks,
    claims,
    compliance,
    loading,
    saving,
    error,
    createRecord,
    updateRecord,
  } = useSupportedHousing();
  const [tab, setTab] = useState<Tab>("Command");
  const [panel, setPanel] = useState<"resident" | "referral" | "incident" | "task" | null>(null);

  const highPriorityReferrals = useMemo(
    () => referrals.filter((referral) => ["High", "Urgent"].includes(referral.priority)),
    [referrals],
  );
  const openSafeguarding = incidents.filter((incident) => incident.status !== "Closed");
  const readyForMoveOn = residents.filter((resident) => resident.status === "Move-on Ready");

  async function submitResident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createRecord<SupportedResident>("residents", {
      name: fieldValue(form, "name"),
      age: Number(fieldValue(form, "age") || 0),
      property: fieldValue(form, "property"),
      room: fieldValue(form, "room"),
      referralSource: fieldValue(form, "referralSource"),
      moveIn: fieldValue(form, "moveIn"),
      riskLevel: fieldValue(form, "riskLevel") as SupportedResident["riskLevel"],
      status: "Active",
      supportWorker: fieldValue(form, "supportWorker"),
      weeklyRent: Number(fieldValue(form, "weeklyRent") || 0),
      arrears: 0,
      nextReview: fieldValue(form, "nextReview"),
      supportGoals: fieldValue(form, "supportGoals").split(",").map((goal) => goal.trim()).filter(Boolean),
    });
    setPanel(null);
  }

  async function submitReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createRecord<SupportedReferral>("referrals", {
      applicant: fieldValue(form, "applicant"),
      source: fieldValue(form, "source"),
      priority: fieldValue(form, "priority") as SupportedReferral["priority"],
      status: "New",
      received: new Date().toISOString().slice(0, 10),
      needs: fieldValue(form, "needs").split(",").map((need) => need.trim()).filter(Boolean),
      assignedTo: fieldValue(form, "assignedTo"),
    });
    setPanel(null);
  }

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createRecord<SupportedIncident>("incidents", {
      resident: fieldValue(form, "resident"),
      property: fieldValue(form, "property"),
      category: fieldValue(form, "category"),
      severity: fieldValue(form, "severity") as SupportedIncident["severity"],
      status: "Open",
      reportedAt: new Date().toISOString(),
      owner: fieldValue(form, "owner"),
      summary: fieldValue(form, "summary"),
    });
    setPanel(null);
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createRecord<SupportedTask>("tasks", {
      title: fieldValue(form, "title"),
      owner: fieldValue(form, "owner"),
      due: fieldValue(form, "due"),
      area: fieldValue(form, "area") as SupportedTask["area"],
      status: "Pending",
    });
    setPanel(null);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active Residents", value: summary.residents, helper: "Across commissioned schemes", icon: Users },
          { label: "Occupancy", value: `${summary.occupancyRate}%`, helper: `${summary.voids} current void rooms`, icon: BedDouble },
          { label: "Open Incidents", value: summary.openIncidents, helper: `${summary.highRiskResidents} high-risk residents`, icon: ShieldAlert },
          { label: "HB Pipeline", value: money(summary.weeklyHousingBenefit), helper: `${money(summary.arrearsTotal)} resident arrears`, icon: Banknote },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <item.icon className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{loading ? "..." : item.value}</p>
            <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-2 overflow-x-auto rounded-full border border-slate-200 bg-white p-1">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                tab === item ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPanel("resident")} className="button-primary gap-2">
            <UserPlus className="h-4 w-4" />
            Resident
          </button>
          <button type="button" onClick={() => setPanel("incident")} className="button-secondary gap-2">
            <AlertTriangle className="h-4 w-4" />
            Incident
          </button>
          <button type="button" onClick={() => setPanel("referral")} className="button-secondary gap-2">
            <FilePlus2 className="h-4 w-4" />
            Referral
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {tab === "Command" ? (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <SectionCard title="Supported Housing Command Centre" subtitle="Live operational position across residents, schemes, risks, and income">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-amber-700">Priority Referrals</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{highPriorityReferrals.length}</p>
                <p className="mt-1 text-sm text-slate-600">Need same-day assessment or documents.</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-rose-700">Safeguarding Watch</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{openSafeguarding.length}</p>
                <p className="mt-1 text-sm text-slate-600">Open incidents requiring owner follow-up.</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Move-on Ready</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{readyForMoveOn.length}</p>
                <p className="mt-1 text-sm text-slate-600">Residents ready for pathway planning.</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="pb-3">Scheme</th>
                    <th className="pb-3">Local Authority</th>
                    <th className="pb-3">Occupancy</th>
                    <th className="pb-3">Voids</th>
                    <th className="pb-3">Compliance</th>
                    <th className="pb-3">Officer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {properties.map((property) => (
                    <tr key={property.id}>
                      <td className="py-4 font-semibold text-slate-900">{property.name}</td>
                      <td className="py-4 text-slate-700">{property.localAuthority}</td>
                      <td className="py-4 text-slate-700">{property.occupied}/{property.units}</td>
                      <td className="py-4 text-slate-700">{property.voids}</td>
                      <td className="py-4 text-slate-700">{property.complianceScore}%</td>
                      <td className="py-4 text-slate-700">{property.housingOfficer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Today"
            subtitle="Actions that keep the agency audit-ready"
            action={<button type="button" onClick={() => setPanel("task")} className="button-secondary py-2">Add Task</button>}
          >
            <div className="space-y-3">
              {tasks.map((task) => (
                <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <StatusBadge label={task.status} tone={task.status === "Done" ? "active" : task.status === "Due Soon" ? "overdue" : "pending"} />
                  </div>
                  <p className="mt-1 text-slate-600">{task.area} | {task.owner} | due {task.due}</p>
                  {task.status !== "Done" ? (
                    <button
                      type="button"
                      onClick={() => updateRecord<SupportedTask>("tasks", { id: task.id, status: "Done" })}
                      className="mt-3 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      Mark done
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "Residents" ? (
        <SectionCard title="Residents and Support Plans" subtitle="Tenancy sustainment, risk, arrears, support goals, and reviews">
          <div className="grid gap-3 xl:grid-cols-3">
            {residents.map((resident) => (
              <article key={resident.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{resident.name}</p>
                    <p className="mt-1 text-slate-600">{resident.property} | {resident.room}</p>
                  </div>
                  <span className={cn("status-badge", riskTone[resident.riskLevel])}>{resident.riskLevel}</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-slate-500">Worker</dt><dd className="font-medium text-slate-900">{resident.supportWorker}</dd></div>
                  <div><dt className="text-slate-500">Review</dt><dd className="font-medium text-slate-900">{resident.nextReview}</dd></div>
                  <div><dt className="text-slate-500">Weekly rent</dt><dd className="font-medium text-slate-900">{money(resident.weeklyRent)}</dd></div>
                  <div><dt className="text-slate-500">Arrears</dt><dd className="font-medium text-slate-900">{money(resident.arrears)}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {resident.supportGoals.map((goal) => <span key={goal} className="chip">{goal}</span>)}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "Referrals" ? (
        <SectionCard title="Referrals Pipeline" subtitle="Track eligibility, evidence, risk, matching, and placement decisions">
          <div className="grid gap-3 lg:grid-cols-2">
            {referrals.map((referral) => (
              <article key={referral.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{referral.applicant}</p>
                    <p className="mt-1 text-slate-600">{referral.source} | received {referral.received}</p>
                  </div>
                  <StatusBadge label={referral.priority} tone={referral.priority === "Urgent" || referral.priority === "High" ? "overdue" : "pending"} />
                </div>
                <p className="mt-3 text-slate-700">Assigned to {referral.assignedTo}</p>
                <div className="mt-3 flex flex-wrap gap-2">{referral.needs.map((need) => <span key={need} className="chip">{need}</span>)}</div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => updateRecord<SupportedReferral>("referrals", { id: referral.id, status: "Accepted" })} className="button-secondary py-2">Accept</button>
                  <button type="button" onClick={() => updateRecord<SupportedReferral>("referrals", { id: referral.id, status: "Declined" })} className="button-secondary py-2">Decline</button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "Support" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Incidents and Safeguarding" subtitle="Record, own, and close operational risk events">
            <div className="space-y-3">
              {incidents.map((incident) => (
                <article key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{incident.category}</p>
                    <StatusBadge label={incident.severity} tone={incident.severity === "High" ? "overdue" : "pending"} />
                  </div>
                  <p className="mt-1 text-slate-600">{incident.resident} | {incident.property} | {incident.owner}</p>
                  <p className="mt-3 text-slate-700">{incident.summary}</p>
                </article>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Support Workload" subtitle="Tasks across support, housing, compliance, and finance">
            <div className="space-y-3">
              {tasks.map((task) => (
                <article key={task.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <ListChecks className="h-4 w-4 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <p className="text-slate-600">{task.owner} | {task.area} | {task.due}</p>
                  </div>
                  <StatusBadge label={task.status} tone={task.status === "Done" ? "active" : "pending"} />
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "Compliance" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Property Compliance" subtitle="Scheme-level certificates and statutory checks">
            <div className="space-y-3">
              {compliance.map((item) => (
                <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <ClipboardCheck className="h-4 w-4 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{item.item}</p>
                    <p className="text-slate-600">{item.property} | expires {item.expiry}</p>
                  </div>
                  <StatusBadge label={item.status} tone={item.status === "Valid" ? "active" : "overdue"} />
                </article>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Void and Room Control" subtitle="Occupancy, charge loss, and housing officer ownership">
            <div className="space-y-3">
              {properties.map((property) => (
                <article key={property.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{property.name}</p>
                    <Home className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="mt-1 text-slate-600">{property.localAuthority}</p>
                  <p className="mt-3 text-slate-700">{property.voids} voids | weekly void loss {money(property.voids * property.weeklyCharge)}</p>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "Finance" ? (
        <SectionCard title="Housing Benefit and Rent Ledger" subtitle="Evidence packs, submissions, payments, and arrears control">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="pb-3">Claim</th>
                  <th className="pb-3">Resident</th>
                  <th className="pb-3">Property</th>
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="py-4 font-semibold text-slate-900">{claim.id}</td>
                    <td className="py-4 text-slate-700">{claim.resident}</td>
                    <td className="py-4 text-slate-700">{claim.property}</td>
                    <td className="py-4 text-slate-700">{claim.period}</td>
                    <td className="py-4 text-slate-700">{money(claim.amount)}</td>
                    <td className="py-4"><StatusBadge label={claim.status} tone={claim.status === "Paid" ? "active" : claim.status === "Evidence Required" ? "overdue" : "pending"} /></td>
                    <td className="py-4">
                      {claim.status !== "Paid" ? (
                        <button type="button" onClick={() => updateRecord("claims", { id: claim.id, status: "Paid", submitted: true })} className="button-secondary py-2">Mark paid</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      <SlidePanel open={panel === "resident"} title="Add Resident" onClose={() => setPanel(null)}>
        <form onSubmit={submitResident} className="grid gap-3">
          <input required name="name" className="ui-input" placeholder="Resident name" />
          <input required name="age" type="number" className="ui-input" placeholder="Age" />
          <input required name="property" className="ui-input" placeholder="Property" />
          <input required name="room" className="ui-input" placeholder="Room" />
          <input required name="referralSource" className="ui-input" placeholder="Referral source" />
          <input required name="moveIn" type="date" className="ui-input" />
          <select name="riskLevel" className="ui-input"><option>Low</option><option>Medium</option><option>High</option></select>
          <input required name="supportWorker" className="ui-input" placeholder="Support worker" />
          <input required name="weeklyRent" type="number" className="ui-input" placeholder="Weekly eligible rent" />
          <input required name="nextReview" type="date" className="ui-input" />
          <textarea name="supportGoals" className="ui-input min-h-24" placeholder="Support goals, comma separated" />
          <button disabled={saving} className="button-primary">{saving ? "Saving..." : "Save Resident"}</button>
        </form>
      </SlidePanel>

      <SlidePanel open={panel === "referral"} title="New Referral" onClose={() => setPanel(null)}>
        <form onSubmit={submitReferral} className="grid gap-3">
          <input required name="applicant" className="ui-input" placeholder="Applicant name" />
          <input required name="source" className="ui-input" placeholder="Referral source" />
          <select name="priority" className="ui-input"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
          <input required name="assignedTo" className="ui-input" placeholder="Assigned worker" />
          <textarea required name="needs" className="ui-input min-h-24" placeholder="Needs, comma separated" />
          <button disabled={saving} className="button-primary">{saving ? "Saving..." : "Create Referral"}</button>
        </form>
      </SlidePanel>

      <SlidePanel open={panel === "incident"} title="Record Incident" onClose={() => setPanel(null)}>
        <form onSubmit={submitIncident} className="grid gap-3">
          <input required name="resident" className="ui-input" placeholder="Resident" />
          <input required name="property" className="ui-input" placeholder="Property" />
          <input required name="category" className="ui-input" placeholder="Category" />
          <select name="severity" className="ui-input"><option>Low</option><option>Medium</option><option>High</option></select>
          <input required name="owner" className="ui-input" placeholder="Case owner" />
          <textarea required name="summary" className="ui-input min-h-28" placeholder="Summary and immediate action" />
          <button disabled={saving} className="button-primary">{saving ? "Saving..." : "Record Incident"}</button>
        </form>
      </SlidePanel>

      <SlidePanel open={panel === "task"} title="Add Task" onClose={() => setPanel(null)}>
        <form onSubmit={submitTask} className="grid gap-3">
          <input required name="title" className="ui-input" placeholder="Task title" />
          <input required name="owner" className="ui-input" placeholder="Owner" />
          <input required name="due" type="date" className="ui-input" />
          <select name="area" className="ui-input"><option>Support</option><option>Compliance</option><option>Finance</option><option>Housing</option></select>
          <button disabled={saving} className="button-primary">{saving ? "Saving..." : "Save Task"}</button>
        </form>
      </SlidePanel>
    </div>
  );
}
