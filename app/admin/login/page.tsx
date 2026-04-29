"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <main className="app-shell flex min-h-screen items-center py-10">
      <section className="glass-panel mx-auto w-full max-w-lg rounded-[34px] p-8">
        <div className="flex items-center gap-3">
          <BrandMark className="h-12 w-12 rounded-2xl" />
          <div>
            <p className="text-xs uppercase tracking-[0.16em] theme-muted">{genericPlatformDefaults.companyName} Secure Access</p>
            <p className="text-sm font-semibold text-slate-900">Staff ERP Login</p>
          </div>
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-slate-950">Admin sign in</h1>
        <p className="mt-2 text-sm theme-muted">Sign in with your staff account to access the supported housing ERP.</p>

        <form onSubmit={signIn} className="mt-6 space-y-3">
          <input name="email" type="email" className="ui-input" placeholder="Admin email" required />
          <input name="password" type="password" className="ui-input" placeholder="Password" required />
          {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
          <button className="button-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : `Sign in to ${genericPlatformDefaults.productName}`}
          </button>
        </form>

        <p className="mt-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-center text-xs theme-muted">
          First-time agency setup is restricted to the owner admin account after sign-in.
        </p>

        <Link href="/" className="button-secondary mt-3 w-full justify-center">
          Return to public website
        </Link>
      </section>
    </main>
  );
}
