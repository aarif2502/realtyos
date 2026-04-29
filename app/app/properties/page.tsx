"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ClipboardCheck, Plus } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { SlidePanel } from "@/components/SlidePanel";
import { StatusBadge } from "@/components/StatusBadge";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  properties?: Array<{ id: string; address: string; postcode?: string; local_authority?: string; total_rooms?: number; housing_association_id?: string; metadata?: { landlordName?: string } }>;
  rooms?: Array<{ property_id: string; status: string; weekly_rent?: string }>;
  tenants?: Array<{ property_id?: string; checkout_date?: string | null }>;
  propertyCertificates?: Array<{ id: string; property_id: string; certificate_type: string; certificate_name: string; expiry_date?: string; status: string; storage_key?: string }>;
  housingAssociations?: Array<{ id: string; name: string; status: string }>;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function PropertiesPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null);
  const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  const currency = snapshot.agency?.currency_code ?? "GBP";
  const rows = useMemo(() => {
    return (snapshot.properties ?? []).map((property) => {
      const rooms = (snapshot.rooms ?? []).filter((room) => room.property_id === property.id);
      const occupied = rooms.filter((room) => room.status === "occupied").length;
      const weeklyRent = rooms.filter((room) => room.status === "occupied").reduce((sum, room) => sum + Number(room.weekly_rent ?? 0), 0);

      return {
        ...property,
        rooms: rooms.length,
        occupied,
        occupancy: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0,
        weeklyRent,
      };
    });
  }, [snapshot.properties, snapshot.rooms]);

  const selected = rows.find((property) => property.id === selectedPropertyId) ?? null;
  const certificates = snapshot.propertyCertificates ?? [];
  const certificateAlerts = certificates.filter((certificate) => certificate.status === "expired" || certificate.status === "expiring_soon" || certificate.status === "missing_info");

  async function addProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setError(null);
    setMessage(null);

    const response = await fetch("/api/erp/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to add property." }));
      setError(payload.error ?? "Unable to add property.");
      return;
    }

    form.reset();
    setAddOpen(false);
    setMessage("Property added.");
    await refresh();
  }

  async function editProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editPropertyId) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/erp/properties?id=${encodeURIComponent(editPropertyId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editPropertyId, ...body }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to edit property." }));
      setError(payload.error ?? "Unable to edit property.");
      return;
    }
    setEditOpen(false);
    setEditPropertyId(null);
    setMessage("Property updated.");
    await refresh();
  }

  async function removeProperty(propertyId: string) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/erp/properties?id=${encodeURIComponent(propertyId)}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to remove property." }));
      setError(payload.error ?? "Unable to remove property.");
      return;
    }
    setDeletePropertyId(null);
    setMessage("Property removed.");
    await refresh();
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <SectionCard title="Properties" subtitle="Live supported-housing schemes from PostgreSQL" action={<button onClick={() => setAddOpen(true)} className="button-primary gap-2"><Plus className="h-4 w-4" /> Add Property</button>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="pb-3">Property</th>
                <th className="pb-3">Landlord / Owner</th>
                <th className="pb-3">Rooms</th>
                <th className="pb-3">Occupancy</th>
                <th className="pb-3">Weekly Rent Roll</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((property) => (
                <tr key={property.id}>
                  <td className="py-4">
                    <p className="font-semibold text-slate-900">{property.address}</p>
                    <p className="text-xs text-slate-500">{property.postcode || property.local_authority || "No metadata"}</p>
                  </td>
                  <td className="py-4 text-slate-700">{property.metadata?.landlordName || "Not assigned"}</td>
                  <td className="py-4 text-slate-700">{property.rooms}</td>
                  <td className="py-4"><StatusBadge label={`${property.occupancy}%`} tone={property.occupancy >= 90 ? "active" : property.occupancy >= 70 ? "pending" : "overdue"} /></td>
                  <td className="py-4 text-slate-700">{money(property.weeklyRent, currency)}</td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSelectedPropertyId(property.id)} className="button-secondary">Quick View</button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPropertyId(property.id);
                          setEditOpen(true);
                        }}
                        className="button-secondary"
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => setDeletePropertyId(property.id)} className="button-secondary text-rose-700">Remove</button>
                      <Link href={`/app/properties/${property.id}`} className="button-secondary">Open</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Property Certificate Alerts" subtitle="Managing-Agent-scoped compliance certificates sorted by the closest expiry date.">
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-rose-700">Expired</p>
            <p className="mt-2 text-3xl font-black text-rose-950">{certificates.filter((certificate) => certificate.status === "expired").length}</p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-amber-700">Expiring soon</p>
            <p className="mt-2 text-3xl font-black text-amber-950">{certificates.filter((certificate) => certificate.status === "expiring_soon").length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Valid</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{certificates.filter((certificate) => certificate.status === "valid").length}</p>
          </article>
        </div>
        <div className="mt-4 space-y-3">
          {certificateAlerts.length ? certificateAlerts.slice(0, 12).map((certificate) => {
            const property = rows.find((item) => item.id === certificate.property_id);
            return (
              <article key={certificate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{certificate.certificate_name}</p>
                  <p className="mt-1 text-slate-600">{property?.address || "Unknown property"} | {certificate.certificate_type} | expires {certificate.expiry_date?.slice(0, 10) || "not set"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={certificate.status.replace(/_/g, " ")} tone={certificate.status === "expired" || certificate.status === "missing_info" ? "overdue" : "pending"} />
                  <Link href={`/app/properties/${certificate.property_id}`} className="button-secondary gap-2"><ClipboardCheck className="h-4 w-4" /> Manage</Link>
                </div>
              </article>
            );
          }) : <p className="text-sm text-slate-600">No certificate expiry alerts for this Managing Agent.</p>}
        </div>
      </SectionCard>

      <SlidePanel open={Boolean(selected)} title={selected?.address ?? "Property"} onClose={() => setSelectedPropertyId(null)}>
        {selected ? (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">Landlord / owner: {selected.metadata?.landlordName || "Not assigned"}</p>
            <p className="text-slate-600">Rooms: {selected.rooms}</p>
            <p className="text-slate-600">Occupancy: {selected.occupied}/{selected.rooms}</p>
            <p className="text-slate-600">Weekly rent roll: {money(selected.weeklyRent, currency)}</p>
            <div className="grid gap-2">
              <Link href={`/app/properties/${selected.id}`} className="button-secondary">Open Detail Tabs</Link>
              <Link href={`/app/properties/${selected.id}`} className="button-secondary">Edit Property</Link>
            </div>
          </div>
        ) : null}
      </SlidePanel>

      <SlidePanel open={addOpen} title="Add Property" onClose={() => setAddOpen(false)}>
        <form onSubmit={addProperty} className="grid gap-3">
          <input name="address" className="ui-input" placeholder="Property address" required />
          <input name="postcode" className="ui-input" placeholder="Postcode" />
          <input name="localAuthority" className="ui-input" placeholder="Local authority" />
          <select name="housingAssociationId" className="ui-input">
            <option value="">Housing Association</option>
            {snapshot.housingAssociations?.filter((item) => item.status !== "inactive").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input name="totalRooms" type="number" className="ui-input" placeholder="Number of rooms" required />
          <input name="weeklyRent" type="number" step="0.01" className="ui-input" placeholder="Default weekly eligible rent" />
          <input name="landlordName" className="ui-input" placeholder="Landlord / owner name" />
          <button className="button-primary gap-2"><Building2 className="h-4 w-4" /> Save Property</button>
        </form>
      </SlidePanel>

      <SlidePanel open={editOpen && Boolean(editPropertyId)} title="Edit Property" onClose={() => { setEditOpen(false); setEditPropertyId(null); }}>
        {editPropertyId ? (() => {
          const item = rows.find((row) => row.id === editPropertyId);
          if (!item) return <p className="text-sm text-slate-600">Property not found.</p>;
          return (
            <form onSubmit={editProperty} className="grid gap-3">
              <input name="address" className="ui-input" defaultValue={item.address} placeholder="Property address" required />
              <input name="postcode" className="ui-input" defaultValue={item.postcode || ""} placeholder="Postcode" />
              <input name="localAuthority" className="ui-input" defaultValue={item.local_authority || ""} placeholder="Local authority" />
              <select name="housingAssociationId" className="ui-input" defaultValue={item.housing_association_id || ""}>
                <option value="">Housing Association</option>
                {snapshot.housingAssociations?.filter((entry) => entry.status !== "inactive").map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
              <input name="totalRooms" type="number" className="ui-input" defaultValue={item.total_rooms || 0} placeholder="Number of rooms" required />
              <button className="button-primary">Save Changes</button>
            </form>
          );
        })() : null}
      </SlidePanel>

      <SlidePanel open={Boolean(deletePropertyId)} title="Remove Property" onClose={() => setDeletePropertyId(null)}>
        {deletePropertyId ? (() => {
          const item = rows.find((row) => row.id === deletePropertyId);
          return (
            <div className="space-y-4 text-sm text-slate-700">
              <p>Remove <strong>{item?.address || "this property"}</strong> from PMS?</p>
              <p className="text-rose-700">Only do this when the property is genuinely duplicate or retired.</p>
              <button className="button-primary bg-rose-700 hover:bg-rose-800" onClick={() => void removeProperty(deletePropertyId)}>Confirm Remove</button>
            </div>
          );
        })() : null}
      </SlidePanel>
    </div>
  );
}
