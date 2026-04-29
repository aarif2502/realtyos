import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";
import { ChangePasswordPanel } from "@/components/ChangePasswordPanel";

const roles = [
  { role: "Admin", access: "Full operational access, setup, users, properties, tenants, contracts, payments, documents, and reports." },
  { role: "Manager", access: "Operational oversight across residents, support notes, incidents, reporting, and documents." },
  { role: "Support worker", access: "Tenants, weekly support notes, incidents, and permitted documents." },
  { role: "Housing officer", access: "Properties, tenants, room status, incidents, documents, and contracts." },
  { role: "Finance", access: "Contracts, rent ledger, housing benefit receipts, arrears, and finance reports." },
  { role: "Read only", access: "Read-only access to assigned operational records." },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Settings" subtitle="Supported-housing configuration is managed through the setup panel and PostgreSQL-backed modules.">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold text-slate-900">Users & Roles</p><p className="mt-1 text-slate-600">Create staff logins in Setup Panel.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold text-slate-900">Currency & Rent</p><p className="mt-1 text-slate-600">Edit currency, property room rates, and ledger entries from the database-backed forms.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold text-slate-900">Shared File Server</p><p className="mt-1 text-slate-600">Set the document storage root in Setup Panel, then upload files through Documents.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold text-slate-900">Owner Assignments</p><p className="mt-1 text-slate-600">Create landlords and assign properties in Owners / Landlords.</p></article>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/app/setup" className="button-primary">Open Setup Panel</Link>
          <Link href="/app/documents" className="button-secondary">Open Documents</Link>
        </div>
      </SectionCard>

      <SectionCard title="Role Access Matrix" subtitle="Current supported-housing staff role model">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="pb-3">Role</th><th className="pb-3">Access Scope</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((row) => (
                <tr key={row.role}>
                  <td className="py-4 font-medium text-slate-900">{row.role}</td>
                  <td className="py-4 text-slate-700">{row.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Change Password" subtitle="Every logged-in user can update their own password after verifying the current one.">
        <ChangePasswordPanel />
      </SectionCard>
    </div>
  );
}
