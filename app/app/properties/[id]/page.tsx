"use client";

import { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClipboardCheck, FileArchive, Home, Upload, Wrench } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { SlidePanel } from "@/components/SlidePanel";

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
  propertyCertificates?: Array<{ id: string; property_id: string; certificate_type: string; certificate_name: string; certificate_number?: string; issuing_authority?: string; issue_date?: string; expiry_date?: string; status: string; storage_key?: string; file_path?: string; notes?: string }>;
};

const tabs = ["Rooms", "Tenants", "Contracts", "Payments", "Maintenance", "Documents", "Certificates"] as const;
type Tab = (typeof tabs)[number];

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [authRole, setAuthRole] = useState<string>("");
  const [tab, setTab] = useState<Tab>("Rooms");
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certificateMessage, setCertificateMessage] = useState<string | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);

  async function refresh() {
    const [erpResponse, authResponse] = await Promise.all([
      fetch("/api/erp", { cache: "no-store" }),
      fetch("/api/auth/me", { cache: "no-store" }),
    ]);
    setSnapshot(await erpResponse.json());
    const authPayload = await authResponse.json().catch(() => ({}));
    setAuthRole(String(authPayload?.staff?.role || ""));
  }

  useEffect(() => {
    void refresh();
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
  const certificates = (snapshot.propertyCertificates ?? []).filter((certificate) => certificate.property_id === params.id);
  const landlord = snapshot.landlords?.find((item) => item.id === property?.landlord_id);

  async function uploadCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("propertyId", params.id);
    setCertificateMessage(null);
    setCertificateError(null);

    const response = await fetch("/api/property-certificates", { method: "POST", body: formData });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to upload certificate." }));
      setCertificateError(payload.error || "Unable to upload certificate.");
      return;
    }

    form.reset();
    setCertificateMessage("Certificate uploaded and expiry status calculated.");
    await refresh();
  }

  async function updateProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(`/api/erp/properties?id=${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to update property." }));
      setError(payload.error ?? "Unable to update property.");
      return;
    }
    setEditOpen(false);
    setMessage("Property updated.");
    await refresh();
  }

  if (!property) {
    return (
      <SectionCard title="Property Not Found" subtitle="This property is not present in the live database.">
        <Link href="/app/properties" className="button-primary">Back to Properties</Link>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      <SectionCard
        title={property.address}
        subtitle="Live property detail from PostgreSQL"
        action={["admin", "manager", "housing_officer", "platform_admin"].includes(authRole) ? <button type="button" onClick={() => setEditOpen(true)} className="button-primary">Edit Property</button> : undefined}
      >
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

      {tab === "Certificates" ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Upload Certificate" subtitle="Attach property compliance evidence and let the platform calculate expiry status.">
            {certificateMessage ? <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{certificateMessage}</div> : null}
            {certificateError ? <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{certificateError}</div> : null}
            <form onSubmit={uploadCertificate} className="grid gap-3">
              <select name="certificateType" className="ui-input" defaultValue="Gas Safety Certificate">
                <option>Gas Safety Certificate</option>
                <option>Electrical Installation Condition Report / EICR</option>
                <option>EPC</option>
                <option>Fire Risk Assessment</option>
                <option>HMO Licence</option>
                <option>Insurance</option>
                <option>PAT Testing</option>
                <option>Asbestos Report</option>
                <option>Legionella Risk Assessment</option>
                <option>Other</option>
              </select>
              <input name="certificateName" className="ui-input" placeholder="Certificate title" required />
              <input name="certificateNumber" className="ui-input" placeholder="Certificate reference / number" />
              <input name="issuingAuthority" className="ui-input" placeholder="Issuing authority / provider" />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Issue date<input name="issueDate" type="date" className="ui-input" /></label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Expiry date<input name="expiryDate" type="date" className="ui-input" required /></label>
              </div>
              <textarea name="notes" className="ui-input min-h-24" placeholder="Notes" />
              <input name="file" type="file" className="ui-input" accept=".pdf,image/png,image/jpeg,image/webp" required />
              <button className="button-primary gap-2"><Upload className="h-4 w-4" /> Upload Certificate</button>
            </form>
          </SectionCard>

          <SectionCard title="Property Certificates" subtitle="Expiry status is calculated from metadata and uploaded evidence.">
            <div className="space-y-3">
              {certificates.length ? certificates.map((certificate) => (
                <article key={certificate.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{certificate.certificate_name}</p>
                      <p className="mt-1 text-slate-600">{certificate.certificate_type}</p>
                    </div>
                    <StatusBadge label={certificate.status.replace(/_/g, " ")} tone={certificate.status === "valid" ? "active" : certificate.status === "expired" || certificate.status === "missing_info" ? "overdue" : "pending"} />
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <span>Reference: {certificate.certificate_number || "Not set"}</span>
                    <span>Provider: {certificate.issuing_authority || "Not set"}</span>
                    <span>Issue date: {certificate.issue_date?.slice(0, 10) || "Not set"}</span>
                    <span>Expiry date: {certificate.expiry_date?.slice(0, 10) || "Not set"}</span>
                  </div>
                  {certificate.storage_key ? <Link href={`/api/storage/open?path=${encodeURIComponent(certificate.storage_key)}`} target="_blank" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><ClipboardCheck className="h-4 w-4" /> Open certificate</Link> : null}
                </article>
              )) : <p className="text-sm text-slate-600">No property certificates uploaded yet.</p>}
            </div>
          </SectionCard>
        </div>
      ) : null}

      <SlidePanel open={editOpen} title="Edit Property" onClose={() => setEditOpen(false)}>
        <form onSubmit={updateProperty} className="grid gap-3">
          <input name="address" className="ui-input" defaultValue={property.address} placeholder="Property address" required />
          <input name="postcode" className="ui-input" defaultValue={property.postcode ?? ""} placeholder="Postcode" />
          <input name="localAuthority" className="ui-input" defaultValue={property.local_authority ?? ""} placeholder="Local authority" />
          <button className="button-primary">Save Property</button>
        </form>
      </SlidePanel>
    </div>
  );
}
