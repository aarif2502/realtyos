"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { BrandMark } from "@/components/BrandMark";
import { appPath, genericPlatformDefaults } from "@/lib/platform-config";

export default function AdminLoginPage() {
  const { setRole } = useRole();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to sign in." }));
      setError(payload.error ?? "Unable to sign in.");
      setLoading(false);
      return;
    }

    const payload = await response.json();
    setRole(payload.staff?.role === "finance" ? "accountant" : payload.staff?.role === "readonly" ? "agent" : payload.staff?.role === "admin" || payload.staff?.role === "platform_admin" ? "admin" : "agent");
    router.push(appPath());
  }

  return (
    <main className="goldenhub-login app-shell flex min-h-screen items-center py-10">
      <section className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
            <Sparkles className="h-4 w-4" /> Goldenhub secure operating layer
          </div>
          <h1 className="mt-6 max-w-3xl text-6xl font-black leading-[0.95] tracking-[-0.05em] text-white">
            Command centre for supported accommodation.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
            Access residents, properties, support evidence, finance visibility and council-ready reporting from one controlled workspace.
          </p>
          <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              { icon: Building2, label: "Portfolio", text: "Properties, rooms and occupancy" },
              { icon: ShieldCheck, label: "Evidence", text: "Support notes, risk and compliance" },
              { icon: LockKeyhole, label: "Control", text: "Secure staff-only ERP access" },
            ].map((item) => (
              <article key={item.label} className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <item.icon className="h-5 w-5 text-amber-200" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-white">{item.label}</p>
                <p className="mt-2 text-xs leading-5 text-white/58">{item.text}</p>
              </article>
            ))}
          </div>
        </div>

        <section className="goldenhub-login-card glass-panel mx-auto w-full max-w-lg rounded-[34px] p-8">
          <div className="flex items-center gap-3">
            <BrandMark className="h-14 w-14 rounded-2xl" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-300/90">{genericPlatformDefaults.companyName}</p>
              <p className="text-sm font-semibold text-white/78">Secure staff ERP access</p>
            </div>
          </div>

          <h2 className="mt-8 text-4xl font-black tracking-[-0.04em] text-white">Sign in to RealtyOS</h2>
          <p className="mt-3 text-sm leading-6 text-white/62">Use your authorised Goldenhub staff account to access operational records, reporting and workflows.</p>

          <form onSubmit={signIn} className="mt-7 space-y-3">
            <input name="email" type="email" className="ui-input" placeholder="Staff email" autoComplete="email" required />
            <input name="password" type="password" className="ui-input" placeholder="Password" autoComplete="current-password" required />
            {error ? <p className="rounded-2xl border border-rose-300/40 bg-rose-950/50 p-3 text-sm text-rose-100">{error}</p> : null}
            <button className="button-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : <>Enter command centre <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-200/8 p-3 text-center text-xs leading-5 text-white/58">
            First-time agency setup is restricted to the owner admin account after sign-in.
          </p>

          <Link href="/" className="button-secondary mt-3 w-full justify-center">
            Return to public website
          </Link>
        </section>
      </section>
    </main>
  );
}
