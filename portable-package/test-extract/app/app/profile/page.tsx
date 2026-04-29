import { SectionCard } from "@/components/SectionCard";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <SectionCard title="My Profile" subtitle="Personal account and workspace preferences">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="theme-surface-soft rounded-2xl p-4 text-sm">
            <p className="font-semibold text-slate-900">Account</p>
            <p className="mt-1 theme-muted">Update profile details, email, and display preferences.</p>
          </article>
          <article className="theme-surface-soft rounded-2xl p-4 text-sm">
            <p className="font-semibold text-slate-900">Security</p>
            <p className="mt-1 theme-muted">Password, sessions, and verification controls.</p>
          </article>
          <article className="theme-surface-soft rounded-2xl p-4 text-sm">
            <p className="font-semibold text-slate-900">Notifications</p>
            <p className="mt-1 theme-muted">Channel and alert preferences for your role.</p>
          </article>
          <article className="theme-surface-soft rounded-2xl p-4 text-sm">
            <p className="font-semibold text-slate-900">Role Context</p>
            <p className="mt-1 theme-muted">View your current role and access behavior.</p>
          </article>
        </div>
      </SectionCard>
    </div>
  );
}
