import { genericPlatformDefaults } from "@/lib/platform-config";

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-screen items-center py-10">
      <section className="glass-panel mx-auto max-w-xl rounded-3xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{genericPlatformDefaults.productName}</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">The route you opened does not exist in this frontend flow.</p>
      </section>
    </main>
  );
}
