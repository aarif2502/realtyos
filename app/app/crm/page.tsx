"use client";

import { FormEvent, type ComponentType, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  Handshake,
  Mail,
  MessageSquarePlus,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Partner = {
  id: string;
  type: string;
  organisation_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};
type Referral = {
  id: string;
  partner_id?: string;
  tenant_id?: string;
  applicant_name: string;
  source?: string;
  status: string;
  priority: string;
  support_needs?: string;
  notes?: string;
  target_move_in?: string;
  created_at?: string;
  updated_at?: string;
};
type Communication = {
  id: string;
  partner_id?: string;
  referral_id?: string;
  tenant_id?: string;
  staff_id?: string;
  channel: string;
  subject: string;
  notes?: string;
  follow_up_date?: string;
  created_at?: string;
};
type Task = {
  id: string;
  tenant_id?: string;
  property_id?: string;
  assigned_to?: string;
  type: string;
  title: string;
  due_date?: string;
  status: string;
  created_at?: string;
};
type StaffUser = { id: string; full_name: string; email: string; role: string; active: boolean };
type Snapshot = {
  crmPartners?: Partner[];
  referrals?: Referral[];
  communicationLogs?: Communication[];
  automationTasks?: Task[];
  staff?: StaffUser[];
};
type ViewKey = "overview" | "pipeline" | "contacts" | "activities" | "tasks";
type FormKey = "partner" | "referral" | "activity" | "task";
type EditState =
  | { kind: "partner"; id: string; record: Partner }
  | { kind: "referral"; id: string; record: Referral }
  | { kind: "activity"; id: string; record: Communication }
  | { kind: "task"; id: string; record: Task }
  | null;

const stages = [
  { id: "new", label: "New", helper: "Captured enquiry", color: "bg-sky-50 text-sky-700" },
  { id: "screening", label: "Screening", helper: "Eligibility and risk review", color: "bg-indigo-50 text-indigo-700" },
  { id: "approved", label: "Approved", helper: "Ready for placement", color: "bg-emerald-50 text-emerald-700" },
  { id: "waitlist", label: "Waitlist", helper: "Waiting for room match", color: "bg-amber-50 text-amber-700" },
  { id: "converted", label: "Converted", helper: "Moved into PMS", color: "bg-slate-100 text-slate-700" },
  { id: "rejected", label: "Rejected", helper: "Not accepted", color: "bg-rose-50 text-rose-700" },
] as const;

const partnerTypes: Record<string, string> = {
  local_council: "Local council",
  referrer: "Referrer",
  support_provider: "Support provider",
  charity: "Charity",
  health_partner: "Health partner",
  other: "Other",
};

const channelLabels: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  meeting: "Meeting",
  letter: "Letter",
  portal: "Portal",
  other: "Other",
};

const taskTypes: Record<string, string> = {
  referral_follow_up: "Referral follow-up",
  support_visit: "Support visit",
  compliance_check: "Compliance check",
  inspection: "Inspection",
  rent_arrears: "Rent arrears",
  general: "General",
};

const collections = {
  partner: "crmPartners",
  referral: "referrals",
  activity: "communicationLogs",
  task: "automationTasks",
} as const;

function clean(values: Record<string, FormDataEntryValue>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
}

