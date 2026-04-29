"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";

type Snapshot = {
  properties?: Array<{ id: string; address: string }>;
  tenants?: Array<{ id: string; first_name: string; middle_name?: string; last_name: string }>;
  incidents?: Array<{ id: string; property_id?: string; tenant_id?: string; category: string; severity: string; status: string; summary: string; reported_at?: string }>;
};

export default function MaintenancePage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" }).then((response) => response.json()).then(setSnapshot);
  }, []);

  const incidents = snapshot.incidents ?? [];
  const open = incidents.filter((incident) => incident.status !== "closed").length;
  const high = incidents.filter((incident) => incident.severity === "HIGH").length;

  return (
    <div className="space-y-6">
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

      <SectionCard title="Maintenance / Incidents" subtitle="Live operational incident records from PostgreSQL">
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
              <p className="mt-1">Incident creation will be managed from the admin/support worker workflow.</p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
