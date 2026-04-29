"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Database, FileArchive, Globe2, Home, Lock, Pencil, RefreshCw, Save, Search, Upload, Users } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { genericPlatformDefaults, ownerAdminFallbackEmail } from "@/lib/platform-config";

const roles = ["platform_admin", "admin", "manager", "support_worker", "housing_officer", "finance", "readonly"];
const roleLabels: Record<string, string> = {
  platform_admin: "Platform admin",
  admin: "Admin",
  manager: "Manager",
  support_worker: "Support worker",
  housing_officer: "Housing officer",
  finance: "Finance",
  readonly: "Read only",
};

type ErpSnapshot = {
  databaseConfigured?: boolean;
  setupRequired?: boolean;
  agency?: Record<string, string> | null;
  websiteSettings?: Record<string, string>;
  staff?: Array<Record<string, string | boolean>>;
  landlords?: Array<Record<string, string>>;
  properties?: Array<Record<string, string | number>>;
  rooms?: Array<Record<string, string | number>>;
  tenants?: Array<Record<string, string>>;
};

type StorageEntry = {
  name: string;
  path: string;
  type: "file" | "folder";
  size: number;
  modifiedAt: string;
};

type StorageUsage = { total: number; used: number; free: number; usedPercent: number };

type AuthState = {
  checked: boolean;
  allowed: boolean;
  email?: string;
};

type EditableCollection = "staff" | "properties" | "tenants" | "rooms";
type SetupTab = "records" | "website" | "platform" | "storage" | "system" | "import";
type SetupTask = {
  key: string;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "needs_attention" | "completed" | "optional";
  progress: number;
  actionLabel: string;
  workflow: SetupTab | "review";
  href: string;
  completionCriteria: string;
  warnings: string[];
  lastUpdated?: string | null;
};
type ImportSheet = {
  name: string;
  suggestedTarget: string;
  headers: string[];
  preview: Array<Record<string, unknown>>;
  suggestedMapping: { target: string; columns: Record<string, string> };
};
type ImportState = {
  importId?: string;
  sheets: ImportSheet[];
  mapping: Record<string, { target: string; columns: Record<string, string> }>;
  validation?: { errors: Array<{ sheet: string; row: number; field: string; message: string }>; validRows: number };
  logs: Array<Record<string, unknown>>;
  targets: Record<string, { label: string; required: string[]; fields: Record<string, string[]> }>;
};
type PmsCycleState = {
  counts?: { properties: string; rooms: string; tenants: string; occupancy_records: string };
  importId?: string;
  preview: Array<Record<string, unknown>>;
  summary?: { propertyCount: number; tenantCount: number; occupancyCount: number; errorCount: number; warningCount: number };
  errors: Array<{ row: number; field: string; message: string; severity: "error" | "warning" }>;
};

async function submitJson(path: string, body: Record<string, unknown>, method = "POST") {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Unable to save." }));
    throw new Error(payload.error ?? "Unable to save.");
  }

  return response.json();
}

function valuesFromForm(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function matches(record: Record<string, unknown>, query: string) {
  if (!query) return true;
  return Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase()));
}

