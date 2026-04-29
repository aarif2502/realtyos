"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { SlidePanel } from "@/components/SlidePanel";

type Snapshot = {
  properties?: Array<{ id: string; address: string }>;
  tenants?: Array<{ id: string; first_name: string; middle_name?: string; last_name: string }>;
  incidents?: Array<{ id: string; property_id?: string; tenant_id?: string; category: string; severity: string; status: string; summary: string; reported_at?: string }>;
};

export default function MaintenancePage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function raiseIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/erp/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to create incident." }));
      setError(payload.error ?? "Unable to create incident.");
      return;
    }
    setRaiseOpen(false);
    setMessage("Incident raised.");
    await refresh();
  }

  const incidents = snapshot.incidents ?? [];
  const open = incidents.filter((incident) => incident.status !== "closed").length;
  const high = incidents.filter((incident) => incident.severity === "HIGH").length;

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Open Incidents</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{open}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">High Severity</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{high}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total Records</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{incidents.length}</p>
        </article>
      </section>

      <SectionCard
        title="Maintenance / Incidents"
        subtitle="Live operational incident records from PostgreSQL"
        action={(
          <div className="flex gap-2">
            <button type="button" onClick={() => setRaiseOpen(true)} className="button-primary">Raise Incident</button>
            <Link href="/app/compliance" className="button-secondary">Manage in Compliance</Link>
          </div>
        )}
      >
        <div className="space-y-3">
          {incidents.length ? incidents.map((incident) => {
            const property = snapshot.properties?.find((item) => item.id === incident.property_id);
            const tenant = snapshot.tenants?.find((item) => item.id === incident.tenant_id);
            const tenantName = tenant ? `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim() : "No tenant";

            return (
              <article key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{incident.category}</p>
                  <div className="flex gap-2">
                    <StatusBadge label={incident.severity} tone={incident.severity === "HIGH" ? "overdue" : "pending"} />
                    <StatusBadge label={incident.status} tone={incident.status === "closed" ? "active" : "pending"} />
                  </div>
                </div>
                <p className="mt-1 text-slate-600">{property?.address ?? "No property"} | {tenantName}</p>
                <p className="mt-2 text-slate-700">{incident.summary}</p>
              </article>
            );
          }) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-900"><AlertTriangle className="h-4 w-4" /> No incidents recorded</div>
              <p className="mt-1">Use Raise Incident to create one, or open Compliance for full incident workflow.</p>
            </div>
          )}
        </div>
      </SectionCard>

      <SlidePanel open={raiseOpen} title="Raise Incident" onClose={() => setRaiseOpen(false)}>
        <form onSubmit={raiseIncident} className="grid gap-3">
          <select name="propertyId" className="ui-input" required>
            <option value="">Select property</option>
            {(snapshot.properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
          </select>
          <select name="tenantId" className="ui-input">
            <option value="">Optional tenant</option>
            {(snapshot.tenants ?? []).map((tenant) => <option key={tenant.id} value={tenant.id}>{`${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim()}</option>)}
          </select>
          <input name="category" className="ui-input" defaultValue="Maintenance" placeholder="Category" required />
          <select name="severity" className="ui-input" defaultValue="MEDIUM">
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
          <textarea name="summary" className="ui-input min-h-24" placeholder="Incident summary" required />
          <button className="button-primary">Create Incident</button>
        </form>
      </SlidePanel>
    </div>
  );
}
