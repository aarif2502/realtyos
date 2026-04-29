"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileArchive, Home, Wrench } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  landlords?: Array<{ id: string; name: string }>;
  properties?: Array<{ id: string; landlord_id?: string; address: string; postcode?: string; local_authority?: string; metadata?: { landlordName?: string } }>;
  rooms?: Array<{ id: string; property_id: string; room_label: string; weekly_rent?: string; status: string }>;
  tenants?: Array<{ id: string; property_id?: string; room_id?: string; first_name: string; middle_name?: string; last_name: string; risk_assessment?: string; hb_claim_ref_number?: string }>;
  claims?: Array<{ id: string; tenant_id: string; period?: string; amount?: string; status?: string }>;
  contracts?: Array<{ id: string; tenant_id: string; property_id?: string; room_id?: string; contract_number: string; start_date: string; end_date?: string; weekly_rent?: string; status: string }>;
  ledger?: Array<{ id: string; tenant_id?: string; property_id?: string; contract_id?: string; entry_date: string; type: string; description: string; debit?: string; credit?: string; status: string }>;
  incidents?: Array<{ id: string; property_id?: string; tenant_id?: string; category: string; severity: string; status: string; summary: string }>;
  documents?: Array<{ id: string; property_id?: string; tenant_id?: string; title: string; category: string; file_path: string }>;
};

