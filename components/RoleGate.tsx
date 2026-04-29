"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useRole, type AppRole } from "@/hooks/useRole";

type RoleGateProps = {
  allow: AppRole[];
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export function RoleGate({
  allow,
  title = "Access Restricted",
  description = "Your current role does not have access to this module.",
  children,
}: RoleGateProps) {
  const { role } = useRole();

  if (allow.includes(role)) {
    return <>{children}</>;
  }

  return (
    <section className="glass-panel rounded-3xl p-8 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm theme-muted">{description}</p>
      <Link href="/app/profile" className="button-secondary mt-6">
        Open my profile
      </Link>
    </section>
  );
}

