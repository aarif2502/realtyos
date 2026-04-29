"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Handshake, MessageSquarePlus, UserPlus } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  crmPartners?: Array<{ id: string; type: string; organisation_name: string; contact_name?: string; email?: string; phone?: string }>;
  referrals?: Array<{ id: string; partner_id?: string; applicant_name: string; status: string; priority: string; support_needs?: string; target_move_in?: string }>;
  communicationLogs?: Array<{ id: string; partner_id?: string; referral_id?: string; channel: string; subject: string; notes?: string; follow_up_date?: string }>;
};

async function post(collection: string, form: HTMLFormElement) {
  const response = await fetch(`/api/erp/${collection}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to save.");
}

export default function CrmPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(collection: string, event: FormEvent<HTMLFormElement>, success: string) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await post(collection, event.currentTarget);
      event.currentTarget.reset();
      setMessage(success);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save.");
    }
  }

  const referrals = useMemo(() => (snapshot.referrals ?? []).filter((item) => `${item.applicant_name} ${item.status} ${item.support_needs ?? ""}`.toLowerCase().includes(filter.toLowerCase())), [filter, snapshot.referrals]);

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="Partners" value={snapshot.crmPartners?.length ?? 0} />
        <Metric label="Open Referrals" value={(snapshot.referrals ?? []).filter((r) => !["rejected", "converted"].includes(r.status)).length} />
        <Metric label="Follow-ups" value={(snapshot.communicationLogs ?? []).filter((log) => log.follow_up_date).length} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Add Partner" subtitle="Councils, referrers, charities and support providers">
          <form onSubmit={(event) => submit("crmPartners", event, "Partner saved.")} className="grid gap-3">
            <select name="type" className="ui-input" defaultValue="referrer">
              <option value="local_council">Local council</option><option value="referrer">Referrer</option><option value="support_provider">Support provider</option><option value="charity">Charity</option><option value="health_partner">Health partner</option><option value="other">Other</option>
            </select>
            <input name="organisationName" className="ui-input" placeholder="Organisation" required />
            <input name="contactName" className="ui-input" placeholder="Main contact" />
            <input name="email" type="email" className="ui-input" placeholder="Email" />
            <input name="phone" className="ui-input" placeholder="Phone" />
            <textarea name="notes" className="ui-input min-h-24" placeholder="Notes" />
            <button className="button-primary gap-2"><Handshake className="h-4 w-4" /> Save Partner</button>
          </form>
        </SectionCard>

        <SectionCard title="New Referral" subtitle="Start a referral pipeline record before tenant approval">
          <form onSubmit={(event) => submit("referrals", event, "Referral saved.")} className="grid gap-3">
            <select name="partnerId" className="ui-input"><option value="">Referral source</option>{snapshot.crmPartners?.map((p) => <option key={p.id} value={p.id}>{p.organisation_name}</option>)}</select>
            <input name="applicantName" className="ui-input" placeholder="Applicant name" required />
            <select name="status" className="ui-input" defaultValue="new"><option value="new">New</option><option value="screening">Screening</option><option value="approved">Approved</option><option value="waitlist">Waitlist</option><option value="rejected">Rejected</option><option value="converted">Converted</option></select>
            <select name="priority" className="ui-input" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select>
            <input name="targetMoveIn" type="date" className="ui-input" />
            <textarea name="supportNeeds" className="ui-input min-h-24" placeholder="Support needs and risks" />
            <button className="button-primary gap-2"><UserPlus className="h-4 w-4" /> Save Referral</button>
          </form>
        </SectionCard>

        <SectionCard title="Communication Log" subtitle="Record calls, emails, meetings and follow-ups">
          <form onSubmit={(event) => submit("communicationLogs", event, "Communication logged.")} className="grid gap-3">
            <select name="partnerId" className="ui-input"><option value="">Partner</option>{snapshot.crmPartners?.map((p) => <option key={p.id} value={p.id}>{p.organisation_name}</option>)}</select>
            <select name="referralId" className="ui-input"><option value="">Referral</option>{snapshot.referrals?.map((r) => <option key={r.id} value={r.id}>{r.applicant_name}</option>)}</select>
            <select name="channel" className="ui-input" defaultValue="email"><option value="email">Email</option><option value="phone">Phone</option><option value="meeting">Meeting</option><option value="letter">Letter</option><option value="portal">Portal</option><option value="other">Other</option></select>
            <input name="subject" className="ui-input" placeholder="Subject" required />
            <input name="followUpDate" type="date" className="ui-input" />
            <textarea name="notes" className="ui-input min-h-24" placeholder="Notes" />
            <button className="button-primary gap-2"><MessageSquarePlus className="h-4 w-4" /> Log Communication</button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Referral Pipeline" subtitle="Search and review tenant onboarding journey">
        <input className="ui-input" placeholder="Search referrals" value={filter} onChange={(event) => setFilter(event.target.value)} />
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {referrals.map((referral) => <article key={referral.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold text-slate-900">{referral.applicant_name}</p><p className="mt-1 text-slate-500">{referral.status} · {referral.priority} · target {referral.target_move_in || "not set"}</p><p className="mt-2 text-slate-700">{referral.support_needs || "No support needs recorded."}</p></article>)}
        </div>
      </SectionCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p></article>;
}
