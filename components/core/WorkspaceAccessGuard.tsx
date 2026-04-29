"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole, type AppRole } from "@/hooks/useRole";
import { appPath } from "@/lib/platform-config";

const routeAccess: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/app", roles: ["admin", "agent", "accountant", "owner"] },
  { prefix: "/app/properties", roles: ["admin", "agent", "owner"] },
  { prefix: "/app/tenants", roles: ["admin", "agent"] },
  { prefix: "/app/support-notes", roles: ["admin", "agent"] },
  { prefix: "/app/maintenance", roles: ["admin", "agent"] },
  { prefix: "/app/analytics", roles: ["admin", "agent", "accountant", "owner"] },
  { prefix: "/app/documents", roles: ["admin", "agent", "accountant", "owner"] },
  { prefix: "/app/profile", roles: ["admin", "agent", "accountant", "owner"] },
  { prefix: "/app/settings", roles: ["admin"] },
  { prefix: "/app/setup", roles: ["admin"] },
  { prefix: "/app/agent-performance", roles: ["admin", "agent"] },
  { prefix: "/app/documents/automation", roles: ["admin", "agent"] },
  { prefix: "/app/owners", roles: ["admin", "owner"] },
  { prefix: "/app/portfolio", roles: ["admin", "owner"] },
  { prefix: "/app/vacancy-intelligence", roles: ["admin", "owner"] },
  { prefix: "/app/payments", roles: ["admin", "agent", "accountant"] },
  { prefix: "/app/contracts", roles: ["admin", "agent", "accountant", "owner"] },
];

function isRouteAllowed(pathname: string, role: AppRole) {
  if (role === "tenant") {
    return false;
  }

  const matched = routeAccess
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));

  if (!matched) {
    return !pathname.startsWith("/app");
  }

  return matched.roles.includes(role);
}

export function WorkspaceAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useRole();

  if (isRouteAllowed(pathname, role)) {
    return <>{children}</>;
  }

  const portalHref = appPath("/admin/login");
  const portalLabel = "Staff Sign In";

  return (
    <section className="glass-panel rounded-3xl p-8 text-center">
      <h2 className="text-2xl font-semibold text-slate-900">This module is not available for the {role} role</h2>
      <p className="mt-2 text-sm theme-muted">Role-based access is active. Switch role or use the dedicated portal for relevant actions.</p>
      <Link href={portalHref} className="button-primary mt-6 inline-flex">
        {portalLabel}
      </Link>
    </section>
  );
}
