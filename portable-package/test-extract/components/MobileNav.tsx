"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  ["/app", "Dashboard"],
  ["/app/tenants", "PMS"],
  ["/app/crm", "CRM"],
  ["/app/compliance", "Compliance"],
  ["/app/finance", "Finance"],
  ["/app/analytics", "Reports"],
  ["/app/setup", "Admin"],
  ["/app/documents", "Documents"],
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel overflow-x-auto rounded-2xl p-2 lg:hidden">
      <div className="flex min-w-max gap-2">
        {links.map(([href, label]) => {
          const active = href === "/app" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link key={href} href={href} className={cn("rounded-full px-4 py-2 text-sm font-medium", active ? "bg-ink text-white" : "bg-white text-slate-600")}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