async function saveRecord(kind: FormKey, form: HTMLFormElement, edit: EditState) {
  const collection = collections[kind];
  const currentEdit = edit?.kind === kind ? edit : null;
  const response = await fetch(`/api/erp/${collection}${currentEdit ? `?id=${encodeURIComponent(currentEdit.id)}` : ""}`, {
    method: currentEdit ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clean(Object.fromEntries(new FormData(form).entries()))),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to save CRM record.");
}

async function patchRecord(collection: string, id: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/erp/${collection}?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to update CRM record.");
}

async function deleteRecord(collection: string, id: string) {
  const response = await fetch(`/api/erp/${collection}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to delete CRM record.");
}

function partnerName(partners: Partner[], id?: string) {
  return partners.find((partner) => partner.id === id)?.organisation_name || "Unlinked source";
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return value.slice(0, 10);
}

function isOverdue(date: string | undefined, todayMs: number) {
  return Boolean(date && new Date(date).getTime() < todayMs);
}

function stageLabel(status: string) {
  return stages.find((stage) => stage.id === status)?.label ?? status;
}

export default function CrmPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [activeForm, setActiveForm] = useState<FormKey>("referral");
  const [edit, setEdit] = useState<EditState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayMs] = useState(() => Date.now());

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to load CRM data.");
    setSnapshot(await response.json());
  }

  useEffect(() => {
    refresh()
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load CRM data."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(kind: FormKey, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveRecord(kind, event.currentTarget, edit);
      event.currentTarget.reset();
      setEdit(null);
      setMessage(edit?.kind === kind ? "CRM record updated." : "CRM record created.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save CRM record.");
    } finally {
      setSaving(false);
    }
  }

  async function updateReferralStatus(referral: Referral, status: string) {
    setError(null);
    setMessage(null);
    try {
      await patchRecord("referrals", referral.id, {
        partnerId: referral.partner_id || "",
        applicantName: referral.applicant_name,
        source: referral.source || "",
        status,
        priority: referral.priority,
        supportNeeds: referral.support_needs || "",
        notes: referral.notes || "",
        targetMoveIn: formatDate(referral.target_move_in) === "Not set" ? "" : formatDate(referral.target_move_in),
      });
      setMessage("Pipeline stage updated.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update referral.");
    }
  }

  async function remove(kind: FormKey, id: string, label: string) {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteRecord(collections[kind], id);
      if (edit?.id === id) setEdit(null);
      setMessage("CRM record deleted.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete CRM record.");
    }
  }

  const partners = useMemo(() => snapshot.crmPartners ?? [], [snapshot.crmPartners]);
  const communications = useMemo(() => snapshot.communicationLogs ?? [], [snapshot.communicationLogs]);
  const allTasks = useMemo(() => snapshot.automationTasks ?? [], [snapshot.automationTasks]);
  const referralTasks = allTasks.filter((task) => task.type === "referral_follow_up" || task.type === "general");

  const referrals = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (snapshot.referrals ?? [])
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => partnerFilter === "all" || item.partner_id === partnerFilter)
      .filter((item) => {
        if (!q) return true;
        return `${item.applicant_name} ${item.status} ${item.priority} ${item.support_needs ?? ""} ${item.source ?? ""} ${partnerName(partners, item.partner_id)}`.toLowerCase().includes(q);
      });
  }, [partnerFilter, partners, query, snapshot.referrals, statusFilter]);

  const filteredPartners = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return partners;
    return partners.filter((partner) => `${partner.organisation_name} ${partner.contact_name ?? ""} ${partner.email ?? ""} ${partner.type}`.toLowerCase().includes(q));
  }, [partners, query]);

  const filteredCommunications = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return communications;
    return communications.filter((log) => `${log.subject} ${log.channel} ${log.notes ?? ""} ${partnerName(partners, log.partner_id)}`.toLowerCase().includes(q));
  }, [communications, partners, query]);

  const openReferrals = (snapshot.referrals ?? []).filter((referral) => !["rejected", "converted"].includes(referral.status));
  const urgentReferrals = (snapshot.referrals ?? []).filter((referral) => referral.priority === "urgent" && !["rejected", "converted"].includes(referral.status));
  const approvedReferrals = (snapshot.referrals ?? []).filter((referral) => referral.status === "approved" || referral.status === "waitlist");
  const followUps = communications.filter((log) => log.follow_up_date);
  const overdueFollowUps = followUps.filter((log) => isOverdue(log.follow_up_date, todayMs));
  const overdueTasks = referralTasks.filter((task) => task.status !== "done" && isOverdue(task.due_date, todayMs));
  const conversionRate = (snapshot.referrals?.length ?? 0) ? Math.round(((snapshot.referrals ?? []).filter((referral) => referral.status === "converted").length / (snapshot.referrals?.length ?? 1)) * 100) : 0;

  const editRecord = (next: EditState, form: FormKey) => {
    setEdit(next);
    setActiveForm(form);
    setActiveView("overview");
    window.setTimeout(() => document.getElementById("crm-record-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="space-y-6">
      {message ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 p-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              <Sparkles className="h-3.5 w-3.5" /> CRM Workspace
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-950">Relationship pipeline and partner intelligence</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Manage councils, referrers, support partners, applicants, activities and follow-ups from one live CRM dashboard. Every card below is powered by the database.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setActiveForm("referral"); setEdit(null); }} className="button-primary gap-2"><UserPlus className="h-4 w-4" /> Add Lead</button>
              <button type="button" onClick={() => { setActiveForm("partner"); setEdit(null); }} className="button-secondary gap-2"><Handshake className="h-4 w-4" /> Add Contact</button>
              <button type="button" onClick={() => { setActiveForm("activity"); setEdit(null); }} className="button-secondary gap-2"><MessageSquarePlus className="h-4 w-4" /> Log Activity</button>
              <button type="button" onClick={() => { setActiveForm("task"); setEdit(null); }} className="button-secondary gap-2"><CalendarClock className="h-4 w-4" /> Add Task</button>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">CRM health</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniMetric label="Conversion" value={`${conversionRate}%`} />
              <MiniMetric label="Overdue" value={String(overdueFollowUps.length + overdueTasks.length)} tone="rose" />
              <MiniMetric label="Placement ready" value={String(approvedReferrals.length)} tone="emerald" />
              <MiniMetric label="Open pipeline" value={String(openReferrals.length)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Contacts & accounts" value={partners.length} icon={Handshake} />
        <Metric label="Open leads" value={openReferrals.length} icon={Target} />
        <Metric label="Urgent leads" value={urgentReferrals.length} icon={AlertCircle} tone="rose" />
        <Metric label="Ready for placement" value={approvedReferrals.length} icon={CheckCircle2} tone="emerald" />
        <Metric label="Follow-ups due" value={followUps.length + referralTasks.filter((task) => task.status !== "done").length} icon={CalendarClock} tone="amber" />
        <Metric label="Activity logs" value={communications.length} icon={Activity} />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_220px_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <span className="sr-only">Search CRM records</span>
            <input className="ui-input pl-11" placeholder="Search applicant, organisation, email, activity, support need or source" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <span className="sr-only">Filter by pipeline stage</span>
            <select className="ui-input pl-11" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All stages</option>
              {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
          </label>
          <label className="relative block">
            <Building2 className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <span className="sr-only">Filter by partner</span>
            <select className="ui-input pl-11" value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)}>
              <option value="all">All partners</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.organisation_name}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="CRM views">
        {[
          ["overview", "Command Centre"],
          ["pipeline", "Pipeline Board"],
          ["contacts", "Contacts & Accounts"],
          ["activities", "Activity History"],
          ["tasks", "Tasks & Follow-ups"],
        ].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={activeView === id} onClick={() => setActiveView(id as ViewKey)} className={activeView === id ? "button-primary" : "button-secondary"}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <LoadingState /> : null}

      {!loading && activeView === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Live Pipeline Story" subtitle="A simple narrative of what needs attention today.">
            {openReferrals.length || partners.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Pipeline shape</p>
                  <div className="mt-4 space-y-3">
                    {stages.map((stage) => {
                      const count = (snapshot.referrals ?? []).filter((referral) => referral.status === stage.id).length;
                      const width = Math.max(6, Math.min(100, Math.round((count / Math.max(1, snapshot.referrals?.length ?? 0)) * 100)));
                      return (
                        <div key={stage.id}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                            <span>{stage.label}</span>
                            <span>{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div className="h-2 rounded-full bg-slate-950" style={{ width: `${count ? width : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Next best actions</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <ActionHint icon={AlertCircle} title="Urgent leads" detail={`${urgentReferrals.length} urgent lead(s) need priority handling.`} tone="rose" />
                    <ActionHint icon={CalendarClock} title="Follow-ups" detail={`${overdueFollowUps.length + overdueTasks.length} overdue follow-up(s) should be cleared.`} tone="amber" />
                    <ActionHint icon={ShieldCheck} title="Ready for PMS" detail={`${approvedReferrals.length} applicant(s) are ready for placement or waitlist review.`} tone="emerald" />
                  </div>
                </div>
              </div>
            ) : <EmptyState title="Your CRM is ready" body="Start by adding a council, referrer, charity, social worker or support partner. Then create your first lead/referral." action="Add your first contact" onAction={() => setActiveForm("partner")} />}
          </SectionCard>

          <section id="crm-record-form">
            <SectionCard title={edit ? "Edit CRM Record" : "Quick Create"} subtitle="Create and maintain CRM data with database-backed forms.">
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  ["referral", "Lead"],
                  ["partner", "Contact"],
                  ["activity", "Activity"],
                  ["task", "Task"],
                ].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => { setActiveForm(id as FormKey); setEdit(null); }} className={activeForm === id ? "button-primary" : "button-secondary"}>
                    {label}
                  </button>
                ))}
              </div>
              {activeForm === "partner" ? <PartnerForm edit={edit?.kind === "partner" ? edit.record : null} saving={saving} onSubmit={(event) => submit("partner", event)} onCancel={() => setEdit(null)} /> : null}
              {activeForm === "referral" ? <ReferralForm partners={partners} edit={edit?.kind === "referral" ? edit.record : null} saving={saving} onSubmit={(event) => submit("referral", event)} onCancel={() => setEdit(null)} /> : null}
              {activeForm === "activity" ? <ActivityForm partners={partners} referrals={snapshot.referrals ?? []} edit={edit?.kind === "activity" ? edit.record : null} saving={saving} onSubmit={(event) => submit("activity", event)} onCancel={() => setEdit(null)} /> : null}
              {activeForm === "task" ? <TaskForm staff={snapshot.staff ?? []} edit={edit?.kind === "task" ? edit.record : null} saving={saving} onSubmit={(event) => submit("task", event)} onCancel={() => setEdit(null)} /> : null}
            </SectionCard>
          </section>
        </div>
      ) : null}

      {!loading && activeView === "pipeline" ? (
        <SectionCard title="Pipeline Board" subtitle="Move leads through the supported-housing onboarding journey.">
          <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
            {stages.map((stage) => {
              const rows = referrals.filter((referral) => referral.status === stage.id);
              return (
                <section key={stage.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-slate-900">{stage.label}</h2>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">{rows.length}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{stage.helper}</p>
                  </div>
                  <div className="space-y-3">
                    {rows.length ? rows.map((referral) => (
                      <ReferralCard key={referral.id} referral={referral} partners={partners} onStageChange={updateReferralStatus} onEdit={() => editRecord({ kind: "referral", id: referral.id, record: referral }, "referral")} onDelete={() => remove("referral", referral.id, referral.applicant_name)} />
                    )) : <p className="rounded-xl bg-white p-3 text-xs text-slate-500">No leads in this stage.</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      {!loading && activeView === "contacts" ? (
        <SectionCard title="Contacts, Accounts and Partners" subtitle="Local councils, referrers, charities, social workers, health partners and support providers.">
          {filteredPartners.length ? (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredPartners.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} referralCount={(snapshot.referrals ?? []).filter((referral) => referral.partner_id === partner.id).length} activityCount={communications.filter((log) => log.partner_id === partner.id).length} onEdit={() => editRecord({ kind: "partner", id: partner.id, record: partner }, "partner")} onDelete={() => remove("partner", partner.id, partner.organisation_name)} />
              ))}
            </div>
          ) : <EmptyState title="No contacts match your filters" body="Clear the search or add a new council, referrer, charity or support partner." action="Add contact" onAction={() => setActiveForm("partner")} />}
        </SectionCard>
      ) : null}

      {!loading && activeView === "activities" ? (
        <SectionCard title="Communication History" subtitle="Calls, emails, meetings, letters and portal notes for continuity and audit.">
          {filteredCommunications.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredCommunications.map((log) => (
                <ActivityCard key={log.id} log={log} partners={partners} onEdit={() => editRecord({ kind: "activity", id: log.id, record: log }, "activity")} onDelete={() => remove("activity", log.id, log.subject)} />
              ))}
            </div>
          ) : <EmptyState title="No activity history yet" body="Log a call, email, meeting or letter so staff can see the full relationship story." action="Log activity" onAction={() => setActiveForm("activity")} />}
        </SectionCard>
      ) : null}

      {!loading && activeView === "tasks" ? (
        <SectionCard title="Tasks and Follow-ups" subtitle="Referral follow-ups and CRM reminders that need staff action.">
          {referralTasks.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {referralTasks.map((task) => (
                <TaskCard key={task.id} task={task} staff={snapshot.staff ?? []} overdue={isOverdue(task.due_date, todayMs) && task.status !== "done"} onEdit={() => editRecord({ kind: "task", id: task.id, record: task }, "task")} onDelete={() => remove("task", task.id, task.title)} onStatus={(status) => patchRecord("automationTasks", task.id, { ...taskToInput(task), status }).then(refresh).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to update task."))} />
              ))}
            </div>
          ) : <EmptyState title="No CRM tasks yet" body="Create follow-ups for calls, screenings, placement decisions and partner check-ins." action="Add task" onAction={() => setActiveForm("task")} />}
        </SectionCard>
      ) : null}
    </div>
  );
}

