"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";

type Snapshot = {
  properties?: Array<{ id: string; address: string }>;
  rooms?: Array<{ id: string; room_label: string }>;
  tenants?: Array<{ id: string; property_id?: string; room_id?: string; first_name: string; middle_name?: string; last_name: string; risk_assessment?: string; referral_agency?: string; hb_claim_ref_number?: string; checkout_date?: string | null }>;
};

export default function TenantsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" }).then((response) => response.json()).then(setSnapshot);
  }, []);

  const rows = useMemo(() => {
    return (snapshot.tenants ?? []).filter((tenant) => {
      const haystack = `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name} ${tenant.referral_agency ?? ""} ${tenant.hb_claim_ref_number ?? ""}`.toLowerCase();
      return query ? haystack.includes(query.toLowerCase()) : true;
    });
  }, [query, snapshot.tenants]);

  return (
    <div className="space-y-6">
      <SectionCard title="Tenants" subtitle="Live resident records from PostgreSQL" action={<Link href="/app/setup" className="button-primary">Add Tenant</Link>}>
        <input className="ui-input mb-4" placeholder="Search tenant, referral agency, or HB claim reference" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="space-y-3">
          {rows.map((tenant) => {
            const property = snapshot.properties?.find((item) => item.id === tenant.property_id);
            const room = snapshot.rooms?.find((item) => item.id === tenant.room_id);
            const name = `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim();

            return (
              <article key={tenant.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{name}</p>
                  <StatusBadge label={tenant.risk_assessment || "LOW"} tone={tenant.risk_assessment === "HIGH" ? "overdue" : tenant.risk_assessment === "MEDIUM" ? "pending" : "active"} />
                </div>
                <p className="mt-1 text-slate-600">{property?.address ?? "Unassigned property"} | Room {room?.room_label ?? "Unassigned"}</p>
                <p className="mt-1 text-slate-500">Referral: {tenant.referral_agency || "Not set"} | HB ref: {tenant.hb_claim_ref_number || "Not set"} | {tenant.checkout_date ? "Checked out" : "Active"}</p>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <div className="fixed bottom-6 right-6 z-20 flex gap-2">
        <Link href="/app/setup" className="button-primary shadow-card">Add Tenant</Link>
        <Link href="/app/maintenance" className="button-secondary">Raise Incident</Link>
      </div>
    </div>
  );
}
