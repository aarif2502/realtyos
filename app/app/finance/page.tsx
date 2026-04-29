"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Banknote, ReceiptText, Search } from "lucide-react";
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
  housingAssociations?: Array<{ id: string; name: string; contact_name?: string; contact_email?: string; payment_terms?: string; status: string }>;
  pmsCycleSnapshots?: Array<{ id: string; housing_association_id?: string; cycle_list_number: string; snapshot_date: string; row_count: number; tenant_count: number; total_expected_amount?: string; status: string }>;
  housingAssociationPayments?: Array<{ id: string; housing_association_id?: string; snapshot_id?: string; cycle_list_number: string; expected_amount?: string; amount_paid?: string; payment_status: string; due_date?: string; paid_date?: string; payment_reference?: string }>;
  remittanceLineItems?: Array<{ id: string; raw_property_address: string; property_id?: string; cycle_list_number: string; net_amount?: string; gross_amount?: string; match_status: string; needs_review_reason?: string; source_file_name?: string }>;
  councilTaxRecords?: Array<{ id: string; account_ref: string; source_property_address: string; property_id?: string; status: string; needs_review_reason?: string; tax_year: string; annual_charge?: string }>;
  landlordPaymentRates?: Array<{ id: string; property_id: string; landlord_id?: string; rate_amount: string; rate_frequency: string; status: string }>;
  landlordPaymentObligations?: Array<{ id: string; property_id?: string; landlord_id?: string; cycle_list_number: string; calculated_payment_due: string; amount_paid?: string; payment_status: string; payment_reference?: string }>;
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
  const [addressSearch, setAddressSearch] = useState("Kings Road");
  const [matchSelections, setMatchSelections] = useState<Record<string, string>>({});
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

  async function createSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setMessage(null);
    const response = await fetch("/api/pms/cycle-snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Unable to create cycle snapshot.");
      return;
    }
    event.currentTarget.reset();
    setMessage(`Cycle snapshot created with ${payload.rowCount ?? 0} row(s).`);
    await refresh();
  }

  async function updatePayment(paymentId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setMessage(null);
    const response = await fetch(`/api/housing-association-payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Unable to update payment.");
      return;
    }
    setMessage("Housing Association payment updated.");
    await refresh();
  }

  async function saveRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setMessage(null);
    const response = await fetch("/api/remittance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rate", ...Object.fromEntries(new FormData(event.currentTarget).entries()) }),
    });
    if (!response.ok) {
      setError((await response.json().catch(() => ({}))).error || "Unable to save landlord rate.");
      return;
    }
    event.currentTarget.reset();
    setMessage("Landlord rate saved.");
    await refresh();
  }

  async function importManualRemittance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const lines = String(form.get("lines") || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [propertyAddress, amount, periodStart, periodEnd, reference] = line.split("|").map((item) => item?.trim());
        return { propertyAddress, amount, periodStart, periodEnd, reference };
      });
    const response = await fetch("/api/remittance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        housingAssociationId: form.get("housingAssociationId"),
        cycleListNumber: form.get("cycleListNumber"),
        remittanceMonth: form.get("remittanceMonth"),
        sourceFileName: form.get("sourceFileName"),
        sourceFileType: "manual",
        lines,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Unable to import remittance.");
      return;
    }
    event.currentTarget.reset();
    setMessage(`Remittance imported: ${payload.imported} line(s), ${payload.needsReview} needing review.`);
    await refresh();
  }

  async function recordObligation(event: FormEvent<HTMLFormElement>, obligationId: string) {
    event.preventDefault();
    setError(null); setMessage(null);
    const response = await fetch("/api/remittance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "recordPayment", obligationId, ...Object.fromEntries(new FormData(event.currentTarget).entries()) }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Unable to record payment.");
      return;
    }
    setMessage("Landlord payment recorded. No money was sent by the platform.");
    await refresh();
  }

  async function applyCouncilTaxMatch(event: FormEvent<HTMLFormElement>, councilTaxRecordId: string) {
    event.preventDefault();
    setError(null); setMessage(null);
    const selection = matchSelections[councilTaxRecordId];
    if (!selection) {
      setError("Select a property before applying the council tax match.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/council-tax/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        councilTaxRecordId,
        propertyId: selection,
        manualNote: form.get("manualNote") || "",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Unable to apply council tax property match.");
      return;
    }
    setMessage("Council tax property match saved.");
    setMatchSelections((current) => ({ ...current, [councilTaxRecordId]: "" }));
    await refresh();
  }

  const totals = useMemo(() => {
    const debit = (snapshot.ledger ?? []).reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
    const credit = (snapshot.ledger ?? []).reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
    const expenses = (snapshot.expenses ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const landlordPayments = (snapshot.landlordPayments ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    return { arrears: debit - credit, expenses, landlordPayments, hb: (snapshot.claims ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0) };
  }, [snapshot.claims, snapshot.expenses, snapshot.landlordPayments, snapshot.ledger]);

  const remittanceMatches = useMemo(() => {
    const q = addressSearch.toLowerCase();
    return (snapshot.remittanceLineItems ?? []).filter((line) => `${line.raw_property_address} ${line.cycle_list_number}`.toLowerCase().includes(q)).slice(0, 12);
  }, [addressSearch, snapshot.remittanceLineItems]);
  const obligationTotals = useMemo(() => {
    const rows = snapshot.landlordPaymentObligations ?? [];
    return {
      pending: rows.filter((row) => row.payment_status === "pending").length,
      completed: rows.filter((row) => row.payment_status === "completed").length,
      missed: rows.filter((row) => row.payment_status === "missed").length,
      needsReview: (snapshot.remittanceLineItems ?? []).filter((row) => row.match_status !== "matched").length,
      received: (snapshot.remittanceLineItems ?? []).reduce((sum, row) => sum + Number(row.gross_amount || row.net_amount || 0), 0),
    };
  }, [snapshot.landlordPaymentObligations, snapshot.remittanceLineItems]);
  const councilTaxNeedsReview = useMemo(
    () => (snapshot.councilTaxRecords ?? []).filter((row) => row.status === "needs_review" || row.status === "missing_info"),
    [snapshot.councilTaxRecords],
  );

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

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Remittance Received" value={money(obligationTotals.received, currency)} />
        <Metric label="Unmatched Lines" value={String(obligationTotals.needsReview)} />
        <Metric label="Onward Pending" value={String(obligationTotals.pending)} />
        <Metric label="Council Tax Needs Review" value={String(councilTaxNeedsReview.length)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Housing Association Setup" subtitle="Create associations, then link them to properties and cycle snapshots.">
          <form onSubmit={(event) => submit("housingAssociations", event, "Housing Association saved.")} className="grid gap-3">
            <input name="name" className="ui-input" placeholder="Housing Association name" required />
            <input name="contactName" className="ui-input" placeholder="Contact name" />
            <input name="contactEmail" type="email" className="ui-input" placeholder="Contact email" />
            <input name="phone" className="ui-input" placeholder="Phone" />
            <input name="paymentTerms" className="ui-input" placeholder="Payment terms, e.g. 30 days from cycle list" />
            <textarea name="notes" className="ui-input min-h-20" placeholder="Notes" />
            <button className="button-primary gap-2">Save Housing Association</button>
          </form>
        </SectionCard>

        <SectionCard title="Monthly Cycle Snapshot / Excel Export" subtitle="Create an immutable PMS snapshot, store the Cycle List Number, and download the Housing Association workbook.">
          <form onSubmit={createSnapshot} className="grid gap-3 md:grid-cols-2">
            <select name="housingAssociationId" className="ui-input">
              <option value="">All Housing Associations / unassigned</option>
              {snapshot.housingAssociations?.filter((item) => item.status !== "inactive").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input name="cycleListNumber" className="ui-input" placeholder="Cycle List Number" required />
            <input name="expectedAmount" type="number" step="0.01" className="ui-input" placeholder="Expected payment amount" />
            <input name="dueDate" type="date" className="ui-input" />
            <button className="button-primary gap-2 md:col-span-2">Create Snapshot</button>
          </form>
          <div className="mt-4 space-y-3">
            {snapshot.pmsCycleSnapshots?.length ? snapshot.pmsCycleSnapshots.slice(0, 8).map((row) => (
              <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">Cycle {row.cycle_list_number}</p>
                  <p className="text-slate-600">{row.tenant_count} tenant rows | {new Date(row.snapshot_date).toLocaleString()}</p>
                </div>
                <a className="button-secondary" href={`/api/pms/cycle-snapshots/${row.id}/export`}>Download Excel</a>
              </article>
            )) : <p className="text-sm text-slate-600">No cycle snapshots created yet.</p>}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Housing Association Payments by Cycle List" subtitle="Track expected, completed, partial, missed and disputed payments by cycle number.">
        <div className="space-y-3">
          {snapshot.housingAssociationPayments?.length ? snapshot.housingAssociationPayments.map((payment) => {
            const ha = snapshot.housingAssociations?.find((item) => item.id === payment.housing_association_id);
            return (
              <form key={payment.id} onSubmit={(event) => updatePayment(payment.id, event)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm lg:grid-cols-7">
                <div className="lg:col-span-2">
                  <p className="font-semibold text-slate-900">Cycle {payment.cycle_list_number}</p>
                  <p className="text-xs text-slate-500">{ha?.name || "Unassigned Housing Association"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">{payment.payment_status}</p>
                </div>
                <input name="expectedAmount" type="number" step="0.01" className="ui-input" defaultValue={payment.expected_amount ?? "0"} placeholder="Expected" />
                <input name="amountPaid" type="number" step="0.01" className="ui-input" defaultValue={payment.amount_paid ?? "0"} placeholder="Paid" />
                <input name="dueDate" type="date" className="ui-input" defaultValue={payment.due_date?.slice(0, 10) ?? ""} />
                <input name="paidDate" type="date" className="ui-input" defaultValue={payment.paid_date?.slice(0, 10) ?? ""} />
                <select name="paymentStatus" className="ui-input" defaultValue={payment.payment_status}>
                  <option value="">Auto status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="partial">Partial</option>
                  <option value="missed">Missed</option>
                  <option value="disputed">Disputed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <input name="paymentReference" className="ui-input lg:col-span-2" defaultValue={payment.payment_reference ?? ""} placeholder="Payment reference" />
                <input name="notes" className="ui-input lg:col-span-4" placeholder="Notes" />
                <button className="button-primary">Update Payment</button>
              </form>
            );
          }) : <p className="text-sm text-slate-600">No Housing Association cycle payments yet. Create a cycle snapshot to start tracking.</p>}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Landlord Rates" subtitle="Configure property-specific landlord rates. Kings Road is data-driven here, never hardcoded.">
          <form onSubmit={saveRate} className="grid gap-3">
            <select name="propertyId" className="ui-input" required><option value="">Property</option>{snapshot.properties?.map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}</select>
            <select name="landlordId" className="ui-input"><option value="">Use property landlord / unassigned</option>{snapshot.landlords?.map((landlord) => <option key={landlord.id} value={landlord.id}>{landlord.name}</option>)}</select>
            <input name="rateAmount" type="number" step="0.01" className="ui-input" placeholder="Rate amount, e.g. 200.00" required />
            <select name="rateFrequency" className="ui-input" defaultValue="monthly"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="per_cycle">Per cycle</option><option value="custom">Custom</option></select>
            <input name="effectiveFrom" type="date" className="ui-input" />
            <input name="effectiveTo" type="date" className="ui-input" />
            <textarea name="notes" className="ui-input min-h-20" placeholder="Notes" />
            <button className="button-primary">Save Rate</button>
          </form>
          <div className="mt-4 space-y-2 text-sm">
            {(snapshot.landlordPaymentRates ?? []).slice(0, 8).map((rate) => {
              const property = snapshot.properties?.find((item) => item.id === rate.property_id);
              return <p key={rate.id} className="rounded-xl border border-slate-200 bg-white p-3">{property?.address || "Property"}: {money(Number(rate.rate_amount), currency)} / {rate.rate_frequency}</p>;
            })}
          </div>
        </SectionCard>

        <SectionCard title="Remittance Import and Address Search" subtitle="Paste previewed remittance lines as: property address | amount | period start | period end | reference">
          <form onSubmit={importManualRemittance} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-4">
              <select name="housingAssociationId" className="ui-input"><option value="">Housing Association</option>{snapshot.housingAssociations?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input name="cycleListNumber" className="ui-input" placeholder="Cycle number" required />
              <input name="remittanceMonth" type="month" className="ui-input" />
              <input name="sourceFileName" className="ui-input" placeholder="Source file/reference" required />
            </div>
            <textarea name="lines" className="ui-input min-h-28" placeholder="29 York Road | 1320.00 | 2026-01-26 | 2026-02-22 | Cycle98-example" required />
            <button className="button-primary">Validate and Import Remittance Lines</button>
          </form>
          <div className="mt-5">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input className="w-full bg-transparent text-sm outline-none" value={addressSearch} onChange={(event) => setAddressSearch(event.target.value)} placeholder="Search address, e.g. Kings Road" />
            </div>
            <div className="mt-3 space-y-2">
              {remittanceMatches.length ? remittanceMatches.map((line) => {
                const property = snapshot.properties?.find((item) => item.id === line.property_id);
                const obligation = snapshot.landlordPaymentObligations?.find((item) => item.property_id === line.property_id && item.cycle_list_number === line.cycle_list_number);
                return <article key={line.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-semibold text-slate-900">{property?.address || line.raw_property_address}</p>
                  <p className="mt-1 text-slate-600">Cycle {line.cycle_list_number} | received {money(Number(line.gross_amount || line.net_amount || 0), currency)} | {line.match_status}</p>
                  <p className="mt-1 text-slate-600">Payment due: {money(Number(obligation?.calculated_payment_due || 0), currency)} | status: {obligation?.payment_status || "No obligation"}</p>
                  {line.needs_review_reason ? <p className="mt-2 text-rose-600">{line.needs_review_reason}</p> : null}
                </article>;
              }) : <p className="text-sm text-slate-600">No remittance lines match this address yet.</p>}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Landlord Payment Breakdown" subtitle="Record payments manually. This does not send money.">
        <div className="space-y-3">
          {(snapshot.landlordPaymentObligations ?? []).slice(0, 12).map((obligation) => {
            const property = snapshot.properties?.find((item) => item.id === obligation.property_id);
            const landlord = snapshot.landlords?.find((item) => item.id === obligation.landlord_id);
            return <form key={obligation.id} onSubmit={(event) => recordObligation(event, obligation.id)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm lg:grid-cols-7">
              <div className="lg:col-span-2">
                <p className="font-semibold text-slate-900">{property?.address || "Property"}</p>
                <p className="text-xs text-slate-500">{landlord?.name || "No landlord"} | Cycle {obligation.cycle_list_number}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">{obligation.payment_status}</p>
              </div>
              <p className="self-center font-semibold">{money(Number(obligation.calculated_payment_due || 0), currency)}</p>
              <input name="amountPaid" type="number" step="0.01" className="ui-input" defaultValue={obligation.amount_paid ?? "0"} placeholder="Amount paid" />
              <input name="paidDate" type="date" className="ui-input" />
              <input name="paymentReference" className="ui-input" defaultValue={obligation.payment_reference ?? ""} placeholder="Payment ref" />
              <input name="notes" className="ui-input" placeholder="Notes" />
              <button className="button-primary lg:col-span-7">Record Payment</button>
            </form>;
          })}
          {snapshot.landlordPaymentObligations?.length ? null : <p className="text-sm text-slate-600">No landlord payment obligations yet. Import remittance lines after configuring landlord rates.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Council Tax Assisted Property Match" subtitle="Resolve Serenity council tax rows flagged as needs review by linking each row to a property.">
        <div className="space-y-3">
          {councilTaxNeedsReview.length ? councilTaxNeedsReview.slice(0, 30).map((row) => (
            <form key={row.id} onSubmit={(event) => applyCouncilTaxMatch(event, row.id)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm lg:grid-cols-7">
              <div className="lg:col-span-3">
                <p className="font-semibold text-slate-900">{row.source_property_address || "No source address"}</p>
                <p className="text-xs text-slate-500">Account: {row.account_ref || "n/a"} | Tax Year: {row.tax_year}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-rose-600">{row.status}</p>
                {row.needs_review_reason ? <p className="mt-1 text-xs text-rose-500">{row.needs_review_reason}</p> : null}
              </div>
              <select
                className="ui-input lg:col-span-2"
                value={matchSelections[row.id] || ""}
                onChange={(event) => setMatchSelections((current) => ({ ...current, [row.id]: event.target.value }))}
                required
              >
                <option value="">Select matching property</option>
                {(snapshot.properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
              </select>
              <input name="manualNote" className="ui-input lg:col-span-2" placeholder="Optional note for audit trail" />
              <button className="button-primary lg:col-span-7">Apply Match</button>
            </form>
          )) : <p className="text-sm text-slate-600">No council tax rows currently need manual property matching.</p>}
        </div>
      </SectionCard>

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
