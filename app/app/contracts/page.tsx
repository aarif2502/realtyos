"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  tenants?: Array<{ id: string; first_name: string; middle_name?: string; last_name: string; property_id?: string; room_id?: string }>;
  properties?: Array<{ id: string; address: string }>;
  rooms?: Array<{ id: string; property_id: string; room_label: string; weekly_rent?: string; status: string }>;
  contracts?: Array<{ id: string; tenant_id: string; property_id?: string; room_id?: string; contract_number: string; start_date: string; end_date?: string; weekly_rent?: string; deposit_amount?: string; status: string; document_path?: string }>;
};
type Tenant = NonNullable<Snapshot["tenants"]>[number];

async function submitJson(path: string, form: HTMLFormElement, method = "POST") {
  const body = Object.fromEntries(new FormData(form).entries());
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Unable to save." }));
    throw new Error(payload.error ?? "Unable to save.");
  }
}

function tenantName(tenant?: Tenant) {
  return tenant ? `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim() : "Unassigned tenant";
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function ContractsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setError(null);
    try {
      await submitJson("/api/erp/contracts", form);
      form.reset();
      setMessage("Contract created.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create contract.");
    }
  }

  async function handlePatch(id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setError(null);
    try {
      await submitJson(`/api/erp/contracts?id=${id}`, form, "PATCH");
      setEditingId(null);
      setMessage("Contract updated.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update contract.");
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/erp/contracts?id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Unable to delete contract.");
      return;
    }
    setMessage("Contract deleted.");
    await refresh();
  }

  const currency = snapshot.agency?.currency_code ?? "GBP";
  const activeContracts = (snapshot.contracts ?? []).filter((contract) => contract.status === "active").length;
  const weeklyRentRoll = (snapshot.contracts ?? []).filter((contract) => contract.status === "active").reduce((sum, contract) => sum + Number(contract.weekly_rent ?? 0), 0);
  const enriched = useMemo(() => (snapshot.contracts ?? []).map((contract) => {
    const tenant = snapshot.tenants?.find((item) => item.id === contract.tenant_id);
    const property = snapshot.properties?.find((item) => item.id === contract.property_id) ?? snapshot.properties?.find((item) => item.id === tenant?.property_id);
    const room = snapshot.rooms?.find((item) => item.id === contract.room_id);
    return { ...contract, tenant, property, room };
  }), [snapshot.contracts, snapshot.properties, snapshot.rooms, snapshot.tenants]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Contracts</p><p className="mt-2 text-2xl font-semibold text-slate-900">{snapshot.contracts?.length ?? 0}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Active</p><p className="mt-2 text-2xl font-semibold text-slate-900">{activeContracts}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Weekly Rent Roll</p><p className="mt-2 text-2xl font-semibold text-slate-900">{money(weeklyRentRoll, currency)}</p></article>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <SectionCard title="Create Tenancy Contract" subtitle="Create signed, draft, active, expired, or terminated supported-housing contracts">
        <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-4">
          <select name="tenantId" className="ui-input" required>
            <option value="">Tenant</option>
            {(snapshot.tenants ?? []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenantName(tenant)}</option>)}
          </select>
          <select name="propertyId" className="ui-input">
            <option value="">Property</option>
            {(snapshot.properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
          </select>
          <select name="roomId" className="ui-input">
            <option value="">Room / unit</option>
            {(snapshot.rooms ?? []).map((room) => <option key={room.id} value={room.id}>Room {room.room_label} - {money(Number(room.weekly_rent ?? 0), currency)}</option>)}
          </select>
          <input name="contractNumber" className="ui-input" placeholder="Contract number, optional" />
          <input name="startDate" type="date" className="ui-input" required />
          <input name="endDate" type="date" className="ui-input" />
          <input name="weeklyRent" type="number" step="0.01" className="ui-input" placeholder="Weekly rent" />
          <input name="depositAmount" type="number" step="0.01" className="ui-input" placeholder="Deposit" />
          <select name="status" className="ui-input" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option></select>
          <input name="documentPath" className="ui-input lg:col-span-2" placeholder="Linked signed document path" />
          <button className="button-primary gap-2"><FileText className="h-4 w-4" /> Create Contract</button>
        </form>
      </SectionCard>

      <SectionCard title="Contract Register" subtitle="Live tenancy agreements from PostgreSQL">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="pb-3">Contract</th><th className="pb-3">Tenant</th><th className="pb-3">Property</th><th className="pb-3">Room</th><th className="pb-3">Dates</th><th className="pb-3">Rent</th><th className="pb-3">Status</th><th className="pb-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.length ? enriched.map((contract) => (
                <tr key={contract.id}>
                  {editingId === contract.id ? (
                    <td colSpan={8} className="py-3">
                      <form onSubmit={(event) => handlePatch(contract.id, event)} className="grid gap-3 lg:grid-cols-6">
                        <input name="contractNumber" className="ui-input" defaultValue={contract.contract_number} />
                        <input name="startDate" type="date" className="ui-input" defaultValue={contract.start_date?.slice(0, 10)} />
                        <input name="endDate" type="date" className="ui-input" defaultValue={contract.end_date?.slice(0, 10) ?? ""} />
                        <input name="weeklyRent" type="number" step="0.01" className="ui-input" defaultValue={contract.weekly_rent ?? ""} />
                        <select name="status" className="ui-input" defaultValue={contract.status}><option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option></select>
                        <button className="button-primary">Save</button>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="py-4 font-semibold text-slate-900">{contract.contract_number}</td>
                      <td className="py-4 text-slate-700">{tenantName(contract.tenant)}</td>
                      <td className="py-4 text-slate-700">{contract.property?.address ?? "Unassigned"}</td>
                      <td className="py-4 text-slate-700">{contract.room ? `Room ${contract.room.room_label}` : "Not set"}</td>
                      <td className="py-4 text-slate-700">{contract.start_date?.slice(0, 10)} to {contract.end_date?.slice(0, 10) ?? "open"}</td>
                      <td className="py-4 text-slate-700">{money(Number(contract.weekly_rent ?? 0), currency)}</td>
                      <td className="py-4"><StatusBadge label={contract.status} tone={contract.status === "active" ? "active" : "pending"} /></td>
                      <td className="py-4"><div className="flex gap-2"><button onClick={() => setEditingId(contract.id)} className="button-secondary py-2"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(contract.id)} className="button-secondary py-2 text-rose-600"><Trash2 className="h-4 w-4" /></button></div></td>
                    </>
                  )}
                </tr>
              )) : <tr><td colSpan={8} className="py-6 text-slate-600">No contracts exist yet. Create the first contract above.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
