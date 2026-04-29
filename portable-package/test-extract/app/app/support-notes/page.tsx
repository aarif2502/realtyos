"use client";

import { FormEvent, useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  tenants?: Array<{ id: string; first_name: string; last_name: string; property_id?: string }>;
  staff?: Array<{ id: string; full_name: string; role: string }>;
  supportNotes?: Array<{ id: string; tenant_id: string; week_start: string; note: string; outcomes?: string; next_actions?: string }>;
};

export default function SupportNotesPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <select name="staffId" className="ui-input">
            <option value="">Select support worker</option>
            {(snapshot.staff ?? []).map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.full_name} ({staff.role})</option>
            ))}
          </select>
          <input name="weekStart" type="date" className="ui-input" required />
          <select name="riskChange" className="ui-input"><option value="none">No risk change</option><option value="increased">Risk increased</option><option value="reduced">Risk reduced</option></select>
          <textarea name="note" className="ui-input min-h-32 lg:col-span-2" placeholder="Support note" required />
          <textarea name="outcomes" className="ui-input min-h-24" placeholder="Outcomes achieved" />
          <textarea name="nextActions" className="ui-input min-h-24" placeholder="Next actions" />
          <button className="button-primary gap-2 lg:col-span-2"><NotebookPen className="h-4 w-4" /> Save Support Note</button>
        </form>
      </SectionCard>

      <SectionCard title="Recent Notes" subtitle="Latest weekly support activity">
        <div className="space-y-3">
          {(snapshot.supportNotes ?? []).map((note) => {
            const tenant = snapshot.tenants?.find((item) => item.id === note.tenant_id);
            return (
              <article key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-slate-900">{tenant ? `${tenant.first_name} ${tenant.last_name}` : "Tenant"} | week of {note.week_start}</p>
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
