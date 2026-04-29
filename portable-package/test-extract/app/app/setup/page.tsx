"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Database, FileArchive, Globe2, Home, Lock, Pencil, RefreshCw, Save, Search, Upload, Users } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

const roles = ["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"];
const roleLabels: Record<string, string> = {
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
  const [snapshot, setSnapshot] = useState<ErpSnapshot>({});
  const [authState, setAuthState] = useState<AuthState>({ checked: false, allowed: false });
  const [activeTab, setActiveTab] = useState<"records" | "website" | "storage" | "system">("records");
  const [collection, setCollection] = useState<EditableCollection>("staff");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageQuery, setStorageQuery] = useState("");
  const [storageRoot, setStorageRoot] = useState("/mnt/storage");
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [storagePath, setStoragePath] = useState("");

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
  }

  async function refreshStorage(nextQuery = storageQuery, nextPath = storagePath) {
    const response = await fetch(`/api/storage?q=${encodeURIComponent(nextQuery)}&path=${encodeURIComponent(nextPath)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to read shared storage.");
    setStorageRoot(payload.root || "/mnt/storage");
    setStorageEntries(payload.entries || []);
    setStorageUsage(payload.usage || null);
    setStoragePath(payload.path || "");
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (activeTab === "storage" && authState.allowed) {
      void refreshStorage().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read shared storage."));
    }
  }, [activeTab, authState.allowed]);

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

  if (!authState.checked) {
    return (
      <SectionCard title="Checking Setup Access" subtitle="Verifying owner-admin session">
        <p className="text-sm text-slate-600">Please wait while RealtyOS confirms setup access.</p>
      </SectionCard>
    );
  }

  if (!authState.allowed) {
    return (
      <SectionCard title="Setup Access Restricted" subtitle="Only the owner admin can change platform setup">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-semibold">Access denied.</p>
          <p className="mt-2">Sign in as aesha.akhtar@uksupporthousing.co.uk or admin@uksupporthousing.co.uk to use this setup panel.</p>
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

  return (
    <div className="space-y-6">
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
          { id: "storage", label: "Shared Files", icon: FileArchive },
          { id: "system", label: "System", icon: Save },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={activeTab === tab.id ? "button-primary gap-2" : "button-secondary gap-2"}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {activeTab === "records" ? (
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

      {activeTab === "website" ? (
        <SectionCard title="Website Admin" subtitle="Live public website settings. Keep changes simple: logo, colours, headline, message and contact email.">
          <form onSubmit={(event) => { event.preventDefault(); void saveWebsite(event.currentTarget).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to update website.")); }} className="grid gap-3 lg:grid-cols-3">
            <input name="siteTitle" className="ui-input" defaultValue={snapshot.websiteSettings?.site_title ?? "UK Support Housing"} placeholder="Website title" />
            <input name="siteTagline" className="ui-input" defaultValue={snapshot.websiteSettings?.site_tagline ?? "Supported accommodation services"} placeholder="Tagline" />
            <input name="contactEmail" type="email" className="ui-input" defaultValue={snapshot.websiteSettings?.contact_email ?? "info@uksupporthousing.co.uk"} placeholder="Contact email" />
            <input name="contactPhone" className="ui-input" defaultValue={snapshot.websiteSettings?.contact_phone ?? ""} placeholder="Contact phone" />
            <input name="contactAddress" className="ui-input lg:col-span-2" defaultValue={snapshot.websiteSettings?.contact_address ?? ""} placeholder="Contact address" />
            <input name="primaryColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.primary_color ?? "#172033"} title="Primary colour" />
            <input name="secondaryColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.secondary_color ?? "#f4c542"} title="Secondary colour" />
            <input name="accentColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.accent_color ?? "#b99024"} title="Accent colour" />
            <input name="logoPath" className="ui-input" defaultValue={snapshot.websiteSettings?.logo_path ?? "/HomeSupport_logo.jpeg"} placeholder="Logo path" />
            <input name="logoWidth" type="number" min="56" max="180" className="ui-input" defaultValue={snapshot.websiteSettings?.logo_width ?? "96"} placeholder="Logo size" />
            <input name="logoRadius" type="number" min="0" max="32" className="ui-input" defaultValue={snapshot.websiteSettings?.logo_radius ?? "4"} placeholder="Logo corner radius" />
            <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Font Settings by Website Section</p>
              <p className="mt-1 text-sm text-slate-600">Adjust each area independently so the public site remains readable and balanced.</p>
            </div>
            <select name="bodyFontFamily" className="ui-input" defaultValue={snapshot.websiteSettings?.body_font_family ?? "Inter, Arial, sans-serif"}>
              <option value="Inter, Arial, sans-serif">Inter / Arial</option>
              <option value="Aptos, Arial, sans-serif">Aptos</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Verdana, Geneva, sans-serif">Verdana</option>
            </select>
            <input name="navFontSize" type="number" min="12" max="18" className="ui-input" defaultValue={snapshot.websiteSettings?.nav_font_size ?? "14"} placeholder="Navigation font size" />
            <input name="navTextColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.nav_text_color ?? "#172033"} title="Navigation text colour" />
            <input name="headingFontSize" type="number" min="36" max="72" className="ui-input" defaultValue={snapshot.websiteSettings?.heading_font_size ?? "56"} placeholder="Hero heading size" />
            <input name="heroBodyFontSize" type="number" min="15" max="24" className="ui-input" defaultValue={snapshot.websiteSettings?.hero_body_font_size ?? "18"} placeholder="Hero body size" />
            <input name="heroTextColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.hero_text_color ?? "#172033"} title="Hero text colour" />
            <input name="bodyFontSize" type="number" min="14" max="20" className="ui-input" defaultValue={snapshot.websiteSettings?.body_font_size ?? "16"} placeholder="General body font size" />
            <input name="bodyTextColor" type="color" className="ui-input h-12 p-1" defaultValue={snapshot.websiteSettings?.body_text_color ?? "#526075"} title="Body text colour" />
            <input name="cardHeadingFontSize" type="number" min="16" max="28" className="ui-input" defaultValue={snapshot.websiteSettings?.card_heading_font_size ?? "20"} placeholder="Card heading size" />
            <input name="footerFontSize" type="number" min="12" max="18" className="ui-input" defaultValue={snapshot.websiteSettings?.footer_font_size ?? "14"} placeholder="Footer font size" />
            <textarea name="heroHeading" className="ui-input min-h-24 lg:col-span-3" defaultValue={snapshot.websiteSettings?.hero_heading ?? ""} placeholder="Main website heading" />
            <textarea name="heroBody" className="ui-input min-h-28 lg:col-span-3" defaultValue={snapshot.websiteSettings?.hero_body ?? ""} placeholder="Intro message" />
            <textarea name="footerNote" className="ui-input min-h-20 lg:col-span-3" defaultValue={snapshot.websiteSettings?.footer_note ?? ""} placeholder="Footer note" />
            <button className="button-primary gap-2 lg:col-span-3"><Save className="h-4 w-4" /> Publish Website Changes</button>
          </form>
        </SectionCard>
      ) : null}

      {activeTab === "storage" ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Upload to Shared File Server" subtitle={`Files are stored under ${storageRoot || "/mnt/storage"} with role-based document permissions.`}>
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

      {activeTab === "system" ? (
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
              <input name="sharedFileRoot" className="ui-input" defaultValue={snapshot.agency?.shared_file_root ?? "/mnt/storage"} placeholder="/mnt/storage" />
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

function propertyName(propertyId: unknown, properties: Array<Record<string, unknown>>) {
  return text(properties.find((property) => property.id === propertyId)?.address || "Unassigned property");
}