function taskToInput(task: Task) {
  return {
    tenantId: task.tenant_id || "",
    propertyId: task.property_id || "",
    assignedTo: task.assigned_to || "",
    type: task.type || "referral_follow_up",
    title: task.title,
    dueDate: formatDate(task.due_date) === "Not set" ? "" : formatDate(task.due_date),
    status: task.status,
  };
}

function Metric({ label, value, icon: Icon, tone = "slate" }: { label: string; value: number; icon: ComponentType<{ className?: string }>; tone?: "slate" | "rose" | "emerald" | "amber" }) {
  const toneClass = tone === "rose" ? "text-rose-600" : tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-slate-500";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function MiniMetric({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "rose" | "emerald" }) {
  const color = tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : "text-slate-950";
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function ActionHint({ icon: Icon, title, detail, tone }: { icon: ComponentType<{ className?: string }>; title: string; detail: string; tone: "rose" | "amber" | "emerald" }) {
  const color = tone === "rose" ? "bg-rose-50 text-rose-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <span className={`rounded-xl p-2 ${color}`}><Icon className="h-4 w-4" /></span>
      <span>
        <span className="block font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-slate-600">{detail}</span>
      </span>
    </div>
  );
}

function EmptyState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm"><Plus className="h-5 w-5" /></div>
      <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{body}</p>
      <button type="button" onClick={onAction} className="button-primary mt-5">{action}</button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />)}
    </div>
  );
}

