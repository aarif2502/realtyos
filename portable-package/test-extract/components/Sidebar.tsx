"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  HeartHandshake,
  LayoutGrid,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useRole, type AppRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

type LinkItem = { type: "link"; href: string; label: string; icon: ComponentType<{ className?: string }>; roles?: AppRole[] };
type GroupItem = {
  type: "group";
  id: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  roles?: AppRole[];
  children: Array<{ href: string; label: string; roles?: AppRole[] }>;
};

type NavItem = LinkItem | GroupItem;

const navItems: NavItem[] = [
  { type: "link", href: "/app", label: "Dashboard", icon: LayoutGrid },
  {
    type: "group",
    id: "daily",
    label: "PMS",
    description: "Properties, tenants and documents",
    icon: HeartHandshake,
    children: [
      { href: "/app/tenants", label: "Tenants" },
      { href: "/app/maintenance", label: "Maintenance" },
      { href: "/app/documents", label: "Documents" },
      { href: "/app/properties", label: "Properties" },
    ],
  },
  {
    type: "group",
    id: "crm",
    label: "CRM",
    description: "Referrals and partners",
    icon: Users,
    children: [
      { href: "/app/crm", label: "Referrals & Partners" },
      { href: "/app/automation", label: "Reminders" },
    ],
  },
  {
    type: "group",
    id: "compliance",
    label: "Compliance",
    description: "Support evidence and audit",
    icon: ShieldCheck,
    children: [
      { href: "/app/compliance", label: "Support Plans & Risk" },
      { href: "/app/support-notes", label: "Case Notes" },
    ],
  },
  {
    type: "group",
    id: "finance",
    label: "Finance & Contracts",
    description: "Rent, HB/UC and payments",
    icon: CreditCard,
    roles: ["admin", "agent", "accountant"],
    children: [
      { href: "/app/finance", label: "Finance Hub" },
      { href: "/app/contracts", label: "Contracts" },
      { href: "/app/payments", label: "Rent Ledger" },
      { href: "/app/owners", label: "Landlords / Owners", roles: ["admin", "accountant"] },
    ],
  },
  {
    type: "group",
    id: "reports",
    label: "Reports",
    description: "Analytics and management view",
    icon: BarChart3,
    children: [
      { href: "/app/analytics", label: "Analytics" },
    ],
  },
  {
    type: "group",
    id: "admin",
    label: "Admin",
    description: "Setup and configuration",
    icon: Wrench,
    roles: ["admin"],
    children: [
      { href: "/app/settings", label: "Settings" },
      { href: "/app/setup", label: "Setup Panel" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function canView(role: AppRole, roles?: AppRole[]) {
  if (!roles || roles.length === 0) {
    return true;
  }
  return roles.includes(role);
}

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useRole();
  const visibleNavItems = useMemo(() => {
    return navItems
      .filter((item) => canView(role, item.roles))
      .map((item) => {
        if (item.type === "link") {
          return item;
        }

        const children = item.children.filter((child) => canView(role, child.roles));
        if (children.length === 0) {
          return null;
        }

        return { ...item, children };
      })
      .filter(Boolean) as NavItem[];
  }, [role]);

  const activeGroupId = useMemo(() => {
    const groups = visibleNavItems.filter((item): item is GroupItem => item.type === "group");
    return groups.find((group) => group.children.some((child) => isActive(pathname, child.href)))?.id ?? null;
  }, [pathname, visibleNavItems]);

  const [openGroupId, setOpenGroupId] = useState<string | null>(activeGroupId);

  useEffect(() => {
    setOpenGroupId(activeGroupId);
  }, [activeGroupId]);

  if (role === "tenant") {
    return (
      <aside className="glass-panel sticky top-0 hidden h-full max-h-[calc(100dvh-2rem)] w-72 shrink-0 overflow-y-auto border border-white/70 p-4 lg:block">
        <div className="rounded-2xl bg-ink p-4 text-white">
          <div className="flex items-center gap-3">
            <BrandMark className="h-12 w-12 rounded-2xl" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">GoldenHub Realty OS</p>
              <p className="mt-1 text-xs text-white/70">Role: tenant</p>
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
          Tenant portal access is not enabled. Please sign in with a staff account to use RealtyOS.
          <Link href="/realtyos/admin/login" className="button-primary mt-4 w-full justify-center">
            Staff Sign In
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="glass-panel sticky top-0 hidden h-full max-h-[calc(100dvh-2rem)] w-72 shrink-0 overflow-y-auto border border-white/70 p-4 lg:block">
      <div className="rounded-2xl bg-ink p-4 text-white">
        <div className="flex items-center gap-3">
          <BrandMark className="h-12 w-12 rounded-2xl" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">UK Support Housing</p>
            <p className="mt-1 text-xs text-white/70">Role: {role}</p>
          </div>
        </div>
      </div>

      <nav className="mt-5 space-y-2">
        {visibleNavItems.map((item) => {
          if (item.type === "link") {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active ? "bg-ink text-white" : "text-slate-700 hover:bg-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          }

          const opened = openGroupId === item.id;
          const groupActive = item.children.some((child) => isActive(pathname, child.href));

          return (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/75 p-2 shadow-sm">
              <button
                type="button"
                onClick={() => setOpenGroupId((current) => (current === item.id ? null : item.id))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                  groupActive ? "bg-ink text-white" : "text-slate-700 hover:bg-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1 text-left">
                  <span className="block">{item.label}</span>
                  {item.description ? <span className={cn("block text-[11px] font-normal", groupActive ? "text-white/70" : "text-slate-500")}>{item.description}</span> : null}
                </span>
                <ChevronDown className={cn("h-4 w-4 transition", opened ? "rotate-180" : "rotate-0")} />
              </button>
              {opened ? (
                <div className="mt-1 space-y-1 px-1 pb-1">
                  {item.children.map((child) => {
                    const active = isActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm",
                          active ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-white",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
