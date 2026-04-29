"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BellPlus, CalendarClock } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  tenants?: Array<{ id: string; first_name: string; last_name: string }>;
  properties?: Array<{ id: string; address: string }>;
  staff?: Array<{ id: string; full_name: string }>;
  automationTasks?: Array<{ id: string; tenant_id?: string; property_id?: string; type: string; title: string; due_date?: string; status: string }>;
};

async function post(form: HTMLFormElement) {
  const response = await fetch("/api/erp/automationTasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to save task.");
}

export default function AutomationPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setMessage(null);
    try {
      await post(event.currentTarget);
      event.currentTarget.reset();
      setMessage("Reminder/task created.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save task.");
    }
  }

  const tasks = useMemo(() => [...(snapshot.automationTasks ?? [])].sort((a, b) => String(a.due_date ?? "9999").localeCompare(String(b.due_date ?? "9999"))), [snapshot.automationTasks]);

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Open Tasks" value={tasks.filter((t) => t.status === "open").length} />
        <Metric label="Inspections" value={tasks.filter((t) => t.type === "inspection").length} />
        <Metric label="Support Visits" value={tasks.filter((t) => t.type === "support_visit").length} />
        <Metric label="Rent Arrears" value={tasks.filter((t) => t.type === "rent_arrears").length} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Create Reminder" subtitle="Inspections, compliance checks, arrears, support visits and referral follow-ups">
          <form onSubmit={submit} className="grid gap-3">
            <select name="type" className="ui-input" defaultValue="support_visit"><option value="inspection">Inspection</option><option value="compliance_check">Compliance check</option><option value="rent_arrears">Rent arrears</option><option value="support_visit">Support visit</option><option value="referral_follow_up">Referral follow-up</option><option value="general">General</option></select>
            <input name="title" className="ui-input" placeholder="Task title" required />
            <input name="dueDate" type="date" className="ui-input" />
            <select name="assignedTo" className="ui-input"><option value="">Assign to staff</option>{snapshot.staff?.map((staff) => <option key={staff.id} value={staff.id}>{staff.full_name}</option>)}</select>
            <select name="tenantId" className="ui-input"><option value="">Tenant link</option>{snapshot.tenants?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.first_name} {tenant.last_name}</option>)}</select>
            <select name="propertyId" className="ui-input"><option value="">Property link</option>{snapshot.properties?.map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}</select>
            <button className="button-primary gap-2"><BellPlus className="h-4 w-4" /> Create Reminder</button>
          </form>
        </SectionCard>

        <SectionCard title="Automation Queue" subtitle="Operational reminders generated manually today; ready for future HubSpot/webhook triggers">
          <div className="grid gap-3 xl:grid-cols-2">
            {tasks.map((task) => <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><div className="flex items-start gap-3"><CalendarClock className="mt-1 h-4 w-4 text-slate-500" /><div><p className="font-semibold text-slate-900">{task.title}</p><p className="mt-1 text-slate-500">{task.type} · {task.status} · due {task.due_date || "not set"}</p></div></div></article>)}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p></article>;
}