function ReferralCard({ referral, partners, onStageChange, onEdit, onDelete }: { referral: Referral; partners: Partner[]; onStageChange: (referral: Referral, status: string) => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-950">{referral.applicant_name}</p>
          <p className="mt-1 text-xs text-slate-500">{partnerName(partners, referral.partner_id)}</p>
        </div>
        <RecordActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${referral.priority === "urgent" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{referral.priority}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">move-in {formatDate(referral.target_move_in)}</span>
      </div>
      <p className="mt-3 text-slate-600">{referral.support_needs || "No support needs recorded."}</p>
      <select className="ui-input mt-3 h-10 text-xs" value={referral.status} onChange={(event) => onStageChange(referral, event.target.value)} aria-label={`Move ${referral.applicant_name} to stage`}>
        {stages.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </article>
  );
}

function PartnerCard({ partner, referralCount, activityCount, onEdit, onDelete }: { partner: Partner; referralCount: number; activityCount: number; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{partner.organisation_name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">{partnerTypes[partner.type] || partner.type}</p>
        </div>
        <RecordActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-4 space-y-2 text-slate-600">
        <p className="flex items-center gap-2"><UsersRound className="h-4 w-4" /> {partner.contact_name || "No named contact"}</p>
        <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {partner.email || "No email"}</p>
        <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {partner.phone || "No phone"}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{referralCount} lead(s)</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{activityCount} activity item(s)</span>
      </div>
      {partner.notes ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-slate-600">{partner.notes}</p> : null}
    </article>
  );
}

function ActivityCard({ log, partners, onEdit, onDelete }: { log: Communication; partners: Partner[]; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{log.subject}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">{channelLabels[log.channel] || log.channel} - {partnerName(partners, log.partner_id)}</p>
        </div>
        <RecordActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <p className="mt-3 text-slate-600">{log.notes || "No notes recorded."}</p>
      {log.follow_up_date ? <p className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Follow up {formatDate(log.follow_up_date)}</p> : null}
    </article>
  );
}

function TaskCard({ task, staff, overdue, onEdit, onDelete, onStatus }: { task: Task; staff: StaffUser[]; overdue: boolean; onEdit: () => void; onDelete: () => void; onStatus: (status: string) => void }) {
  const assignee = staff.find((item) => item.id === task.assigned_to)?.full_name || "Unassigned";
  return (
    <article className={`rounded-2xl border p-4 text-sm shadow-sm ${overdue ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{task.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">{taskTypes[task.type] || task.type} - {assignee}</p>
        </div>
        <RecordActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <span className="rounded-xl bg-white px-3 py-2">Due {formatDate(task.due_date)}</span>
        <span className="rounded-xl bg-white px-3 py-2 capitalize">{task.status.replace(/_/g, " ")}</span>
        <select className="ui-input h-10 bg-white text-xs" value={task.status} onChange={(event) => onStatus(event.target.value)} aria-label={`Update task status for ${task.title}`}>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </article>
  );
}

function RecordActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-1">
      <button type="button" onClick={onEdit} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label="Edit record"><Edit3 className="h-4 w-4" /></button>
      <button type="button" onClick={onDelete} className="rounded-full p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete record"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

function PartnerForm({ edit, saving, onSubmit, onCancel }: { edit: Partner | null; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <select name="type" className="ui-input" defaultValue={edit?.type || "referrer"}>
        {Object.entries(partnerTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <input name="organisationName" className="ui-input" placeholder="Organisation / account name" defaultValue={edit?.organisation_name || ""} required />
      <input name="contactName" className="ui-input" placeholder="Main contact person" defaultValue={edit?.contact_name || ""} />
      <input name="email" type="email" className="ui-input" placeholder="Email" defaultValue={edit?.email || ""} />
      <input name="phone" className="ui-input" placeholder="Phone" defaultValue={edit?.phone || ""} />
      <textarea name="notes" className="ui-input min-h-24" placeholder="Relationship notes, contract detail, service area" defaultValue={edit?.notes || ""} />
      <FormButtons saving={saving} edit={Boolean(edit)} onCancel={onCancel} icon={Handshake} label="Save Contact" />
    </form>
  );
}

function ReferralForm({ partners, edit, saving, onSubmit, onCancel }: { partners: Partner[]; edit: Referral | null; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <select name="partnerId" className="ui-input" defaultValue={edit?.partner_id || ""}><option value="">Referral source / partner</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.organisation_name}</option>)}</select>
      <input name="applicantName" className="ui-input" placeholder="Applicant / lead name" defaultValue={edit?.applicant_name || ""} required />
      <input name="source" className="ui-input" placeholder="Source detail, e.g. council team / social worker" defaultValue={edit?.source || ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="status" className="ui-input" defaultValue={edit?.status || "new"}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select>
        <select name="priority" className="ui-input" defaultValue={edit?.priority || "normal"}><option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select>
      </div>
      <input name="targetMoveIn" type="date" className="ui-input" defaultValue={formatDate(edit?.target_move_in) === "Not set" ? "" : formatDate(edit?.target_move_in)} />
      <textarea name="supportNeeds" className="ui-input min-h-24" placeholder="Support needs, risks, eligibility and accommodation requirements" defaultValue={edit?.support_needs || ""} />
      <textarea name="notes" className="ui-input min-h-20" placeholder="Internal onboarding notes" defaultValue={edit?.notes || ""} />
      <FormButtons saving={saving} edit={Boolean(edit)} onCancel={onCancel} icon={UserPlus} label="Save Lead" />
    </form>
  );
}

function ActivityForm({ partners, referrals, edit, saving, onSubmit, onCancel }: { partners: Partner[]; referrals: Referral[]; edit: Communication | null; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <select name="partnerId" className="ui-input" defaultValue={edit?.partner_id || ""}><option value="">Partner / account</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.organisation_name}</option>)}</select>
      <select name="referralId" className="ui-input" defaultValue={edit?.referral_id || ""}><option value="">Lead / referral</option>{referrals.map((r) => <option key={r.id} value={r.id}>{r.applicant_name} - {stageLabel(r.status)}</option>)}</select>
      <select name="channel" className="ui-input" defaultValue={edit?.channel || "email"}>{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input name="subject" className="ui-input" placeholder="Subject" defaultValue={edit?.subject || ""} required />
      <input name="followUpDate" type="date" className="ui-input" defaultValue={formatDate(edit?.follow_up_date) === "Not set" ? "" : formatDate(edit?.follow_up_date)} />
      <textarea name="notes" className="ui-input min-h-24" placeholder="Conversation notes and next actions" defaultValue={edit?.notes || ""} />
      <FormButtons saving={saving} edit={Boolean(edit)} onCancel={onCancel} icon={MessageSquarePlus} label="Save Activity" />
    </form>
  );
}

function TaskForm({ staff, edit, saving, onSubmit, onCancel }: { staff: StaffUser[]; edit: Task | null; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input name="title" className="ui-input" placeholder="Task title" defaultValue={edit?.title || ""} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="type" className="ui-input" defaultValue={edit?.type || "referral_follow_up"}>{Object.entries(taskTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select name="status" className="ui-input" defaultValue={edit?.status || "open"}><option value="open">Open</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="dueDate" type="date" className="ui-input" defaultValue={formatDate(edit?.due_date) === "Not set" ? "" : formatDate(edit?.due_date)} />
        <select name="assignedTo" className="ui-input" defaultValue={edit?.assigned_to || ""}><option value="">Assign to staff</option>{staff.filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}</select>
      </div>
      <FormButtons saving={saving} edit={Boolean(edit)} onCancel={onCancel} icon={CalendarClock} label="Save Task" />
    </form>
  );
}

function FormButtons({ saving, edit, onCancel, icon: Icon, label }: { saving: boolean; edit: boolean; onCancel: () => void; icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button className="button-primary gap-2" disabled={saving}><Icon className="h-4 w-4" /> {saving ? "Saving..." : label}</button>
      {edit ? <button type="button" className="button-secondary" onClick={onCancel}>Cancel edit</button> : null}
    </div>
  );
}
