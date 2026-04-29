"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  rooms?: Array<{ id: string; property_id: string; room_label: string; weekly_rent?: string; status: string }>;
  properties?: Array<{ id: string; address: string }>;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function VacancyIntelligencePage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" }).then((response) => response.json()).then(setSnapshot);
  }, []);

  const currency = snapshot.agency?.currency_code ?? "GBP";
  const vacantRooms = useMemo(() => (snapshot.rooms ?? []).filter((room) => room.status !== "occupied"), [snapshot.rooms]);
  const weeklyLoss = vacantRooms.reduce((sum, room) => sum + Number(room.weekly_rent ?? 0), 0);

  return (
    <RoleGate allow={["admin", "owner"]}>
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Vacant / Void Rooms</p><p className="mt-2 text-3xl font-semibold text-slate-900">{vacantRooms.length}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Weekly Rent Exposure</p><p className="mt-2 text-3xl font-semibold text-rose-600">{money(weeklyLoss, currency)}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Annualised Exposure</p><p className="mt-2 text-3xl font-semibold text-amber-600">{money(weeklyLoss * 52, currency)}</p></article>
        </section>

        <SectionCard title="Vacancy Intelligence" subtitle="Live void and available room analysis from PostgreSQL">
          <div className="space-y-3">
            {vacantRooms.length ? vacantRooms.map((room) => {
              const property = snapshot.properties?.find((item) => item.id === room.property_id);
              return (
                <article key={room.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{property?.address ?? "Unknown property"} | Room {room.room_label}</p>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">{money(Number(room.weekly_rent ?? 0), currency)} / week</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Status: {room.status}</p>
                </article>
              );
            }) : <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No void or available rooms in the database.</p>}
          </div>
        </SectionCard>
      </div>
    </RoleGate>
  );
}
