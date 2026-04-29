"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, NotebookPen } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  tenants?: Array<{ id: string; first_name: string; last_name: string; property_id?: string }>;
  properties?: Array<{ id: string; address: string }>;
  staff?: Array<{ id: string; full_name: string; role: string }>;
  supportNotes?: Array<{ id: string; tenant_id: string; property_id?: string; staff_id?: string; week_start: string; period_end?: string; note: string; outcomes?: string; next_actions?: string }>;
};

export default function SupportNotesPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ tenantId: "", propertyId: "", staffId: "", from: "", to: "" });

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/erp/supportNotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to save note." }));
      setError(payload.error ?? "Unable to save note.");
      return;
    }

    event.currentTarget.reset();
    setMessage("Weekly support note saved.");
    await refresh();
  }

  const filteredNotes = useMemo(() => (snapshot.supportNotes ?? []).filter((note) => {
    if (filters.tenantId && note.tenant_id !== filters.tenantId) return false;
    if (filters.propertyId && note.property_id !== filters.propertyId) return false;
    if (filters.staffId && note.staff_id !== filters.staffId) return false;
    if (filters.from && String(note.week_start).slice(0, 10) < filters.from) return false;
    if (filters.to && String(note.week_start).slice(0, 10) > filters.to) return false;
    return true;
  }), [filters, snapshot.supportNotes]);

  const exportHref = `/api/support-notes/export?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()}`;

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <SectionCard title="Weekly Support Notes" subtitle="Support workers record weekly contact, outcomes, next actions, and risk movement">
        <form onSubmit={submitNote} className="grid gap-3 lg:grid-cols-2">
          <select name="tenantId" className="ui-input" required>
            <option value="">Select tenant</option>
            {(snapshot.tenants ?? []).map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.first_name} {tenant.last_name}</option>
            ))}
          </select>
          <select name="propertyId" className="ui-input">
            <option value="">Property from tenant record</option>
            {(snapshot.properties ?? []).map((property) => (
              <option key={property.id} value={property.id}>{property.address}</option>
            ))}
          </select>
          <select name="staffId" className="ui-input">
            <option value="">Select support worker</option>
            {(snapshot.staff ?? []).map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.full_name} ({staff.role})</option>
            ))}
          </select>
          <input name="weekStart" type="date" className="ui-input" required />
          <input name="periodEnd" type="date" className="ui-input" />
          <select name="riskChange" className="ui-input"><option value="none">No risk change</option><option value="increased">Risk increased</option><option value="reduced">Risk reduced</option></select>
          <textarea name="note" className="ui-input min-h-32 lg:col-span-2" placeholder="Support note" required />
          <textarea name="outcomes" className="ui-input min-h-24" placeholder="Outcomes achieved" />
          <textarea name="nextActions" className="ui-input min-h-24" placeholder="Next actions" />
          <button className="button-primary gap-2 lg:col-span-2"><NotebookPen className="h-4 w-4" /> Save Support Note</button>
        </form>
      </SectionCard>

      <SectionCard title="Search and Export Notes" subtitle="Filter by tenant, property, worker and date range, then export a PDF pack.">
        <div className="grid gap-3 md:grid-cols-6">
          <select className="ui-input" value={filters.tenantId} onChange={(event) => setFilters((current) => ({ ...current, tenantId: event.target.value }))}>
            <option value="">All tenants</option>
            {(snapshot.tenants ?? []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.first_name} {tenant.last_name}</option>)}
          </select>
          <select className="ui-input" value={filters.propertyId} onChange={(event) => setFilters((current) => ({ ...current, propertyId: event.target.value }))}>
            <option value="">All properties</option>
            {(snapshot.properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
          </select>
          <select className="ui-input" value={filters.staffId} onChange={(event) => setFilters((current) => ({ ...current, staffId: event.target.value }))}>
            <option value="">All staff</option>
            {(snapshot.staff ?? []).map((staff) => <option key={staff.id} value={staff.id}>{staff.full_name}</option>)}
          </select>
          <input type="date" className="ui-input" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          <input type="date" className="ui-input" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          <a className="button-primary inline-flex items-center justify-center gap-2" href={exportHref}><Download className="h-4 w-4" /> Export PDF</a>
        </div>
      </SectionCard>

      <SectionCard title="Recent Notes" subtitle="Latest weekly support activity">
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const tenant = snapshot.tenants?.find((item) => item.id === note.tenant_id);
            const property = snapshot.properties?.find((item) => item.id === note.property_id || item.id === tenant?.property_id);
            return (
              <article key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-slate-900">{tenant ? `${tenant.first_name} ${tenant.last_name}` : "Tenant"} | {String(note.week_start).slice(0, 10)}{note.period_end ? ` to ${String(note.period_end).slice(0, 10)}` : ""}</p>
                <p className="mt-1 text-xs text-slate-500">{property?.address || "No property linked"}</p>
                <p className="mt-2 text-slate-700">{note.note}</p>
                {note.next_actions ? <p className="mt-2 text-slate-500">Next: {note.next_actions}</p> : null}
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
