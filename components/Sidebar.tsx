"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
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
import { appPath, genericPlatformDefaults } from "@/lib/platform-config";

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
  { type: "link", href: "/app", label: "Command Centre", icon: LayoutGrid },
  {
    type: "group",
    id: "daily",
    label: "Accommodation",
    description: "Homes, residents and documents",
    icon: HeartHandshake,
    children: [
      { href: "/app/tenants", label: "Residents" },
      { href: "/app/maintenance", label: "Maintenance" },
      { href: "/app/documents", label: "Document Vault" },
      { href: "/app/properties", label: "Properties & Rooms" },
    ],
  },
  {
    type: "link",
    href: "/app/crm",
    label: "Referral CRM",
    icon: Users,
  },
  {
    type: "group",
    id: "compliance",
    label: "Support & Risk",
    description: "Evidence, plans and audit trail",
    icon: ShieldCheck,
    children: [
      { href: "/app/compliance", label: "Plans & Risk" },
      { href: "/app/support-notes", label: "Support Notes" },
    ],
  },
  {
    type: "group",
    id: "finance",
    label: "Finance",
    description: "Rent, HB/UC and contracts",
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
    description: "BI, storyboards and board packs",
    icon: BarChart3,
    children: [
      { href: "/app/analytics", label: "Executive BI" },
    ],
  },
  {
    type: "group",
    id: "admin",
    label: "Admin",
    description: "Branding and system setup",
    icon: Wrench,
    roles: ["admin"],
    children: [
      { href: "/app/settings", label: "Brand Settings" },
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
  const [settings, setSettings] = useState<Record<string, string>>({});
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

  useEffect(() => {
    fetch("/api/erp", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : {})
      .then((payload: { websiteSettings?: Record<string, string> }) => setSettings(payload.websiteSettings || {}))
      .catch(() => setSettings({}));
  }, []);

  const brand = settings.platform_sidebar_brand || genericPlatformDefaults.companyName;
  const logoPath = settings.platform_logo_path || genericPlatformDefaults.platformLogoPath;
  const overviewLabel = settings.platform_sidebar_label_overview || "Command Centre";
  const reportsLabel = settings.platform_sidebar_label_reports || "Executive BI";
  const primaryColor = settings.platform_primary_color || "";

  if (role === "tenant") {
    return (
      <aside className="goldenhub-sidebar glass-panel sticky top-0 hidden h-full max-h-[calc(100dvh-2rem)] w-72 shrink-0 overflow-y-auto p-4 lg:block">
        <div className="goldenhub-sidebar-hero rounded-[28px] p-4 text-white">
          <div className="flex items-center gap-3">
            <BrandMark src={logoPath} className="h-12 w-12 rounded-2xl" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-gold-100/80">{brand}</p>
              <p className="mt-1 text-xs text-white/70">Resident access</p>
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-200/30 bg-black/60 p-4 text-sm text-white/72">
          Resident portal access is not enabled. Please sign in with a staff account to use Goldenhub RealtyOS.
          <Link href={appPath("/admin/login")} className="button-primary mt-4 w-full justify-center">
            Staff Sign In
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="goldenhub-sidebar glass-panel sticky top-0 hidden h-full max-h-[calc(100dvh-2rem)] w-72 shrink-0 overflow-y-auto p-4 lg:block">
      <div className="goldenhub-sidebar-hero rounded-[28px] p-4 text-white">
        <div className="flex items-center gap-3">
          <BrandMark src={logoPath} className="h-12 w-12 rounded-2xl" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">{brand}</p>
            <p className="mt-1 text-xs text-white/70">Goldenhub RealtyOS</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-amber-200/20 bg-white/8 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/65">
          Role: {role}
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
                style={active && primaryColor ? { backgroundColor: primaryColor } : undefined}
                className={cn(
                  "goldenhub-nav-item flex items-center gap-3 rounded-2xl px-4 py-4 text-sm font-semibold shadow-sm",
                  active ? "is-active text-white" : "text-slate-700 hover:bg-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.href === "/app" ? overviewLabel : item.label}
              </Link>
            );
          }

          const opened = openGroupId === item.id;
          const groupActive = item.children.some((child) => isActive(pathname, child.href));

          return (
            <div key={item.id} className="goldenhub-nav-group rounded-2xl p-2 shadow-sm">
              <button
                type="button"
                onClick={() => setOpenGroupId((current) => (current === item.id ? null : item.id))}
                style={groupActive && primaryColor ? { backgroundColor: primaryColor } : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
                  groupActive ? "is-active text-white" : "text-slate-700 hover:bg-white",
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
                          "goldenhub-nav-child block rounded-lg px-3 py-2 text-sm",
                          active ? "is-active font-semibold text-slate-950" : "text-slate-600 hover:bg-white",
                        )}
                      >
                        {child.href === "/app/analytics" ? reportsLabel : child.label}
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
