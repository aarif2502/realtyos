"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Banknote, ReceiptText } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  tenants?: Array<{ id: string; first_name: string; last_name: string }>;
  properties?: Array<{ id: string; address: string }>;
  landlords?: Array<{ id: string; name: string }>;
  ledger?: Array<{ id: string; tenant_id?: string; type: string; description: string; debit?: string; credit?: string; entry_date: string; status: string }>;
  claims?: Array<{ id: string; amount?: string; status: string }>;
  expenses?: Array<{ id: string; category: string; description: string; amount: string; status: string; expense_date: string }>;
  landlordPayments?: Array<{ id: string; landlord_id: string; amount: string; status: string; reference?: string }>;
};

function money(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

async function post(collection: string, form: HTMLFormElement) {
  const response = await fetch(`/api/erp/${collection}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to save.");
}

export default function FinancePage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currency = snapshot.agency?.currency_code ?? "GBP";

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

  const totals = useMemo(() => {
    const debit = (snapshot.ledger ?? []).reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
    const credit = (snapshot.ledger ?? []).reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
    const expenses = (snapshot.expenses ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const landlordPayments = (snapshot.landlordPayments ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    return { arrears: debit - credit, expenses, landlordPayments, hb: (snapshot.claims ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0) };
  }, [snapshot.claims, snapshot.expenses, snapshot.landlordPayments, snapshot.ledger]);

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Rent Balance" value={money(totals.arrears, currency)} />
        <Metric label="HB / UC Claims" value={money(totals.hb, currency)} />
        <Metric label="Expenses" value={money(totals.expenses, currency)} />
        <Metric label="Landlord Payments" value={money(totals.landlordPayments, currency)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Rent / HB Ledger Entry" subtitle="Rent charge, housing benefit, tenant payment or adjustment">
          <form onSubmit={(event) => submit("ledger", event, "Ledger entry saved.")} className="grid gap-3">
            <select name="tenantId" className="ui-input"><option value="">Tenant</option>{snapshot.tenants?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.first_name} {tenant.last_name}</option>)}</select>
            <select name="propertyId" className="ui-input"><option value="">Property</option>{snapshot.properties?.map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}</select>
            <input name="entryDate" type="date" className="ui-input" />
            <select name="type" className="ui-input" defaultValue="rent_charge"><option value="rent_charge">Rent charge</option><option value="housing_benefit">Housing benefit / UC</option><option value="tenant_payment">Tenant payment</option><option value="adjustment">Adjustment</option><option value="arrears">Arrears</option></select>
            <input name="description" className="ui-input" placeholder="Description" required />
            <input name="debit" type="number" step="0.01" className="ui-input" placeholder="Debit" />
            <input name="credit" type="number" step="0.01" className="ui-input" placeholder="Credit" />
            <button className="button-primary gap-2"><Banknote className="h-4 w-4" /> Save Entry</button>
          </form>
        </SectionCard>

        <SectionCard title="Expense" subtitle="Repairs, compliance, utilities and operating costs">
          <form onSubmit={(event) => submit("expenses", event, "Expense saved.")} className="grid gap-3">
            <select name="propertyId" className="ui-input"><option value="">Property</option>{snapshot.properties?.map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}</select>
            <select name="landlordId" className="ui-input"><option value="">Landlord</option>{snapshot.landlords?.map((landlord) => <option key={landlord.id} value={landlord.id}>{landlord.name}</option>)}</select>
            <input name="category" className="ui-input" placeholder="Category" required />
            <input name="description" className="ui-input" placeholder="Description" required />
            <input name="amount" type="number" step="0.01" className="ui-input" placeholder="Amount" required />
            <input name="expenseDate" type="date" className="ui-input" />
            <button className="button-primary gap-2"><ReceiptText className="h-4 w-4" /> Save Expense</button>
          </form>
        </SectionCard>

        <SectionCard title="Landlord Payment" subtitle="Track owner/landlord payment batches">
          <form onSubmit={(event) => submit("landlordPayments", event, "Landlord payment saved.")} className="grid gap-3">
            <select name="landlordId" className="ui-input" required><option value="">Landlord</option>{snapshot.landlords?.map((landlord) => <option key={landlord.id} value={landlord.id}>{landlord.name}</option>)}</select>
            <select name="propertyId" className="ui-input"><option value="">Property</option>{snapshot.properties?.map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}</select>
            <input name="periodStart" type="date" className="ui-input" />
            <input name="periodEnd" type="date" className="ui-input" />
            <input name="amount" type="number" step="0.01" className="ui-input" placeholder="Amount" required />
            <select name="status" className="ui-input" defaultValue="draft"><option value="draft">Draft</option><option value="approved">Approved</option><option value="paid">Paid</option></select>
            <input name="reference" className="ui-input" placeholder="Reference" />
            <button className="button-primary gap-2"><Banknote className="h-4 w-4" /> Save Payment</button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p></article>;
}