const tabs = ["Rooms", "Tenants", "Contracts", "Payments", "Maintenance", "Documents"] as const;
type Tab = (typeof tabs)[number];

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [tab, setTab] = useState<Tab>("Rooms");

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" }).then((response) => response.json()).then(setSnapshot);
  }, []);

  const property = snapshot.properties?.find((item) => item.id === params.id) ?? null;
  const currency = snapshot.agency?.currency_code ?? "GBP";
  const rooms = useMemo(() => (snapshot.rooms ?? []).filter((room) => room.property_id === params.id), [params.id, snapshot.rooms]);
  const tenants = useMemo(() => (snapshot.tenants ?? []).filter((tenant) => tenant.property_id === params.id), [params.id, snapshot.tenants]);
  const tenantIds = new Set(tenants.map((tenant) => tenant.id));
  const occupied = rooms.filter((room) => room.status === "occupied").length;
  const weeklyRent = rooms.filter((room) => room.status === "occupied").reduce((sum, room) => sum + Number(room.weekly_rent ?? 0), 0);
  const claims = (snapshot.claims ?? []).filter((claim) => tenantIds.has(claim.tenant_id));
  const contracts = (snapshot.contracts ?? []).filter((contract) => contract.property_id === params.id || tenantIds.has(contract.tenant_id));
  const ledger = (snapshot.ledger ?? []).filter((entry) => entry.property_id === params.id || (entry.tenant_id && tenantIds.has(entry.tenant_id)));
  const incidents = (snapshot.incidents ?? []).filter((incident) => incident.property_id === params.id || (incident.tenant_id && tenantIds.has(incident.tenant_id)));
  const documents = (snapshot.documents ?? []).filter((document) => document.property_id === params.id || (document.tenant_id && tenantIds.has(document.tenant_id)));
  const landlord = snapshot.landlords?.find((item) => item.id === property?.landlord_id);

  if (!property) {
    return (
      <SectionCard title="Property Not Found" subtitle="This property is not present in the live database.">
        <Link href="/app/properties" className="button-primary">Back to Properties</Link>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title={property.address} subtitle="Live property detail from PostgreSQL" action={<Link href="/app/setup" className="button-primary">Edit Property</Link>}>
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === item ? "bg-ink text-white" : "theme-surface"}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Landlord / Owner</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{landlord?.name || property.metadata?.landlordName || "Not assigned"}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Occupancy</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{occupied}/{rooms.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Weekly Rent Roll</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{money(weeklyRent, currency)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Local Authority</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{property.local_authority || "Not set"}</p>
          </article>
        </div>
      </SectionCard>

      {tab === "Rooms" ? (
        <SectionCard title="Units / Rooms" subtitle="Room status and weekly eligible rent">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {rooms.map((room) => (
              <article key={room.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">Room {room.room_label}</p>
                  <Home className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-2 text-slate-600">{money(Number(room.weekly_rent ?? 0), currency)} / week</p>
                <div className="mt-3"><StatusBadge label={room.status} tone={room.status === "occupied" ? "active" : "pending"} /></div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "Tenants" ? (
        <SectionCard title="Tenants" subtitle="Residents assigned to this property">
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <article key={tenant.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-slate-900">{tenant.first_name} {tenant.middle_name} {tenant.last_name}</p>
                <p className="mt-1 text-slate-600">Risk {tenant.risk_assessment || "LOW"} | HB ref {tenant.hb_claim_ref_number || "Not set"}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "Contracts" ? (
        <SectionCard title="Contracts" subtitle="Live tenancy agreements linked to this property">
          <div className="space-y-3">
            {contracts.length ? contracts.map((contract) => {
              const tenant = snapshot.tenants?.find((item) => item.id === contract.tenant_id);
              return (
                <article key={contract.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-semibold text-slate-900">{contract.contract_number}</p>
                  <p className="mt-1 text-slate-600">{tenant ? `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim() : "Unknown tenant"} | {contract.status} | {money(Number(contract.weekly_rent ?? 0), currency)} / week</p>
                  <p className="mt-1 text-slate-500">{contract.start_date?.slice(0, 10)} to {contract.end_date?.slice(0, 10) ?? "open"}</p>
                </article>
              );
            }) : <p className="text-sm text-slate-600">No contract records for this property yet. Use Contracts to create one.</p>}
          </div>
        </SectionCard>
      ) : null}

      {tab === "Payments" ? (
        <SectionCard title="Payments / Ledger" subtitle="Live rent, housing benefit, tenant payments, and adjustments">
          <div className="space-y-3">
            {ledger.length ? ledger.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-slate-900">{entry.description}</p>
                <p className="mt-1 text-slate-600">{entry.entry_date?.slice(0, 10)} | {entry.type.replace(/_/g, " ")} | debit {money(Number(entry.debit ?? 0), currency)} | credit {money(Number(entry.credit ?? 0), currency)}</p>
              </article>
            )) : claims.length ? claims.map((claim) => (
              <article key={claim.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-slate-900">{claim.period || "Legacy claim record"}</p>
                <p className="mt-1 text-slate-600">{money(Number(claim.amount ?? 0), currency)} | {claim.status}</p>
              </article>
            )) : <p className="text-sm text-slate-600">No payment or ledger records for this property yet.</p>}
          </div>
        </SectionCard>
      ) : null}

      {tab === "Maintenance" ? (
        <SectionCard title="Maintenance / Incidents" subtitle="Live incidents linked to this property">
          <div className="space-y-3">
            {incidents.length ? incidents.map((incident) => (
              <article key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{incident.category}</p>
                  <Wrench className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-1 text-slate-600">{incident.severity} | {incident.status}</p>
                <p className="mt-2 text-slate-700">{incident.summary}</p>
              </article>
            )) : <p className="text-sm text-slate-600">No maintenance or incident records for this property yet.</p>}
          </div>
        </SectionCard>
      ) : null}

      {tab === "Documents" ? (
        <SectionCard title="Documents" subtitle="Shared file server document records linked to this property">
          <div className="space-y-3">
            {documents.length ? documents.map((document) => (
              <article key={document.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{document.title}</p>
                    <p className="mt-1 text-slate-600">{document.category}</p>
                  </div>
                  <FileArchive className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-2 break-all text-xs text-slate-500">{document.file_path}</p>
              </article>
            )) : <p className="text-sm text-slate-600">No document records for this property yet.</p>}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
