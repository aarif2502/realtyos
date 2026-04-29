"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Save, Trash2, UserSquare2 } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  landlords?: Array<{ id: string; name: string; email?: string; phone?: string; address?: string; notes?: string; portal_enabled?: boolean }>;
  properties?: Array<{ id: string; landlord_id?: string; address: string; total_rooms?: number }>;
};

async function submitJson(path: string, form: HTMLFormElement, method = "POST") {
  const body = Object.fromEntries(new FormData(form).entries());
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Unable to save." }));
    throw new Error(payload.error ?? "Unable to save.");
  }
}

export default function OwnersPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setError(null);
    try {
      await submitJson("/api/erp/landlords", form);
      form.reset();
      setMessage("Landlord account created.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create landlord.");
    }
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const propertyId = data.get("propertyId");
    if (!propertyId) return;
    setMessage(null);
    setError(null);
    try {
      await submitJson(`/api/erp/properties?id=${propertyId}`, form, "PATCH");
      setMessage("Property assignment updated.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to assign property.");
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/erp/landlords?id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Unable to delete landlord.");
      return;
    }
    setMessage("Landlord deleted and property assignments cleared.");
    await refresh();
  }

  const rows = useMemo(() => (snapshot.landlords ?? []).map((landlord) => ({
    ...landlord,
    properties: (snapshot.properties ?? []).filter((property) => property.landlord_id === landlord.id),
  })), [snapshot.landlords, snapshot.properties]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Landlords</p><p className="mt-2 text-2xl font-semibold text-slate-900">{snapshot.landlords?.length ?? 0}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Assigned Properties</p><p className="mt-2 text-2xl font-semibold text-slate-900">{(snapshot.properties ?? []).filter((property) => property.landlord_id).length}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Unassigned Properties</p><p className="mt-2 text-2xl font-semibold text-slate-900">{(snapshot.properties ?? []).filter((property) => !property.landlord_id).length}</p></article>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Create Landlord / Owner" subtitle="Contact details and owner portal flag stored in PostgreSQL">
          <form onSubmit={handleCreate} className="grid gap-3">
            <input name="name" className="ui-input" placeholder="Landlord / owner name" required />
            <input name="email" type="email" className="ui-input" placeholder="Email" />
            <input name="phone" className="ui-input" placeholder="Phone" />
            <input name="address" className="ui-input" placeholder="Correspondence address" />
            <textarea name="notes" className="ui-input min-h-28" placeholder="Notes, payment terms, statement preferences" />
            <label className="flex items-center gap-2 text-sm text-slate-700"><input name="portalEnabled" type="checkbox" value="true" /> Enable owner portal later</label>
            <button className="button-primary gap-2"><UserSquare2 className="h-4 w-4" /> Create Landlord</button>
          </form>
        </SectionCard>

        <SectionCard title="Assign Property" subtitle="Attach a property to its owner or landlord account">
          <form onSubmit={handleAssign} className="grid gap-3">
            <select name="propertyId" className="ui-input" required>
              <option value="">Property</option>
              {(snapshot.properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
            </select>
            <select name="landlordId" className="ui-input" required>
              <option value="">Landlord / owner</option>
              {(snapshot.landlords ?? []).map((landlord) => <option key={landlord.id} value={landlord.id}>{landlord.name}</option>)}
            </select>
            <button className="button-primary gap-2"><Save className="h-4 w-4" /> Save Assignment</button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Landlord Accounts" subtitle="Live owner records and assigned supported-housing properties">
        <div className="grid gap-3">
          {rows.length ? rows.map((landlord) => (
            <article key={landlord.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{landlord.name}</p>
                  <p className="mt-1 text-slate-600">{landlord.email || "No email"} | {landlord.phone || "No phone"} | portal {landlord.portal_enabled ? "enabled" : "disabled"}</p>
                  <p className="mt-2 text-slate-600">{landlord.properties.length ? landlord.properties.map((property) => property.address).join(" | ") : "No properties assigned"}</p>
                </div>
                <button onClick={() => remove(landlord.id)} className="button-secondary gap-2 py-2 text-rose-600"><Trash2 className="h-4 w-4" /> Delete</button>
              </div>
            </article>
          )) : <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><Building2 className="mr-2 inline h-4 w-4" /> No landlord accounts exist yet.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
