"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { SlidePanel } from "@/components/SlidePanel";
import { StatusBadge } from "@/components/StatusBadge";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  properties?: Array<{ id: string; address: string; postcode?: string; local_authority?: string; total_rooms?: number; metadata?: { landlordName?: string } }>;
  rooms?: Array<{ property_id: string; status: string; weekly_rent?: string }>;
  tenants?: Array<{ property_id?: string; checkout_date?: string | null }>;
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
                      <Link href={`/app/properties/${property.id}`} className="button-secondary">Open</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <Link href="/app/setup" className="button-secondary">Edit Property</Link>
            </div>
          </div>
        ) : null}
      </SlidePanel>

      <SlidePanel open={addOpen} title="Add Property" onClose={() => setAddOpen(false)}>
        <form onSubmit={addProperty} className="grid gap-3">
          <input name="address" className="ui-input" placeholder="Property address" required />
          <input name="postcode" className="ui-input" placeholder="Postcode" />
          <input name="localAuthority" className="ui-input" placeholder="Local authority" />
          <input name="totalRooms" type="number" className="ui-input" placeholder="Number of rooms" required />
          <input name="weeklyRent" type="number" step="0.01" className="ui-input" placeholder="Default weekly eligible rent" />
          <input name="landlordName" className="ui-input" placeholder="Landlord / owner name" />
          <button className="button-primary gap-2"><Building2 className="h-4 w-4" /> Save Property</button>
        </form>
      </SlidePanel>
    </div>
  );
}
