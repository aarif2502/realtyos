import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function LoginPage() {
  return (
    <main className="app-shell flex min-h-screen items-center py-10">
      <section className="glass-panel mx-auto w-full max-w-xl rounded-[34px] p-8">
        <div className="flex items-center gap-3">
          <BrandMark className="h-12 w-12 rounded-2xl" />
          <div>
            <p className="text-xs uppercase tracking-[0.16em] theme-muted">GoldenHub Realty OS Secure Access</p>
            <p className="text-sm font-semibold text-slate-900">Choose Your Login</p>
          </div>
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-slate-950">Welcome</h1>
        <p className="mt-2 text-sm theme-muted">Select the right portal to continue.</p>

        <div className="mt-6 grid gap-3">
          <Link href="/realtyos/admin/login" className="button-primary w-full justify-center">Admin Login</Link>
        </div>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Owner and tenant portals are locked until real portal accounts and permissions are enabled.
        </p>
      </section>
    </main>
  );
}
