"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  tenants?: Array<{ id: string; first_name: string; middle_name?: string; last_name: string; property_id?: string; room_id?: string; checkin_date?: string; checkout_date?: string; risk_assessment?: string; hb_claim_ref_number?: string }>;
  properties?: Array<{ id: string; address: string }>;
  rooms?: Array<{ id: string; room_label: string; weekly_rent?: string; status: string }>;
  supportNotes?: Array<{ id: string; tenant_id: string; week_start: string; note: string; outcomes?: string; next_actions?: string }>;
  contracts?: Array<{ id: string; tenant_id: string; contract_number: string; status: string; weekly_rent?: string }>;
  ledger?: Array<{ id: string; tenant_id?: string; entry_date: string; description: string; debit?: string; credit?: string; status: string }>;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" }).then((response) => response.json()).then(setSnapshot);
  }, []);

  const tenant = snapshot.tenants?.find((item) => item.id === params.id);
  const property = snapshot.properties?.find((item) => item.id === tenant?.property_id);
  const room = snapshot.rooms?.find((item) => item.id === tenant?.room_id);
  const currency = snapshot.agency?.currency_code ?? "GBP";
  const notes = useMemo(() => (snapshot.supportNotes ?? []).filter((note) => note.tenant_id === params.id), [params.id, snapshot.supportNotes]);
  const contracts = useMemo(() => (snapshot.contracts ?? []).filter((contract) => contract.tenant_id === params.id), [params.id, snapshot.contracts]);
  const ledger = useMemo(() => (snapshot.ledger ?? []).filter((entry) => entry.tenant_id === params.id), [params.id, snapshot.ledger]);
  const balance = ledger.filter((entry) => entry.status !== "void").reduce((sum, entry) => sum + Number(entry.debit ?? 0) - Number(entry.credit ?? 0), 0);

  if (!tenant) {
    return (
      <SectionCard title="Tenant Not Found" subtitle="This tenant is not present in the live database.">
        <Link href="/app/tenants" className="button-primary">Back to Tenants</Link>
      </SectionCard>
    );
  }

  const name = `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim();

  return (
    <div className="space-y-6">
      <SectionCard title={name} subtitle={`${property?.address ?? "Unassigned property"}${room ? ` | Room ${room.room_label}` : ""}`}>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Status</p><p className="mt-2 text-2xl font-semibold text-slate-900">{tenant.checkout_date ? "Closed" : "Active"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Risk</p><p className="mt-2 text-2xl font-semibold text-slate-900">{tenant.risk_assessment ?? "LOW"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Weekly Rent</p><p className="mt-2 text-2xl font-semibold text-slate-900">{money(Number(room?.weekly_rent ?? 0), currency)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Ledger Balance</p><p className="mt-2 text-2xl font-semibold text-slate-900">{money(balance, currency)}</p></div>
        </div>
      </SectionCard>

      <SectionCard title="Contracts" subtitle="Live tenancy contracts linked to this tenant">
        <div className="space-y-3">
          {contracts.length ? contracts.map((contract) => <div key={contract.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-medium text-slate-900">{contract.contract_number}</p><p className="mt-1 text-slate-600">{contract.status} | {money(Number(contract.weekly_rent ?? 0), currency)} / week</p></div>) : <p className="text-sm text-slate-600">No contracts linked to this tenant.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Support Notes" subtitle="Recent weekly support notes">
        <div className="space-y-3">
          {notes.length ? notes.slice(0, 10).map((note) => <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-medium text-slate-900">{note.week_start}</p><p className="mt-1 text-slate-700">{note.note}</p></div>) : <p className="text-sm text-slate-600">No support notes for this tenant yet.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
