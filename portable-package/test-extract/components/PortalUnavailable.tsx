import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

type PortalUnavailableProps = {
  portal: "Owner" | "Tenant";
  description: string;
};

export function PortalUnavailable({ portal, description }: PortalUnavailableProps) {
  return (
    <main className="app-shell flex min-h-screen items-center py-10">
      <section className="glass-panel mx-auto w-full max-w-lg rounded-[30px] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <LockKeyhole className="h-7 w-7 text-slate-700" />
        </div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <BrandMark className="h-10 w-10 rounded-xl" />
          <div className="text-left">
            <p className="text-xs uppercase tracking-[0.16em] theme-muted">UK Support Housing</p>
            <p className="text-sm font-semibold text-slate-900">{portal} Portal</p>
          </div>
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">{portal} portal is not enabled</h1>
        <p className="mt-2 text-sm leading-6 theme-muted">{description}</p>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          This area will remain locked until the portal module has real accounts, authentication, and data permissions.
        </p>
        <Link href="/" className="button-secondary mt-5 w-full justify-center">
          Return to UK Support Housing
        </Link>
      </section>
    </main>
  );
}
