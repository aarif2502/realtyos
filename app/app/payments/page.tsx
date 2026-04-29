"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  tenants?: Array<{ id: string; first_name: string; middle_name?: string; last_name: string; property_id?: string }>;
  properties?: Array<{ id: string; address: string }>;
  contracts?: Array<{ id: string; contract_number: string; tenant_id: string; property_id?: string }>;
  ledger?: Array<{ id: string; tenant_id?: string; property_id?: string; contract_id?: string; entry_date: string; period_start?: string; period_end?: string; type: string; description: string; debit?: string; credit?: string; status: string; reference?: string }>;
};
type Tenant = NonNullable<Snapshot["tenants"]>[number];

async function submitJson(path: string, form: HTMLFormElement) {
  const body = Object.fromEntries(new FormData(form).entries());
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Unable to save." }));
    throw new Error(payload.error ?? "Unable to save.");
  }
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function tenantName(tenant?: Tenant) {
  return tenant ? `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim() : "Unassigned tenant";
}

export default function PaymentsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      await submitJson("/api/erp/ledger", form);
      form.reset();
      setMessage("Ledger entry posted.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to post ledger entry.");
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/erp/ledger?id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Unable to delete ledger entry.");
      return;
    }
    setMessage("Ledger entry deleted.");
    await refresh();
  }

  const currency = snapshot.agency?.currency_code ?? "GBP";
  const rows = useMemo(() => (snapshot.ledger ?? []).map((entry) => {
    const tenant = snapshot.tenants?.find((item) => item.id === entry.tenant_id);
    const property = snapshot.properties?.find((item) => item.id === entry.property_id) ?? snapshot.properties?.find((item) => item.id === tenant?.property_id);
    const contract = snapshot.contracts?.find((item) => item.id === entry.contract_id);
    return { ...entry, tenant, property, contract };
  }).filter((entry) => {
    const haystack = `${entry.description} ${entry.reference ?? ""} ${entry.type} ${tenantName(entry.tenant)} ${entry.property?.address ?? ""} ${entry.contract?.contract_number ?? ""}`.toLowerCase();
    return filter ? haystack.includes(filter.toLowerCase()) : true;
  }), [filter, snapshot.contracts, snapshot.ledger, snapshot.properties, snapshot.tenants]);

  const posted = rows.filter((entry) => entry.status !== "void");
  const charges = posted.reduce((sum, entry) => sum + Number(entry.debit ?? 0), 0);
  const receipts = posted.reduce((sum, entry) => sum + Number(entry.credit ?? 0), 0);
  const arrears = charges - receipts;
  const hbReceived = posted.filter((entry) => entry.type === "housing_benefit").reduce((sum, entry) => sum + Number(entry.credit ?? 0), 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Rent Charges</p><p className="mt-2 text-2xl font-semibold text-slate-900">{money(charges, currency)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Payments Received</p><p className="mt-2 text-2xl font-semibold text-slate-900">{money(receipts, currency)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Housing Benefit</p><p className="mt-2 text-2xl font-semibold text-slate-900">{money(hbReceived, currency)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Net Arrears</p><p className="mt-2 text-2xl font-semibold text-slate-900">{money(arrears, currency)}</p></article>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <SectionCard title="Post Ledger Transaction" subtitle="Record rent charges, housing benefit receipts, tenant payments, arrears, and adjustments">
        <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-4">
          <select name="tenantId" className="ui-input">
            <option value="">Tenant</option>
            {(snapshot.tenants ?? []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenantName(tenant)}</option>)}
          </select>
          <select name="propertyId" className="ui-input">
            <option value="">Property</option>
            {(snapshot.properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
          </select>
          <select name="contractId" className="ui-input">
            <option value="">Contract</option>
            {(snapshot.contracts ?? []).map((contract) => <option key={contract.id} value={contract.id}>{contract.contract_number}</option>)}
          </select>
          <select name="type" className="ui-input" defaultValue="rent_charge">
            <option value="rent_charge">Rent charge</option>
            <option value="housing_benefit">Housing benefit receipt</option>
            <option value="tenant_payment">Tenant payment</option>
            <option value="adjustment">Adjustment</option>
            <option value="arrears">Arrears brought forward</option>
          </select>
          <input name="entryDate" type="date" className="ui-input" />
          <input name="periodStart" type="date" className="ui-input" />
          <input name="periodEnd" type="date" className="ui-input" />
          <select name="status" className="ui-input" defaultValue="posted"><option value="posted">Posted</option><option value="draft">Draft</option><option value="void">Void</option></select>
          <input name="description" className="ui-input lg:col-span-2" placeholder="Description" required />
          <input name="reference" className="ui-input" placeholder="HB ref / payment reference" />
          <input name="debit" type="number" step="0.01" className="ui-input" placeholder="Debit / charge" />
          <input name="credit" type="number" step="0.01" className="ui-input" placeholder="Credit / receipt" />
          <button className="button-primary gap-2 lg:col-span-3"><CreditCard className="h-4 w-4" /> Post Transaction</button>
        </form>
      </SectionCard>

      <SectionCard title="Payment Ledger" subtitle="Auditable transaction register from PostgreSQL">
        <input className="ui-input" placeholder="Filter by tenant, property, reference, type, or description" value={filter} onChange={(event) => setFilter(event.target.value)} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="pb-3">Date</th><th className="pb-3">Tenant</th><th className="pb-3">Property</th><th className="pb-3">Type</th><th className="pb-3">Description</th><th className="pb-3">Debit</th><th className="pb-3">Credit</th><th className="pb-3">Status</th><th className="pb-3">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length ? rows.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-4 text-slate-700">{entry.entry_date?.slice(0, 10)}</td>
                  <td className="py-4 font-semibold text-slate-900">{tenantName(entry.tenant)}</td>
                  <td className="py-4 text-slate-700">{entry.property?.address ?? "Unassigned"}</td>
                  <td className="py-4 text-slate-700">{entry.type.replace(/_/g, " ")}</td>
                  <td className="py-4 text-slate-700">{entry.description}</td>
                  <td className="py-4 text-slate-700">{money(Number(entry.debit ?? 0), currency)}</td>
                  <td className="py-4 text-slate-700">{money(Number(entry.credit ?? 0), currency)}</td>
                  <td className="py-4"><StatusBadge label={entry.status} tone={entry.status === "posted" ? "active" : "pending"} /></td>
                  <td className="py-4"><button onClick={() => remove(entry.id)} className="button-secondary py-2 text-rose-600"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              )) : <tr><td colSpan={9} className="py-6 text-slate-600">No ledger entries exist yet. Post a transaction above.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
