"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";

export function ChangePasswordPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(payload.error || "Unable to change password.");
      return;
    }

    form.reset();
    setMessage("Password updated. Other active sessions have been signed out.");
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      <input name="currentPassword" type="password" className="ui-input" placeholder="Current password" autoComplete="current-password" required />
      <input name="newPassword" type="password" className="ui-input" placeholder="New password" autoComplete="new-password" required />
      <input name="confirmPassword" type="password" className="ui-input" placeholder="Confirm new password" autoComplete="new-password" required />
      <p className="text-xs text-slate-500">Use at least 10 characters with uppercase, lowercase, number and symbol characters.</p>
      <button className="button-primary gap-2" disabled={saving}>
        <KeyRound className="h-4 w-4" /> {saving ? "Updating..." : "Change Password"}
      </button>
    </form>
  );
}
