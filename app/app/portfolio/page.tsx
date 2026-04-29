"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, LineChart, PoundSterling } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  agency?: { currency_code?: string } | null;
  properties?: Array<{ id: string; address: string; postcode?: string; local_authority?: string; total_rooms?: number }>;
  rooms?: Array<{ property_id: string; status: string; weekly_rent?: string }>;
  tenants?: Array<{ property_id?: string; checkout_date?: string | null }>;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function PortfolioPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" }).then((response) => response.json()).then(setSnapshot);
  }, []);

  const currency = snapshot.agency?.currency_code ?? "GBP";
  const portfolio = useMemo(() => {
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

  const totalRooms = portfolio.reduce((sum, property) => sum + property.rooms, 0);
  const totalOccupied = portfolio.reduce((sum, property) => sum + property.occupied, 0);
  const weeklyRent = portfolio.reduce((sum, property) => sum + property.weeklyRent, 0);

  return (
    <RoleGate allow={["admin", "owner"]}>
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="glass-panel rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.14em] theme-muted">Properties</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{portfolio.length}</p>
          </article>
          <article className="glass-panel rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.14em] theme-muted">Occupancy</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{totalRooms ? Math.round((totalOccupied / totalRooms) * 100) : 0}%</p>
          </article>
          <article className="glass-panel rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.14em] theme-muted">Weekly Rent Roll</p>
            <p className="mt-2 text-3xl font-semibold text-indigo-600">{money(weeklyRent, currency)}</p>
          </article>
        </section>

        <SectionCard title="Live Portfolio" subtitle="Database-backed properties, rooms, occupancy, and rent roll">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {portfolio.map((property) => (
              <Link key={property.id} href={`/app/properties/${property.id}`} className="theme-surface-soft rounded-2xl p-4 transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{property.address}</p>
                    <p className="mt-1 text-sm theme-muted">{property.postcode || property.local_authority || "No location metadata"}</p>
                  </div>
                  <Building2 className="h-4 w-4 text-slate-500" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{property.occupied}/{property.rooms} occupied</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">Occupancy {property.occupancy}%</span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-700"><PoundSterling className="h-4 w-4" /> {money(property.weeklyRent, currency)} / week</p>
              </Link>
            ))}
          </div>
        </SectionCard>

        <Link href="/app/setup" className="button-primary fixed bottom-6 right-6 z-20 gap-2 shadow-card">
          <LineChart className="h-4 w-4" />
          Manage Portfolio
        </Link>
      </div>
    </RoleGate>
  );
}
