"use client";

import { FormEvent, useEffect, useState } from "react";
import { ClipboardCheck, ShieldAlert } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  tenants?: Array<{ id: string; first_name: string; last_name: string; risk_assessment?: string }>;
  staff?: Array<{ id: string; full_name: string }>;
  supportPlans?: Array<{ id: string; tenant_id: string; status: string; goals?: string; review_date?: string }>;
  riskAssessments?: Array<{ id: string; tenant_id: string; risk_level: string; safeguarding_concerns?: string; review_date?: string }>;
  supportNotes?: Array<{ id: string; tenant_id: string; week_start: string; note: string; outcomes?: string }>;
};

async function post(collection: string, form: HTMLFormElement) {
  const response = await fetch(`/api/erp/${collection}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to save.");
}

function tenantName(id: string, snapshot: Snapshot) {
  const tenant = snapshot.tenants?.find((item) => item.id === id);
  return tenant ? `${tenant.first_name} ${tenant.last_name}` : "Tenant";
}

export default function CompliancePage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(collection: string, event: FormEvent<HTMLFormElement>, success: string) {
    event.preventDefault();
    setError(null); setMessage(null);
    try {
      await post(collection, event.currentTarget);
      event.currentTarget.reset();
      setMessage(success);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save.");
    }
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Support Plans" value={snapshot.supportPlans?.length ?? 0} />
        <Metric label="High Risk" value={(snapshot.riskAssessments ?? []).filter((r) => r.risk_level === "HIGH").length} />
        <Metric label="Weekly Notes" value={snapshot.supportNotes?.length ?? 0} />
        <Metric label="Reviews Due" value={(snapshot.supportPlans ?? []).filter((p) => p.review_date && new Date(p.review_date).getTime() < now).length} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Tenant Support Plan" subtitle="Goals, needs summary, plan owner and review date">
          <form onSubmit={(event) => submit("supportPlans", event, "Support plan saved.")} className="grid gap-3">
            <TenantSelect snapshot={snapshot} name="tenantId" />
            <select name="ownerId" className="ui-input"><option value="">Plan owner</option>{snapshot.staff?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
            <select name="status" className="ui-input" defaultValue="active"><option value="draft">Draft</option><option value="active">Active</option><option value="review_due">Review due</option><option value="closed">Closed</option></select>
            <input name="reviewDate" type="date" className="ui-input" />
            <textarea name="needsSummary" className="ui-input min-h-24" placeholder="Needs summary" />
            <textarea name="goals" className="ui-input min-h-28" placeholder="Support goals and outcomes sought" />
            <button className="button-primary gap-2"><ClipboardCheck className="h-4 w-4" /> Save Support Plan</button>
          </form>
        </SectionCard>

        <SectionCard title="Risk Assessment" subtitle="Safeguarding concerns and mitigation plan">
          <form onSubmit={(event) => submit("riskAssessments", event, "Risk assessment saved.")} className="grid gap-3">
            <TenantSelect snapshot={snapshot} name="tenantId" />
            <select name="assessorId" className="ui-input"><option value="">Assessor</option>{snapshot.staff?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
            <select name="riskLevel" className="ui-input" defaultValue="LOW"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select>
            <input name="reviewDate" type="date" className="ui-input" />
            <textarea name="safeguardingConcerns" className="ui-input min-h-24" placeholder="Safeguarding concerns" />
            <textarea name="mitigationPlan" className="ui-input min-h-28" placeholder="Mitigation plan" />
            <button className="button-primary gap-2"><ShieldAlert className="h-4 w-4" /> Save Risk Assessment</button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Compliance Timeline" subtitle="Latest support plans, risks and case notes for audit review">
        <div className="grid gap-3 xl:grid-cols-3">
          {(snapshot.riskAssessments ?? []).slice(0, 12).map((risk) => <article key={risk.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold text-slate-900">{tenantName(risk.tenant_id, snapshot)} · {risk.risk_level}</p><p className="mt-2 text-slate-600">{risk.safeguarding_concerns || "No safeguarding notes."}</p></article>)}
          {(snapshot.supportPlans ?? []).slice(0, 12).map((plan) => <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold text-slate-900">{tenantName(plan.tenant_id, snapshot)} · {plan.status}</p><p className="mt-2 text-slate-600">{plan.goals || "No goals recorded."}</p></article>)}
          {(snapshot.supportNotes ?? []).slice(0, 12).map((note) => <article key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold text-slate-900">{tenantName(note.tenant_id, snapshot)} · {note.week_start}</p><p className="mt-2 text-slate-600">{note.note}</p></article>)}
        </div>
      </SectionCard>
    </div>
  );
}

function TenantSelect({ snapshot, name }: { snapshot: Snapshot; name: string }) {
  return <select name={name} className="ui-input" required><option value="">Select tenant</option>{snapshot.tenants?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.first_name} {tenant.last_name}</option>)}</select>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p></article>;
}
