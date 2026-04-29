"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { SlidePanel } from "@/components/SlidePanel";

type Snapshot = {
  properties?: Array<{ id: string; address: string }>;
  rooms?: Array<{ id: string; room_label: string }>;
  tenants?: Array<{ id: string; property_id?: string; room_id?: string; first_name: string; middle_name?: string; last_name: string; risk_assessment?: string; referral_agency?: string; hb_claim_ref_number?: string; checkout_date?: string | null }>;
};

export default function TenantsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  const rows = useMemo(() => {
    return (snapshot.tenants ?? []).filter((tenant) => {
      const haystack = `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name} ${tenant.referral_agency ?? ""} ${tenant.hb_claim_ref_number ?? ""}`.toLowerCase();
      return query ? haystack.includes(query.toLowerCase()) : true;
    });
  }, [query, snapshot.tenants]);

  const editingTenant = (snapshot.tenants ?? []).find((tenant) => tenant.id === editingId) ?? null;

  async function saveTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTenant) return;
    setMessage(null);
    setError(null);
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(`/api/erp/tenants?id=${editingTenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to update tenant." }));
      setError(payload.error ?? "Unable to update tenant.");
      return;
    }
    setEditingId(null);
    setMessage("Tenant updated.");
    await refresh();
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/app/tenants/${tenant.id}`} className="button-secondary">Open</Link>
                  <button type="button" onClick={() => setEditingId(tenant.id)} className="button-secondary">Edit</button>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <div className="fixed bottom-6 right-6 z-20 flex gap-2">
        <Link href="/app/setup" className="button-primary shadow-card">Add Tenant</Link>
        <Link href="/app/maintenance" className="button-secondary">Raise Incident</Link>
      </div>

      <SlidePanel open={Boolean(editingTenant)} title="Edit Tenant" onClose={() => setEditingId(null)}>
        {editingTenant ? (
          <form onSubmit={saveTenant} className="grid gap-3">
            <input name="firstName" defaultValue={editingTenant.first_name} className="ui-input" placeholder="First name" />
            <input name="middleName" defaultValue={editingTenant.middle_name ?? ""} className="ui-input" placeholder="Middle name" />
            <input name="lastName" defaultValue={editingTenant.last_name} className="ui-input" placeholder="Last name" />
            <select name="riskAssessment" defaultValue={editingTenant.risk_assessment ?? "LOW"} className="ui-input">
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
            <input name="referralAgency" defaultValue={editingTenant.referral_agency ?? ""} className="ui-input" placeholder="Referral agency" />
            <input name="hbClaimRefNumber" defaultValue={editingTenant.hb_claim_ref_number ?? ""} className="ui-input" placeholder="HB claim ref" />
            <button className="button-primary">Save Tenant</button>
          </form>
        ) : null}
      </SlidePanel>
    </div>
  );
}