export default function SetupPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ErpSnapshot>({});
  const [setupTasks, setSetupTasks] = useState<SetupTask[]>([]);
  const [setupProgress, setSetupProgress] = useState(0);
  const [authState, setAuthState] = useState<AuthState>({ checked: false, allowed: false });
  const [activeTab, setActiveTab] = useState<SetupTab>("records");
  const [activeActivity, setActiveActivity] = useState<string | null>(null);
  const [collection, setCollection] = useState<EditableCollection>("staff");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageQuery, setStorageQuery] = useState("");
  const [storageRoot, setStorageRoot] = useState(genericPlatformDefaults.storageRoot);
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [storagePath, setStoragePath] = useState("");
  const [importState, setImportState] = useState<ImportState>({ sheets: [], mapping: {}, logs: [], targets: {} });
  const [importLoading, setImportLoading] = useState(false);
  const [pmsCycle, setPmsCycle] = useState<PmsCycleState>({ preview: [], errors: [] });
  const [pmsCycleLoading, setPmsCycleLoading] = useState(false);

  async function refresh() {
    const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
    const authPayload = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok || !authPayload.staff?.ownerAdmin) {
      setAuthState({ checked: true, allowed: false, email: authPayload.staff?.email });
      return;
    }

    setAuthState({ checked: true, allowed: true, email: authPayload.staff.email });
    const response = await fetch("/api/erp", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    setSnapshot({ databaseConfigured: response.status !== 503, ...payload });
    const statusResponse = await fetch("/api/setup/status", { cache: "no-store" });
    if (statusResponse.ok) {
      const statusPayload = await statusResponse.json();
      setSetupTasks(statusPayload.tasks || []);
      setSetupProgress(statusPayload.overallProgress || 0);
    }
  }

  async function refreshStorage(nextQuery = storageQuery, nextPath = storagePath) {
    const response = await fetch(`/api/storage?q=${encodeURIComponent(nextQuery)}&path=${encodeURIComponent(nextPath)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to read shared storage.");
    setStorageRoot(payload.root || genericPlatformDefaults.storageRoot);
    setStorageEntries(payload.entries || []);
    setStorageUsage(payload.usage || null);
    setStoragePath(payload.path || "");
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const activity = params.get("activity");
    const tab = params.get("tab") as SetupTab | null;
    if (activity) {
      setActiveActivity(activity);
    }
    if (tab && ["records", "website", "platform", "storage", "system", "import"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "storage" && authState.allowed) {
      void refreshStorage().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read shared storage."));
    }
  }, [activeTab, authState.allowed]);

  function openTab(tab: SetupTab) {
    setActiveActivity(null);
    setActiveTab(tab);
    router.replace(`/realtyos/app/setup?tab=${tab}`, { scroll: false });
    if (tab === "import") {
      void refreshImportLogs().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read import logs."));
      void refreshPmsCycleCounts().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read PMS counts."));
    }
  }

  function openActivity(task: SetupTask) {
    const tab = task.workflow === "review" ? "system" : task.workflow;
    setActiveActivity(task.key);
    setActiveTab(tab);
    setMessage(null);
    setError(null);
    router.push(`/realtyos/app/setup?activity=${task.key}`, { scroll: true });
    if (tab === "import") {
      void refreshImportLogs().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read import logs."));
    }
    if (tab === "storage") {
      void refreshStorage().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read shared storage."));
    }
  }

  function backToChecklist() {
    setActiveActivity(null);
    router.push("/realtyos/app/setup", { scroll: true });
    void refresh();
  }

  const records = useMemo(() => {
    const source = collection === "rooms" ? snapshot.rooms : snapshot[collection];
    return (source || []).filter((record) => matches(record as Record<string, unknown>, query)).slice(0, 80);
  }, [collection, query, snapshot]);

  async function saveRecord(path: string, form: HTMLFormElement) {
    setError(null);
    setMessage(null);
    await submitJson(path, valuesFromForm(form), "PATCH");
    setEditingId(null);
    setMessage("Record updated.");
    await refresh();
  }

  async function saveWebsite(form: HTMLFormElement) {
    setError(null);
    setMessage(null);
    await submitJson("/api/erp/website", valuesFromForm(form), "PATCH");
    setMessage("Website updated. Public pages will use the new settings immediately.");
    await refresh();
  }

  async function saveAgency(form: HTMLFormElement) {
    setError(null);
    setMessage(null);
    await submitJson("/api/erp/agency", valuesFromForm(form), "PATCH");
    setMessage("System settings updated.");
    await refresh();
  }

  async function createStaff(form: HTMLFormElement) {
    setError(null);
    setMessage(null);
    await submitJson("/api/erp/staff", valuesFromForm(form));
    form.reset();
    setMessage("Staff login created.");
    await refresh();
  }

  async function uploadDocument(form: HTMLFormElement) {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/documents/upload", { method: "POST", body: new FormData(form) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to upload document.");
    form.reset();
    setMessage("Document uploaded to shared storage.");
    await Promise.all([refresh(), refreshStorage()]);
  }

  async function uploadWebsiteAssetFromInput(inputId: string, inputName: string) {
    setError(null);
    setMessage(null);
    const source = document.getElementById(inputId) as HTMLInputElement | null;
    const file = source?.files?.[0];
    if (!file) throw new Error("Choose an image file first.");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/website/assets", { method: "POST", body: formData });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to upload asset.");
    const target = document.querySelector<HTMLInputElement>(`input[name="${inputName}"]`);
    if (target) target.value = payload.path;
    if (source) source.value = "";
    setMessage(`Asset uploaded. ${payload.path} has been inserted into the form.`);
  }

  async function deleteStorageEntry(path: string) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/storage?path=${encodeURIComponent(path)}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to delete document.");
    setMessage("Document deleted from shared storage.");
    await Promise.all([refresh(), refreshStorage()]);
  }

  async function createFolder(form: HTMLFormElement) {
    const body = valuesFromForm(form);
    const response = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mkdir", path: body.folderPath }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to create folder.");
    form.reset();
    setMessage("Folder created.");
    await refreshStorage();
  }

  async function refreshImportLogs() {
    const response = await fetch("/api/import/excel", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to load import logs.");
    setImportState((current) => ({ ...current, logs: payload.logs || [], targets: payload.targets || current.targets }));
  }

  async function refreshPmsCycleCounts() {
    const response = await fetch("/api/pms/cycle-import", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to load PMS counts.");
    setPmsCycle((current) => ({ ...current, counts: payload.counts }));
  }

  useEffect(() => {
    if (activeTab === "import" && authState.allowed) {
      void refreshImportLogs().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read import logs."));
      void refreshPmsCycleCounts().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read PMS counts."));
    }
  }, [activeTab, authState.allowed]);

  async function uploadPmsCycle(form: HTMLFormElement) {
    setPmsCycleLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/pms/cycle-import", { method: "POST", body: new FormData(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to upload tenant cycle workbook.");
      setPmsCycle((current) => ({ ...current, importId: payload.importId, preview: payload.preview || [], summary: payload.summary, errors: payload.errors || [] }));
      setMessage("Tenant cycle workbook parsed. Review validation results before confirming import.");
    } finally {
      setPmsCycleLoading(false);
    }
  }

  async function confirmPmsCycleImport() {
    if (!pmsCycle.importId) throw new Error("Upload and validate a tenant cycle workbook first.");
    setPmsCycleLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/pms/cycle-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", importId: pmsCycle.importId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to confirm tenant cycle import.");
      setMessage(`Tenant cycle import complete: ${payload.propertyCount} properties touched, ${payload.tenantCount} tenants imported, ${payload.occupancyCount} occupancy records created.`);
      await Promise.all([refresh(), refreshPmsCycleCounts()]);
    } finally {
      setPmsCycleLoading(false);
    }
  }

  async function resetPmsData(form: HTMLFormElement) {
    const confirmation = String(new FormData(form).get("confirmation") || "");
    if (confirmation !== "DELETE PMS DATA") throw new Error("Type DELETE PMS DATA to confirm.");
    if (!window.confirm("Final confirmation: delete all PMS property, room, tenant and occupancy records?")) return;
    setPmsCycleLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/pms/cycle-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", confirmation }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to reset PMS data.");
      setMessage(`PMS reset complete. Deleted ${payload.deleted.properties} properties, ${payload.deleted.rooms} rooms, ${payload.deleted.tenants} tenants and ${payload.deleted.occupancy_records} occupancy records.`);
      await Promise.all([refresh(), refreshPmsCycleCounts()]);
    } finally {
      setPmsCycleLoading(false);
    }
  }

  async function uploadExcel(form: HTMLFormElement) {
    setImportLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/import/excel", { method: "POST", body: new FormData(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to parse workbook.");
      setImportState((current) => ({
        ...current,
        importId: payload.importId,
        sheets: payload.sheets || [],
        mapping: payload.mapping || {},
        validation: payload.validation,
      }));
      setMessage("Workbook parsed. Review the preview, adjust mappings, then validate and confirm import.");
      await refreshImportLogs();
    } finally {
      setImportLoading(false);
    }
  }

  async function validateExcelImport() {
    if (!importState.importId) throw new Error("Upload a workbook first.");
    setImportLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/import/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", importId: importState.importId, mapping: importState.mapping }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to validate workbook.");
      setImportState((current) => ({ ...current, validation: payload.validation, mapping: payload.mapping || current.mapping }));
      setMessage(payload.validation?.errors?.length ? "Validation found issues. Fix mappings or source data before importing." : "Validation passed. You can now confirm the import.");
    } finally {
      setImportLoading(false);
    }
  }

  async function confirmExcelImport() {
    if (!importState.importId) throw new Error("Upload and validate a workbook first.");
    if (!window.confirm("Confirm import into the live database? This will create CRM/PMS/reporting records from validated rows.")) return;
    setImportLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/import/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", importId: importState.importId, mapping: importState.mapping }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to import workbook.");
      setMessage(`Import complete. Imported ${payload.imported || 0} row(s), skipped ${payload.skipped || 0} duplicate row(s).`);
      await Promise.all([refresh(), refreshImportLogs()]);
    } finally {
      setImportLoading(false);
    }
  }

  if (!authState.checked) {
    return (
      <SectionCard title="Checking Setup Access" subtitle="Verifying admin session">
        <p className="text-sm text-slate-600">Please wait while the ERP confirms setup access.</p>
      </SectionCard>
    );
  }

  if (!authState.allowed) {
    return (
      <SectionCard title="Setup Access Restricted" subtitle="Only admin users can change platform setup">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-semibold">Access denied.</p>
          <p className="mt-2">Sign in with an Admin or Platform Admin account for this Managing Agent to use this setup panel.</p>
          <p className="mt-2">Platform fallback admin: {ownerAdminFallbackEmail()}</p>
          {authState.email ? <p className="mt-2">Current signed-in account: {authState.email}</p> : null}
        </div>
      </SectionCard>
    );
  }

  if (snapshot.databaseConfigured === false) {
    return (
      <SectionCard title="PostgreSQL Setup Required" subtitle="Persistent ERP storage is not configured yet">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Set `DATABASE_URL`, then run `npm run db:migrate`.</p>
        </div>
      </SectionCard>
    );
  }

  const activityTask = activeActivity ? setupTasks.find((task) => task.key === activeActivity) : null;
  const visibleTab = activityTask ? (activityTask.workflow === "review" ? "system" : activityTask.workflow) : activeTab;
  const canRenderWorkflow = !activeActivity || Boolean(activityTask);

  return (
    <div className="space-y-6">
      {!activeActivity ? (
        <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Staff", value: snapshot.staff?.length ?? 0, icon: Users },
          { label: "Properties", value: snapshot.properties?.length ?? 0, icon: Home },
          { label: "Tenants", value: snapshot.tenants?.length ?? 0, icon: Lock },
          { label: "Storage", value: storageRoot, icon: FileArchive },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <item.icon className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-3 truncate text-xl font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "records", label: "Records", icon: Database },
          { id: "website", label: "Website", icon: Globe2 },
          { id: "platform", label: "ERP Platform", icon: Home },
          { id: "storage", label: "Shared Files", icon: FileArchive },
          { id: "import", label: "Data Import", icon: Upload },
          { id: "system", label: "System", icon: Save },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => openTab(tab.id as SetupTab)}
            className={activeTab === tab.id ? "button-primary gap-2" : "button-secondary gap-2"}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>
        </>
      ) : activityTask ? (
        <SetupActivityHeader task={activityTask} overallProgress={setupProgress} onBack={backToChecklist} onRefresh={() => void refresh()} />
      ) : (
        <SectionCard title="Setup Activity Not Found" subtitle="The setup activity link is not recognised.">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p>This setup activity may have been renamed or removed. Return to the Setup Panel and choose a current checklist tile.</p>
            <button type="button" className="button-secondary" onClick={backToChecklist}>Back to Setup Panel</button>
          </div>
        </SectionCard>
      )}

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {!activeActivity ? <SectionCard title="Dynamic Setup Command Centre" subtitle="Each tile is calculated from live platform state. Open a dedicated workflow, complete the missing activity, and the status updates automatically.">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Overall setup progress</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{setupProgress}%</p>
            </div>
            <button type="button" className="button-secondary gap-2" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" /> Refresh status
            </button>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white">
            <div className="h-2 rounded-full bg-slate-950 transition-all" style={{ width: `${setupProgress}%` }} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {setupTasks.length ? setupTasks.map((task) => (
            <SetupTaskTile key={task.key} task={task} onOpen={() => openActivity(task)} />
          )) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Setup status is loading.</p>
          )}
        </div>
      </SectionCard> : null}

      {canRenderWorkflow && visibleTab === "records" ? (
        <SectionCard title="Search and Edit ERP Records" subtitle="Retrieve staff, properties, tenants and room occupancy records, then edit only the fields that matter.">
          <div className="mb-5 grid gap-3 lg:grid-cols-[220px_1fr_auto]">
            <select className="ui-input" value={collection} onChange={(event) => { setCollection(event.target.value as EditableCollection); setEditingId(null); }}>
              <option value="staff">Staff logins</option>
              <option value="properties">Properties</option>
              <option value="tenants">Tenants</option>
              <option value="rooms">Occupancy / rooms</option>
            </select>
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input className="ui-input pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, property, tenant, room, postcode or status" />
            </label>
            <button type="button" className="button-secondary gap-2" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          <div className="space-y-3">
            {records.length ? records.map((record) => (
              <EditableRecord
                key={text(record.id)}
                collection={collection}
                record={record as Record<string, unknown>}
                properties={snapshot.properties || []}
                landlords={snapshot.landlords || []}
                editing={editingId === record.id}
                onEdit={() => setEditingId(text(record.id))}
                onCancel={() => setEditingId(null)}
                onSave={(form) => saveRecord(`/api/erp/${collection}?id=${encodeURIComponent(text(record.id))}`, form).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to update."))}
              />
            )) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No records found.</p>
            )}
          </div>
        </SectionCard>
      ) : null}

      {canRenderWorkflow && visibleTab === "website" ? (
        <SectionCard title="Public Website Editor" subtitle="Clearly labelled controls for the live public website: identity, contact details, colours, font sizes, logo sizing and homepage text.">
          <form onSubmit={(event) => { event.preventDefault(); void saveWebsite(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to update website.")); }} className="space-y-6">
            <AdminFormSection
              eyebrow="Step 1"
              title="Website Identity and Logo"
              description="These fields control the company name, strapline and logo used in the public website header and hero area."
            >
              <AdminField label="Website title" help="Shown beside the logo and used as the public brand name.">
                <input name="siteTitle" className="ui-input" defaultValue={snapshot.websiteSettings?.site_title ?? genericPlatformDefaults.companyName} />
              </AdminField>
              <AdminField label="Website tagline" help="Short description shown in the header and supporting website areas.">
                <input name="siteTagline" className="ui-input" defaultValue={snapshot.websiteSettings?.site_tagline ?? genericPlatformDefaults.siteTagline} />
              </AdminField>
              <AdminField label="Logo image path" help="Use an uploaded path such as /uploads/client-logo.png or the default platform logo.">
                <input name="logoPath" className="ui-input" defaultValue={snapshot.websiteSettings?.logo_path ?? genericPlatformDefaults.logoPath} />
              </AdminField>
              <AdminField label="Logo width" help="Controls how large the logo appears on the website, in pixels.">
                <input name="logoWidth" type="number" min="56" max="220" className="ui-input" defaultValue={snapshot.websiteSettings?.logo_width ?? "150"} />
              </AdminField>
              <AdminField label="Logo corner radius" help="0 is square. Higher values make the logo corners softer.">
                <input name="logoRadius" type="number" min="0" max="32" className="ui-input" defaultValue={snapshot.websiteSettings?.logo_radius ?? "6"} />
              </AdminField>
            </AdminFormSection>

            <AdminFormSection
              eyebrow="Step 2"
              title="Contact Information"
              description="These details appear on the public website contact areas and footer."
            >
              <AdminField label="Contact email" help="Public email address for enquiries.">
                <input name="contactEmail" type="email" className="ui-input" defaultValue={snapshot.websiteSettings?.contact_email ?? genericPlatformDefaults.contactEmail} />
              </AdminField>
              <AdminField label="Contact phone" help="Public telephone number. Leave blank if not required.">
                <input name="contactPhone" className="ui-input" defaultValue={snapshot.websiteSettings?.contact_phone ?? ""} />
              </AdminField>
              <AdminField label="Contact address" help="Public office or correspondence address.">
                <input name="contactAddress" className="ui-input" defaultValue={snapshot.websiteSettings?.contact_address ?? ""} />
              </AdminField>
              <AdminField label="Footer note" help="Small closing message shown at the bottom of the public website.">
                <textarea name="footerNote" className="ui-input min-h-20" defaultValue={snapshot.websiteSettings?.footer_note ?? ""} />
              </AdminField>
            </AdminFormSection>

            <AdminFormSection
              eyebrow="Step 3"
              title="Brand Colours"
              description="Use these colour controls for the main visual identity. Each colour picker is labelled by the website section it affects."
            >
              <AdminField label="Primary colour" help="Main header, dark buttons and strong brand areas.">
                <input name="primaryColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.primary_color ?? "#172033"} />
              </AdminField>
              <AdminField label="Secondary colour" help="Gold highlight colour used for emphasis.">
                <input name="secondaryColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.secondary_color ?? "#f4c542"} />
              </AdminField>
              <AdminField label="Accent colour" help="Secondary highlight for cards, icons and decorative accents.">
                <input name="accentColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.accent_color ?? "#b99024"} />
              </AdminField>
              <AdminField label="Navigation text colour" help="Text colour in the top website navigation.">
                <input name="navTextColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.nav_text_color ?? "#172033"} />
              </AdminField>
              <AdminField label="Hero text colour" help="Headline and hero message colour on the public homepage.">
                <input name="heroTextColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.hero_text_color ?? "#172033"} />
              </AdminField>
              <AdminField label="General body text colour" help="Paragraph text colour across website content sections.">
                <input name="bodyTextColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.body_text_color ?? "#526075"} />
              </AdminField>
            </AdminFormSection>

            <AdminFormSection
              eyebrow="Step 4"
              title="Typography and Sizing"
              description="These controls identify exactly which text area is being changed, so the admin can tune readability without guessing."
            >
              <AdminField label="Website font family" help="Main font used across the public website.">
                <select name="bodyFontFamily" className="ui-input" defaultValue={snapshot.websiteSettings?.body_font_family ?? "Inter, Arial, sans-serif"}>
                  <option value="Inter, Arial, sans-serif">Inter / Arial</option>
                  <option value="Aptos, Arial, sans-serif">Aptos</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Verdana, Geneva, sans-serif">Verdana</option>
                </select>
              </AdminField>
              <AdminField label="Navigation font size" help="Top menu links and sign-in link size.">
                <input name="navFontSize" type="number" min="12" max="20" className="ui-input" defaultValue={snapshot.websiteSettings?.nav_font_size ?? "14"} />
              </AdminField>
              <AdminField label="Hero headline size" help="Largest homepage heading size.">
                <input name="headingFontSize" type="number" min="36" max="80" className="ui-input" defaultValue={snapshot.websiteSettings?.heading_font_size ?? "56"} />
              </AdminField>
              <AdminField label="Hero paragraph size" help="Supporting text below the main homepage heading.">
                <input name="heroBodyFontSize" type="number" min="15" max="28" className="ui-input" defaultValue={snapshot.websiteSettings?.hero_body_font_size ?? "18"} />
              </AdminField>
              <AdminField label="General body font size" help="Normal paragraph text used in website sections.">
                <input name="bodyFontSize" type="number" min="14" max="22" className="ui-input" defaultValue={snapshot.websiteSettings?.body_font_size ?? "16"} />
              </AdminField>
              <AdminField label="Card heading size" help="Headings inside service cards and feature panels.">
                <input name="cardHeadingFontSize" type="number" min="16" max="32" className="ui-input" defaultValue={snapshot.websiteSettings?.card_heading_font_size ?? "20"} />
              </AdminField>
              <AdminField label="Footer font size" help="Small footer and legal/supporting website text.">
                <input name="footerFontSize" type="number" min="12" max="20" className="ui-input" defaultValue={snapshot.websiteSettings?.footer_font_size ?? "14"} />
              </AdminField>
            </AdminFormSection>

            <AdminFormSection
              eyebrow="Step 5"
              title="Homepage Text"
              description="Edit the public homepage wording that visitors see before signing in to the ERP."
            >
              <AdminField label="Hero badge text" help="Small pill-shaped line above the main homepage headline.">
                <input name="heroBadge" className="ui-input" defaultValue={snapshot.websiteSettings?.hero_badge ?? "Supported housing with control, care and evidence"} />
              </AdminField>
              <AdminField label="Hero headline" help="Main homepage message. Keep this direct and reassuring.">
                <textarea name="heroHeading" className="ui-input min-h-24" defaultValue={snapshot.websiteSettings?.hero_heading ?? ""} />
              </AdminField>
              <AdminField label="Hero introduction paragraph" help="Short explanation below the headline.">
                <textarea name="heroBody" className="ui-input min-h-28" defaultValue={snapshot.websiteSettings?.hero_body ?? ""} />
              </AdminField>
              <AdminField label="Process section heading" help="Heading for the company operating model section.">
                <textarea name="processHeading" className="ui-input min-h-20" defaultValue={snapshot.websiteSettings?.process_heading ?? "Every placement should have a clear story."} />
              </AdminField>
              <AdminField label="Process section body" help="Paragraph under the process heading.">
                <textarea name="processBody" className="ui-input min-h-24" defaultValue={snapshot.websiteSettings?.process_body ?? "A home, a support plan, a rent position, documents, risk checks and outcomes all connected in one accountable operating model."} />
              </AdminField>
            </AdminFormSection>

            <AdminFormSection
              eyebrow="Step 6"
              title="Upload Website Assets"
              description="Upload a new public logo or image into the app, then use the generated path in the logo/image fields above."
            >
              <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_auto] xl:col-span-3">
                <input id="website-logo-upload" type="file" accept="image/*" className="ui-input" />
                <button type="button" className="button-secondary" onClick={() => void uploadWebsiteAssetFromInput("website-logo-upload", "logoPath").catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to upload asset."))}>Upload and Use as Website Logo</button>
              </div>
            </AdminFormSection>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Changes publish immediately to the public website after saving.</p>
              <button className="button-primary gap-2"><Save className="h-4 w-4" /> Publish Website Changes</button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {canRenderWorkflow && visibleTab === "platform" ? (
        <SectionCard title="Supported Housing ERP Platform Customizer" subtitle="Owner-admin controls for the internal platform shell: title, logo, sidebar brand, key labels and platform colours.">
          <form onSubmit={(event) => { event.preventDefault(); void saveWebsite(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to update platform.")); }} className="space-y-6">
            <AdminFormSection
              eyebrow="Platform identity"
              title="Internal ERP Branding"
              description="Controls what staff see in the top bar, side menu and secure workspace shell."
            >
              <AdminField label="Platform title" help="Fallback workspace title used across the ERP.">
                <input name="platformTitle" className="ui-input" defaultValue={snapshot.websiteSettings?.platform_title ?? genericPlatformDefaults.productName} />
              </AdminField>
              <AdminField label="Sidebar brand" help="Brand shown in the dark sidebar identity panel.">
                <input name="platformSidebarBrand" className="ui-input" defaultValue={snapshot.websiteSettings?.platform_sidebar_brand ?? genericPlatformDefaults.companyName} />
              </AdminField>
              <AdminField label="Internal ERP logo path" help="Logo used in sidebar/topbar/login shell.">
                <input name="platformLogoPath" className="ui-input" defaultValue={snapshot.websiteSettings?.platform_logo_path ?? genericPlatformDefaults.platformLogoPath} />
              </AdminField>
              <AdminField label="Platform primary colour" help="Active menu and command colour inside the ERP.">
                <input name="platformPrimaryColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.platform_primary_color ?? "#0f172a"} />
              </AdminField>
              <AdminField label="Platform accent colour" help="Highlight colour for future ERP components and storyboards.">
                <input name="platformAccentColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.platform_accent_color ?? "#f4c542"} />
              </AdminField>
            </AdminFormSection>

            <AdminFormSection
              eyebrow="Navigation labels"
              title="Side Menu Titles and Headings"
              description="Rename key platform headings so the ERP matches your staff language."
            >
              <AdminField label="Overview menu label" help="Changes the main landing page label in the sidebar and topbar.">
                <input name="platformSidebarLabelOverview" className="ui-input" defaultValue={snapshot.websiteSettings?.platform_sidebar_label_overview ?? "Overview"} />
              </AdminField>
              <AdminField label="Reports menu label" help="Changes the BI/reporting menu label.">
                <input name="platformSidebarLabelReports" className="ui-input" defaultValue={snapshot.websiteSettings?.platform_sidebar_label_reports ?? "BI Reports"} />
              </AdminField>
            </AdminFormSection>

            <AdminFormSection
              eyebrow="Upload"
              title="Upload Platform Logo"
              description="Upload a new internal ERP logo and place the generated path into the platform logo field."
            >
              <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_auto] xl:col-span-3">
                <input id="platform-logo-upload" type="file" accept="image/*" className="ui-input" />
                <button type="button" className="button-secondary" onClick={() => void uploadWebsiteAssetFromInput("platform-logo-upload", "platformLogoPath").catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to upload platform logo."))}>Upload and Use as ERP Logo</button>
              </div>
            </AdminFormSection>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Changes apply after saving and refreshing the staff workspace.</p>
              <button className="button-primary gap-2"><Save className="h-4 w-4" /> Save ERP Platform Settings</button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {canRenderWorkflow && visibleTab === "storage" ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Upload to Shared File Server" subtitle={`Files are stored under ${storageRoot || genericPlatformDefaults.storageRoot} with role-based document permissions.`}>
            <form onSubmit={(event) => { event.preventDefault(); void uploadDocument(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to upload.")); }} className="grid gap-3">
              <input name="title" className="ui-input" placeholder="Document title" required />
              <select name="category" className="ui-input" defaultValue="Tenant Documents">
                <option>Tenant Documents</option>
                <option>Property Documents</option>
                <option>Landlord Documents</option>
                <option>Contracts</option>
                <option>Compliance</option>
                <option>Finance</option>
              </select>
              <select name="tenantId" className="ui-input" defaultValue="">
                <option value="">Link to tenant if applicable</option>
                {snapshot.tenants?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.first_name} {tenant.last_name}</option>)}
              </select>
              <select name="propertyId" className="ui-input" defaultValue="">
                <option value="">Link to property if applicable</option>
                {snapshot.properties?.map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
              </select>
              <input name="file" type="file" className="ui-input" required />
              <PermissionChecks name="readRoles" label="Can read/open" defaults={roles} />
              <PermissionChecks name="writeRoles" label="Can update" defaults={["admin", "manager"]} />
              <PermissionChecks name="deleteRoles" label="Can delete" defaults={["admin"]} />
              <button className="button-primary gap-2"><Upload className="h-4 w-4" /> Upload Document</button>
            </form>
          </SectionCard>

          <SectionCard title="Search Shared Files" subtitle="Retrieve and open documents from the shared file server.">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Used</p>
                <p className="mt-1 font-semibold text-slate-900">{storageUsage ? `${Math.ceil(storageUsage.used / 1024 / 1024)} MB` : "Checking..."}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Free</p>
                <p className="mt-1 font-semibold text-slate-900">{storageUsage ? `${Math.ceil(storageUsage.free / 1024 / 1024)} MB` : "Checking..."}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Usage</p>
                <p className="mt-1 font-semibold text-slate-900">{storageUsage ? `${storageUsage.usedPercent}%` : "Checking..."}</p>
              </div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void createFolder(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to create folder.")); }} className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input name="folderPath" className="ui-input" placeholder="Create folder, e.g. Tenant Documents/Smith" required />
              <button className="button-secondary">Create Folder</button>
            </form>
            <form onSubmit={(event) => { event.preventDefault(); void refreshStorage(storageQuery).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to search storage.")); }} className="mb-4 flex gap-3">
              <select className="ui-input max-w-52" value={storagePath} onChange={(event) => { setStoragePath(event.target.value); void refreshStorage(storageQuery, event.target.value); }}>
                <option value="">All folders</option>
                <option value="Tenant Documents">Tenant Documents</option>
                <option value="Property Documents">Property Documents</option>
                <option value="Landlord Documents">Landlord Documents</option>
                <option value="Contracts">Contracts</option>
                <option value="Compliance">Compliance</option>
                <option value="Finance">Finance</option>
              </select>
              <input className="ui-input" value={storageQuery} onChange={(event) => setStorageQuery(event.target.value)} placeholder="Search file names and folders" />
              <button className="button-secondary gap-2"><Search className="h-4 w-4" /> Search</button>
            </form>
            <div className="max-h-[560px] space-y-2 overflow-auto pr-2">
              {storageEntries.length ? storageEntries.map((entry) => (
                <div key={entry.path} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{entry.name}</p>
                    <p className="truncate text-xs text-slate-500">{entry.path} · {entry.type} · {Math.ceil(entry.size / 1024)} KB</p>
                  </div>
                  {entry.type === "file" ? (
                    <div className="flex gap-2">
                      <a className="button-secondary px-4 py-2" href={`/api/storage/open?path=${encodeURIComponent(entry.path)}`} target="_blank" rel="noreferrer">Open</a>
                      <button type="button" className="button-secondary px-4 py-2 text-rose-700" onClick={() => void deleteStorageEntry(entry.path).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to delete document."))}>Delete</button>
                    </div>
                  ) : null}
                </div>
              )) : <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No files found.</p>}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {canRenderWorkflow && visibleTab === "import" ? (
        <div className="space-y-6">
          <SectionCard title="PMS Fresh Start and Tenant Cycle Import" subtitle="Admin-only reset and import workflow for the New Tenant List Cycle 74 template. Reset requires strong confirmation and import requires preview/validation before database writes.">
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ["Properties", pmsCycle.counts?.properties ?? snapshot.properties?.length ?? 0],
                    ["Rooms", pmsCycle.counts?.rooms ?? snapshot.rooms?.length ?? 0],
                    ["Tenants", pmsCycle.counts?.tenants ?? snapshot.tenants?.length ?? 0],
                    ["Occupancy", pmsCycle.counts?.occupancy_records ?? "0"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{text(value)}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={(event) => { event.preventDefault(); void resetPmsData(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to reset PMS data.")); }} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="font-semibold text-rose-950">Start fresh by deleting PMS data</p>
                  <p className="mt-1 text-sm text-rose-800">Deletes properties, rooms, tenants, occupancy records, PMS support notes, contracts, HB claims and property/tenant ledger entries. It does not delete staff users, CRM, website, agency settings or documents.</p>
                  <input name="confirmation" className="ui-input mt-3 border-rose-200" placeholder="Type DELETE PMS DATA" />
                  <button className="button-primary mt-3 bg-rose-700 hover:bg-rose-800" disabled={pmsCycleLoading}>Delete PMS Data</button>
                </form>
                <form onSubmit={(event) => { event.preventDefault(); void uploadPmsCycle(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to upload tenant cycle workbook.")); }} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-slate-950">Upload New Tenant List Cycle 74 workbook</p>
                  <p className="mt-1 text-sm text-slate-600">Expected sheet: <strong>template</strong>. Required headers include PropertyAddress, Room, FirstName, LastName, CheckinDate, HBClaimRefNumber, Gender and RiskAssessment.</p>
                  <input name="file" type="file" accept=".xlsx" className="ui-input mt-3" required />
                  <button className="button-primary mt-3 gap-2" disabled={pmsCycleLoading}><Upload className="h-4 w-4" /> Upload Tenant Cycle Template</button>
                </form>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">Template validation and preview</p>
                    <p className="mt-1 text-sm text-slate-600">{pmsCycle.summary ? `${pmsCycle.summary.propertyCount} properties, ${pmsCycle.summary.tenantCount} tenants, ${pmsCycle.summary.occupancyCount} occupancy records detected.` : "Upload the workbook to preview rows and validation results."}</p>
                  </div>
                  <button type="button" className="button-primary" disabled={!pmsCycle.importId || pmsCycleLoading || Boolean(pmsCycle.summary?.errorCount)} onClick={() => void confirmPmsCycleImport().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to confirm PMS import."))}>
                    Confirm PMS Import
                  </button>
                </div>
                {pmsCycle.errors.length ? (
                  <div className="mt-4 max-h-48 space-y-2 overflow-auto">
                    {pmsCycle.errors.slice(0, 60).map((issue, index) => (
                      <div key={`${issue.row}-${issue.field}-${index}`} className={issue.severity === "error" ? "rounded-xl bg-rose-50 p-3 text-xs text-rose-800" : "rounded-xl bg-amber-50 p-3 text-xs text-amber-800"}>
                        Row {issue.row}, {issue.field}: {issue.message}
                      </div>
                    ))}
                  </div>
                ) : null}
                {pmsCycle.preview.length ? (
                  <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-[860px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr><th className="px-3 py-2">Property</th><th className="px-3 py-2">Room</th><th className="px-3 py-2">Tenant</th><th className="px-3 py-2">NI</th><th className="px-3 py-2">HB Claim</th><th className="px-3 py-2">Record Status</th></tr>
                      </thead>
                      <tbody>
                        {pmsCycle.preview.slice(0, 12).map((row, index) => (
                          <tr key={index} className="border-t border-slate-100">
                            <td className="px-3 py-2">{text(row.propertyAddress)}</td><td className="px-3 py-2">{text(row.roomLabel)}</td><td className="px-3 py-2">{text(row.firstName)} {text(row.lastName)}</td><td className="px-3 py-2">{text(row.niNumber)}</td><td className="px-3 py-2">{text(row.hbClaimRefNumber)}</td><td className="px-3 py-2 font-semibold">{text(row.recordStatusCalculated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard title="Smart Excel Source Data Import" subtitle="Upload .xlsx source data, preview sheets, map columns, validate rows, then confirm before anything is written to PostgreSQL.">
            <form onSubmit={(event) => { event.preventDefault(); void uploadExcel(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to upload workbook.")); }} className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">Supported imports</p>
                <p className="mt-1">CRM contacts/leads, PMS properties/tenants, and reporting ledger rows. The importer suggests modules from sheet names and headers, but you can correct mappings before import.</p>
              </div>
              <input name="file" type="file" accept=".xlsx" className="ui-input" required />
              <button className="button-primary gap-2" disabled={importLoading}><Upload className="h-4 w-4" /> {importLoading ? "Processing..." : "Upload and Preview"}</button>
            </form>

            <div className="mt-6 space-y-3">
              <button type="button" className="button-secondary w-full justify-center" disabled={!importState.importId || importLoading} onClick={() => void validateExcelImport().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to validate import."))}>
                Validate Current Mapping
              </button>
              <button type="button" className="button-primary w-full justify-center" disabled={!importState.importId || importLoading || Boolean(importState.validation?.errors?.length)} onClick={() => void confirmExcelImport().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to confirm import."))}>
                Confirm Import to Database
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Recent import logs</p>
              <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                {importState.logs.length ? importState.logs.map((log) => (
                  <div key={text(log.id)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{text(log.filename)}</span>
                      <span className="rounded-full bg-white px-2 py-1 font-semibold uppercase tracking-[0.1em] text-slate-600">{text(log.status)}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{text(log.rows_imported)} imported, {text(log.rows_skipped)} skipped, {text(log.validation_errors)} errors</p>
                  </div>
                )) : <p className="text-sm text-slate-600">No imports logged yet.</p>}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Preview, Mapping and Validation" subtitle="Review detected sheets and row-level errors before confirming the import.">
            {importState.sheets.length ? (
              <div className="space-y-5">
                {importState.sheets.map((sheet) => (
                  <ImportSheetPanel
                    key={sheet.name}
                    sheet={sheet}
                    targets={importState.targets}
                    mapping={importState.mapping[sheet.name] || sheet.suggestedMapping}
                    onMappingChange={(next) => setImportState((current) => ({ ...current, mapping: { ...current.mapping, [sheet.name]: next } }))}
                  />
                ))}
                <ValidationPanel validation={importState.validation} />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Upload className="mx-auto h-8 w-8 text-slate-500" />
                <h3 className="mt-3 text-lg font-semibold text-slate-950">Upload a workbook to begin</h3>
                <p className="mt-2 text-sm text-slate-600">No data will be imported until you validate and confirm the mapping.</p>
              </div>
            )}
          </SectionCard>
        </div>
        </div>
      ) : null}

      {canRenderWorkflow && visibleTab === "system" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Agency and Storage Settings" subtitle="Core company details and the shared file server root.">
            <form onSubmit={(event) => { event.preventDefault(); void saveAgency(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to update system settings.")); }} className="grid gap-3">
              <input name="name" className="ui-input" defaultValue={snapshot.agency?.name ?? ""} placeholder="Agency name" required />
              <input name="registrationNumber" className="ui-input" defaultValue={snapshot.agency?.registration_number ?? ""} placeholder="Registration number" />
              <input name="localAuthority" className="ui-input" defaultValue={snapshot.agency?.local_authority ?? ""} placeholder="Primary local authority" />
              <input name="contactEmail" type="email" className="ui-input" defaultValue={snapshot.agency?.contact_email ?? ""} placeholder="Contact email" />
              <input name="contactPhone" className="ui-input" defaultValue={snapshot.agency?.contact_phone ?? ""} placeholder="Contact phone" />
              <select name="currencyCode" className="ui-input" defaultValue={snapshot.agency?.currency_code ?? "GBP"}>
                <option value="GBP">GBP - Pound sterling</option>
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - US dollar</option>
                <option value="AED">AED - UAE dirham</option>
              </select>
              <input name="sharedFileRoot" className="ui-input" defaultValue={snapshot.agency?.shared_file_root ?? genericPlatformDefaults.storageRoot} placeholder={genericPlatformDefaults.storageRoot} />
              <button className="button-primary gap-2"><Save className="h-4 w-4" /> Save System Settings</button>
            </form>
          </SectionCard>

          <SectionCard title="Create Staff Login" subtitle="Owner-admin controlled access for new staff users.">
            <form onSubmit={(event) => { event.preventDefault(); void createStaff(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to create staff login.")); }} className="grid gap-3">
              <input name="fullName" className="ui-input" placeholder="Full name" required />
              <input name="email" type="email" className="ui-input" placeholder="Email" required />
              <select name="role" className="ui-input" defaultValue="support_worker">
                {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
              </select>
              <input name="password" type="password" minLength={8} className="ui-input" placeholder="Temporary password" required />
              <button className="button-primary gap-2"><Users className="h-4 w-4" /> Create Login</button>
            </form>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

function EditableRecord({
  collection,
  record,
  properties,
  landlords,
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  collection: EditableCollection;
  record: Record<string, unknown>;
  properties: Array<Record<string, unknown>>;
  landlords: Array<Record<string, unknown>>;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (form: HTMLFormElement) => void;
}) {
  const title =
    collection === "staff" ? `${text(record.full_name)} · ${text(record.email)}` :
    collection === "properties" ? text(record.address) :
    collection === "rooms" ? `${propertyName(record.property_id, properties)} · Room ${text(record.room_label)}` :
    `${text(record.first_name)} ${text(record.last_name)}`;

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{collection}</p>
        </div>
        <div className="flex gap-2">
          {editing ? <button type="submit" className="button-primary px-4 py-2"><Save className="h-4 w-4" /></button> : null}
          <button type="button" className="button-secondary px-4 py-2" onClick={editing ? onCancel : onEdit}>
            {editing ? "Cancel" : <Pencil className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {collection === "staff" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input disabled={!editing} name="fullName" className="ui-input" defaultValue={text(record.full_name)} placeholder="Full name" />
          <input disabled={!editing} name="email" type="email" className="ui-input" defaultValue={text(record.email)} placeholder="Email" />
          <select disabled={!editing} name="role" className="ui-input" defaultValue={text(record.role)}>
            {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
          <select disabled={!editing} name="active" className="ui-input" defaultValue={String(record.active ?? true)}>
            <option value="true">Active</option>
            <option value="false">Disabled</option>
          </select>
          <input disabled={!editing} name="password" type="password" className="ui-input" placeholder="New password if resetting" />
        </div>
      ) : null}

      {collection === "properties" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input disabled={!editing} name="address" className="ui-input xl:col-span-2" defaultValue={text(record.address)} placeholder="Address" />
          <input disabled={!editing} name="postcode" className="ui-input" defaultValue={text(record.postcode)} placeholder="Postcode" />
          <input disabled={!editing} name="localAuthority" className="ui-input" defaultValue={text(record.local_authority)} placeholder="Local authority" />
          <select disabled={!editing} name="landlordId" className="ui-input" defaultValue={text(record.landlord_id)}>
            <option value="">No owner assigned</option>
            {landlords.map((landlord) => <option key={text(landlord.id)} value={text(landlord.id)}>{text(landlord.name)}</option>)}
          </select>
        </div>
      ) : null}

      {collection === "tenants" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input disabled={!editing} name="firstName" className="ui-input" defaultValue={text(record.first_name)} placeholder="First name" />
          <input disabled={!editing} name="middleName" className="ui-input" defaultValue={text(record.middle_name)} placeholder="Middle name" />
          <input disabled={!editing} name="lastName" className="ui-input" defaultValue={text(record.last_name)} placeholder="Last name" />
          <input disabled={!editing} name="niNumber" className="ui-input" defaultValue={text(record.ni_number)} placeholder="NI number" />
          <select disabled={!editing} name="riskAssessment" className="ui-input" defaultValue={text(record.risk_assessment)}>
            <option value="">No risk set</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <input disabled={!editing} name="hbClaimRefNumber" className="ui-input" defaultValue={text(record.hb_claim_ref_number)} placeholder="HB claim ref" />
          <input disabled={!editing} name="referralAgency" className="ui-input" defaultValue={text(record.referral_agency)} placeholder="Referral agency" />
          <input disabled={!editing} name="gender" className="ui-input" defaultValue={text(record.gender)} placeholder="Gender" />
        </div>
      ) : null}

      {collection === "rooms" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input disabled={!editing} name="roomLabel" className="ui-input" defaultValue={text(record.room_label)} placeholder="Room" />
          <select disabled={!editing} name="status" className="ui-input" defaultValue={text(record.status)}>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="void">Void</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <input disabled={!editing} name="weeklyRent" type="number" step="0.01" className="ui-input" defaultValue={text(record.weekly_rent)} placeholder="Weekly rent" />
          <input disabled={!editing} className="ui-input xl:col-span-2" value={propertyName(record.property_id, properties)} readOnly />
        </div>
      ) : null}
    </form>
  );
}

function PermissionChecks({ name, label, defaults }: { name: string; label: string; defaults: string[] }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 p-3">
      <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {roles.map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name={name} value={role} defaultChecked={defaults.includes(role)} />
            {roleLabels[role]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AdminFormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function AdminField({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className="mt-1 block min-h-8 text-xs leading-4 text-slate-500">{help}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function SetupCheck({ complete, label, detail }: { complete: boolean; label: string; detail: string }) {
  return (
    <article className={`rounded-2xl border p-4 ${complete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-center gap-2">
        {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertCircle className="h-4 w-4 text-amber-700" />}
        <p className={`text-sm font-semibold ${complete ? "text-emerald-900" : "text-amber-900"}`}>{label}</p>
      </div>
      <p className={`mt-2 text-xs leading-5 ${complete ? "text-emerald-800" : "text-amber-800"}`}>{detail}</p>
    </article>
  );
}

function SetupActivityHeader({
  task,
  overallProgress,
  onBack,
  onRefresh,
}: {
  task: SetupTask;
  overallProgress: number;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const statusStyles: Record<SetupTask["status"], string> = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    in_progress: "border-sky-200 bg-sky-50 text-sky-800",
    needs_attention: "border-amber-200 bg-amber-50 text-amber-900",
    not_started: "border-slate-200 bg-white text-slate-700",
    optional: "border-slate-200 bg-slate-50 text-slate-600",
  };
  const label = task.status.replace(/_/g, " ");
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <button type="button" onClick={onBack} className="mb-4 text-sm font-semibold text-slate-600 hover:text-slate-950">
            Back to Setup Panel
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Focused setup activity</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 md:text-3xl">{task.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>
        </div>
        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:w-72">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusStyles[task.status]}`}>{label}</span>
            <button type="button" onClick={onRefresh} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:text-slate-950" aria-label="Refresh setup status">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Task progress</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{task.progress}%</p>
            </div>
            <p className="text-xs text-slate-500">Overall {overallProgress}%</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white">
            <div className="h-2 rounded-full bg-slate-950 transition-all" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Completion requirement</p>
          <p className="mt-1">{task.completionCriteria}</p>
          {task.warnings.length ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-800">{task.warnings[0]}</p> : null}
        </div>
        <button type="button" className="button-primary justify-center self-stretch px-6" onClick={onBack}>
          Save progress and return
        </button>
      </div>
    </section>
  );
}

function SetupTaskTile({ task, onOpen }: { task: SetupTask; onOpen: () => void }) {
  const statusStyles: Record<SetupTask["status"], string> = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    in_progress: "border-sky-200 bg-sky-50 text-sky-800",
    needs_attention: "border-amber-200 bg-amber-50 text-amber-900",
    not_started: "border-slate-200 bg-white text-slate-700",
    optional: "border-slate-200 bg-slate-50 text-slate-600",
  };
  const label = task.status.replace(/_/g, " ");
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{task.title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{task.description}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusStyles[task.status]}`}>{label}</span>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{task.progress}% complete</span>
          {task.lastUpdated ? <span>{new Date(task.lastUpdated).toLocaleDateString()}</span> : null}
        </div>
        <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-950" style={{ width: `${task.progress}%` }} /></div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{task.completionCriteria}</p>
      {task.warnings.length ? <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">{task.warnings[0]}</p> : null}
      <button type="button" onClick={onOpen} className={task.status === "completed" ? "button-secondary mt-4 w-full justify-center" : "button-primary mt-4 w-full justify-center"}>
        {task.actionLabel}
      </button>
    </article>
  );
}

function ImportSheetPanel({
  sheet,
  targets,
  mapping,
  onMappingChange,
}: {
  sheet: ImportSheet;
  targets: ImportState["targets"];
  mapping: { target: string; columns: Record<string, string> };
  onMappingChange: (mapping: { target: string; columns: Record<string, string> }) => void;
}) {
  const target = targets[mapping.target] || targets[sheet.suggestedTarget];
  const fields = target?.fields ? Object.keys(target.fields) : Object.keys(mapping.columns);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{sheet.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{sheet.preview.length} preview row(s) - suggested {target?.label || sheet.suggestedTarget}</p>
        </div>
        <select className="ui-input max-w-72" value={mapping.target} onChange={(event) => onMappingChange({ target: event.target.value, columns: {} })}>
          {Object.entries(targets).map(([key, info]) => <option key={key} value={key}>{info.label}</option>)}
        </select>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field} className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{field}{target?.required?.includes(field) ? " *" : ""}</span>
            <select className="ui-input mt-1" value={mapping.columns[field] || ""} onChange={(event) => onMappingChange({ ...mapping, columns: { ...mapping.columns, [field]: event.target.value } })}>
              <option value="">Do not import</option>
              {sheet.headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>{sheet.headers.slice(0, 8).map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr>
          </thead>
          <tbody>
            {sheet.preview.slice(0, 5).map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {sheet.headers.slice(0, 8).map((header) => <td key={header} className="max-w-48 truncate px-3 py-2 text-slate-700">{text(row[header])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ValidationPanel({ validation }: { validation?: ImportState["validation"] }) {
  if (!validation) return <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Validation will appear after upload or when you click validate.</p>;
  if (!validation.errors.length) return <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Validation passed. {validation.validRows} row(s) are ready to import.</p>;
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-semibold text-rose-800">{validation.errors.length} validation issue(s) found</p>
      <div className="mt-3 max-h-72 space-y-2 overflow-auto">
        {validation.errors.slice(0, 80).map((error, index) => (
          <div key={index} className="rounded-xl bg-white p-3 text-xs text-rose-800">
            {error.sheet}, row {error.row}, {error.field}: {error.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function propertyName(propertyId: unknown, properties: Array<Record<string, unknown>>) {
  return text(properties.find((property) => property.id === propertyId)?.address || "Unassigned property");
}
