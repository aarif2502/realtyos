"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Bell, Building2, ChevronDown, CreditCard, FileArchive, LogOut, Search, Settings, UserCircle2, Users, Wrench } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/core/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRole, type AppRole } from "@/hooks/useRole";
import { genericPlatformDefaults } from "@/lib/platform-config";

const titles: Record<string, string> = {
  "/app": "Overview",
  "/app/properties": "Properties",
  "/app/contracts": "Contracts",
  "/app/payments": "Payments",
  "/app/tenants": "Tenants",
  "/app/crm": "CRM Workspace",
  "/app/support-notes": "Weekly Support Notes",
  "/app/maintenance": "Maintenance",
  "/app/owners": "Owners / Landlords",
  "/app/portfolio": "Portfolio View",
  "/app/analytics": "BI Reports",
  "/app/documents": "Documents",
  "/app/settings": "Settings",
  "/app/setup": "Admin Setup",
  "/app/profile": "My Profile",
  "/app/supported-housing": genericPlatformDefaults.productName,
};

type SearchItem = { type: string; label: string; sub: string; href: string };
type QuickAction = { href: string; label: string; icon: ComponentType<{ className?: string }> };
type Snapshot = {
  agency?: { id: string; name: string; trading_name?: string | null };
  properties?: Array<{ id: string; address: string; postcode?: string }>;
  tenants?: Array<{ id: string; first_name: string; middle_name?: string; last_name: string; property_id?: string }>;
  contracts?: Array<{ id: string; contract_number: string; tenant_id: string; status: string }>;
  ledger?: Array<{ id: string; description: string; reference?: string; type: string }>;
  landlords?: Array<{ id: string; name: string; email?: string }>;
  incidents?: Array<{ id: string; summary: string; status: string }>;
};
type ManagingAgent = { id: string; name: string; trading_name?: string | null };
type Tenant = NonNullable<Snapshot["tenants"]>[number];

function fullName(tenant: Tenant) {
  return `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim();
}

function roleSearchPlaceholder(role: AppRole) {
  if (role === "tenant") return "Search support notes / payments";
  if (role === "owner") return "Search assigned properties";
  if (role === "accountant") return "Search ledger / contract / tenant";
  return "Search property / tenant / contract / payment";
}

function quickActionsForRole(role: AppRole): QuickAction[] {
  if (role === "accountant") {
    return [
      { href: "/app/payments", label: "Record Payment", icon: CreditCard },
      { href: "/app/contracts", label: "Open Contracts", icon: FileArchive },
    ];
  }
  return [
    { href: "/app/tenants", label: "Find Tenant", icon: Users },
    { href: "/app/properties", label: "Find Property", icon: Building2 },
    { href: "/app/payments", label: "Record Payment", icon: CreditCard },
    { href: "/app/contracts", label: "Create Contract", icon: FileArchive },
    { href: "/app/documents", label: "Upload Document", icon: FileArchive },
    { href: "/app/maintenance", label: "Maintenance", icon: Wrench },
  ];
}

export function Topbar() {
  const pathname = usePathname();
  const { role } = useRole();
  const [staff, setStaff] = useState<{ fullName?: string; email?: string; role?: string; ownerAdmin?: boolean; agencyLabel?: string | null } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [managingAgents, setManagingAgents] = useState<ManagingAgent[]>([]);
  const [currentAgencyId, setCurrentAgencyId] = useState<string>("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const title = Object.entries(titles)
    .sort((left, right) => right[0].length - left[0].length)
    .find(([route]) => (route === "/app" ? pathname === route : pathname === route || pathname.startsWith(`${route}/`)))?.[1] ?? genericPlatformDefaults.productName;

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" }).then((response) => response.ok ? response.json() : {}).then((payload: Snapshot & { websiteSettings?: Record<string, string> }) => {
      setSnapshot(payload);
      setSettings(payload.websiteSettings || {});
    }).catch(() => setSnapshot({}));
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setQuickOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setQuickOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const searchIndex = useMemo<SearchItem[]>(() => [
    ...(snapshot.properties ?? []).map((property) => ({ type: "Property", label: property.address, sub: property.postcode ?? "No postcode", href: `/app/properties/${property.id}` })),
    ...(snapshot.tenants ?? []).map((tenant) => ({ type: "Tenant", label: fullName(tenant), sub: snapshot.properties?.find((property) => property.id === tenant.property_id)?.address ?? "Unassigned property", href: "/app/tenants" })),
    ...(snapshot.contracts ?? []).map((contract) => ({ type: "Contract", label: contract.contract_number, sub: contract.status, href: "/app/contracts" })),
    ...(snapshot.ledger ?? []).map((entry) => ({ type: "Ledger", label: entry.description, sub: `${entry.type.replace(/_/g, " ")} ${entry.reference ?? ""}`, href: "/app/payments" })),
    ...(snapshot.landlords ?? []).map((landlord) => ({ type: "Landlord", label: landlord.name, sub: landlord.email ?? "No email", href: "/app/owners" })),
  ], [snapshot.contracts, snapshot.landlords, snapshot.ledger, snapshot.properties, snapshot.tenants]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return searchIndex.filter((item) => item.label.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q)).slice(0, 8);
  }, [query, searchIndex]);

  const notifications = useMemo(() => (snapshot.incidents ?? []).filter((incident) => incident.status !== "closed").slice(0, 5), [snapshot.incidents]);
  const roleQuickActions = useMemo(() => quickActionsForRole(role), [role]);
  const profileHref = role === "admin" ? "/app/settings" : "/app/profile";
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setStaff(payload?.staff ?? null))
      .catch(() => setStaff(null));
  }, []);

  useEffect(() => {
    if (staff?.role !== "platform_admin") return;
    fetch("/api/managing-agents", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        setManagingAgents(payload?.agents ?? []);
        setCurrentAgencyId(payload?.currentAgencyId ?? "");
      })
      .catch(() => setManagingAgents([]));
  }, [staff?.role]);

  async function switchManagingAgent(agencyId: string) {
    if (!agencyId || agencyId === currentAgencyId) return;
    const response = await fetch("/api/managing-agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agencyId }),
    });
    if (response.ok) {
      window.location.reload();
    }
  }

  return (
    <header className="glass-panel sticky top-0 z-30 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex items-center gap-3 rounded-full theme-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
        <BrandMark src={settings.platform_logo_path || genericPlatformDefaults.platformLogoPath} className="h-8 w-8 rounded-lg" />
        <span>{pathname === "/app" ? settings.platform_sidebar_label_overview || title : pathname.startsWith("/app/analytics") ? settings.platform_sidebar_label_reports || title : title === genericPlatformDefaults.productName ? settings.platform_title || title : title}</span>
      </div>

      <div ref={menuRef} className="relative flex flex-wrap items-center gap-2 sm:justify-end">
        {staff?.role === "platform_admin" && managingAgents.length ? (
          <select
            aria-label="Managing Agent"
            className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
            value={currentAgencyId}
            onChange={(event) => void switchManagingAgent(event.target.value)}
          >
            {managingAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.trading_name || agent.name}</option>)}
          </select>
        ) : (snapshot.agency?.name || staff?.agencyLabel) ? (
          <span className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 shadow-sm">
            {snapshot.agency?.trading_name || snapshot.agency?.name || staff?.agencyLabel}
          </span>
        ) : null}

        <div className="relative">
          <div className="flex items-center gap-2 rounded-full theme-surface px-3 py-1.5 text-sm theme-muted">
            <Search className="h-4 w-4" />
            <Input className="h-8 w-64 border-0 bg-transparent px-0 py-0" placeholder={roleSearchPlaceholder(role)} value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} />
          </div>
          {searchOpen && query.trim() ? (
            <div className="theme-dropdown absolute right-0 mt-2 w-[380px] rounded-2xl p-2">
              {searchResults.length ? searchResults.map((item) => (
                <Link key={`${item.type}-${item.label}-${item.sub}`} href={item.href} className="flex items-start gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-slate-100/60">
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">{item.type}</span>
                  <span><span className="block font-medium">{item.label}</span><span className="block text-xs theme-muted">{item.sub}</span></span>
                </Link>
              )) : <div className="px-3 py-2 text-sm theme-muted">No live database matches found.</div>}
            </div>
          ) : null}
        </div>

        {role !== "owner" ? (
          <div className="relative">
            <Button variant="secondary" size="icon" aria-label="Notifications" onClick={() => setNotifOpen((open) => !open)}><Bell className="h-4 w-4" /></Button>
            {notifications.length ? <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{notifications.length}</span> : null}
            {notifOpen ? (
              <div className="theme-dropdown absolute right-0 mt-2 w-80 rounded-2xl p-3">
                <p className="px-1 text-xs uppercase tracking-[0.14em] theme-muted">Open Incidents</p>
                <div className="mt-2 space-y-2">
                  {notifications.length ? notifications.map((note) => <div key={note.id} className="theme-surface-soft rounded-xl p-3 text-sm"><p>{note.summary}</p><p className="mt-1 text-xs theme-muted">{note.status}</p></div>) : <p className="px-1 py-2 text-sm theme-muted">No open incident alerts.</p>}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="relative">
          <Button variant="secondary" className="gap-2" onClick={() => setQuickOpen((open) => !open)}>Quick Actions<ChevronDown className="h-4 w-4" /></Button>
          {quickOpen ? <div className="theme-dropdown absolute right-0 mt-2 w-64 rounded-2xl p-2">{roleQuickActions.map((action) => <Link key={action.href} href={action.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-slate-100/60"><action.icon className="h-4 w-4" />{action.label}</Link>)}</div> : null}
        </div>

        <div className="relative">
          <Button variant="secondary" className="gap-2 capitalize" onClick={() => setProfileOpen((open) => !open)}>{staff?.role ?? role}<ChevronDown className="h-4 w-4" /></Button>
          {profileOpen ? (
            <div className="theme-dropdown absolute right-0 mt-2 w-64 rounded-2xl p-2">
              <Link href={profileHref} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-slate-100/60"><UserCircle2 className="h-4 w-4" />My Profile</Link>
              <div className="my-1 border-t border-slate-200" />
              <p className="px-3 py-1 text-[11px] uppercase tracking-[0.14em] theme-muted">Signed in</p>
              <p className="px-3 text-sm font-semibold text-slate-900">{staff?.fullName ?? "Staff user"}</p>
              <p className="px-3 pb-2 text-xs theme-muted">{staff?.email ?? "Session active"}</p>
              {staff?.ownerAdmin ? <Link href="/app/setup" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-slate-100/60"><Settings className="h-4 w-4" />Owner setup</Link> : null}
              <div className="my-1 border-t border-slate-200" />
              <Link href="/login" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50/70"><LogOut className="h-4 w-4" />Sign Out</Link>
            </div>
          ) : null}
        </div>

        <ThemeToggle />
        <Link href="/app/settings" aria-label="Settings" className="inline-flex h-9 w-9 items-center justify-center rounded-full theme-surface transition hover:bg-slate-100/70"><Settings className="h-4 w-4" /></Link>
      </div>
    </header>
  );
}
