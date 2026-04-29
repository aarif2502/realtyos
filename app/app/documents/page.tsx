"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileArchive, FolderPlus, Search, Upload } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

type Snapshot = {
  agency?: { shared_file_root?: string } | null;
  properties?: Array<{ id: string; address: string }>;
  tenants?: Array<{ id: string; first_name: string; middle_name?: string; last_name: string }>;
  landlords?: Array<{ id: string; name: string }>;
  documents?: Array<{ id: string; property_id?: string; tenant_id?: string; landlord_id?: string; title: string; category: string; file_path: string; storage_key?: string; original_file_name?: string; mime_type?: string; file_size?: string }>;
};
type Tenant = NonNullable<Snapshot["tenants"]>[number];
type StorageEntry = { name: string; path: string; type: "file" | "folder"; size: number; modifiedAt: string };
type DocAnalysis = { title: string; category: string; name: string; size: number; summary: string; preview?: string };

function tenantName(tenant?: Tenant) {
  return tenant ? `${tenant.first_name} ${tenant.middle_name ?? ""} ${tenant.last_name}`.replace(/\s+/g, " ").trim() : "No tenant";
}

function fileSize(bytes?: string) {
  const value = Number(bytes ?? 0);
  if (!value) return "size not recorded";
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.ceil(value / 1024)} KB`;
}

export default function DocumentsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DocAnalysis | null>(null);
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const [storagePath, setStoragePath] = useState("");
  const [storageQuery, setStorageQuery] = useState("");
  const [storageUsage, setStorageUsage] = useState<{ used: number; free: number; total: number; usedPercent: number } | null>(null);

  async function refresh() {
    const response = await fetch("/api/erp", { cache: "no-store" });
    setSnapshot(await response.json());
    await refreshStorage();
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setError(null);
    setUploading(true);
    try {
      const response = await fetch("/api/documents/upload", { method: "POST", body: new FormData(form) });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to upload document." }));
        throw new Error(payload.error ?? "Unable to upload document.");
      }
      form.reset();
      setMessage("Document uploaded to storage and registered in PostgreSQL.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload document.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(path: string) {
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/storage?path=${encodeURIComponent(path)}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to delete document." }));
        throw new Error(payload.error ?? "Unable to delete document.");
      }
      setMessage("Document deleted.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete document.");
    }
  }

  async function refreshStorage(path = storagePath, q = storageQuery) {
    const response = await fetch(`/api/storage?path=${encodeURIComponent(path)}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setStorageEntries(payload.entries || []);
    setStorageUsage(payload.usage || null);
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mkdir", path: String(new FormData(form).get("folderPath") || "") }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to create folder." }));
      setError(payload.error);
      return;
    }
    form.reset();
    setMessage("Folder created.");
    await refreshStorage();
  }

  async function analyzeDocument(id: string, path: string) {
    setAnalysis(null);
    setError(null);
    setAnalyzingId(id);
    try {
      const response = await fetch(`/api/documents/analyze?id=${encodeURIComponent(id)}&path=${encodeURIComponent(path)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Unable to analyze document.");
        return;
      }
      setAnalysis(payload);
    } finally {
      setAnalyzingId(null);
    }
  }

  const rows = useMemo(() => {
    return (snapshot.documents ?? []).filter((document) => {
      const tenant = snapshot.tenants?.find((item) => item.id === document.tenant_id);
      const property = snapshot.properties?.find((item) => item.id === document.property_id);
      const landlord = snapshot.landlords?.find((item) => item.id === document.landlord_id);
      const haystack = `${document.title} ${document.category} ${document.file_path} ${document.original_file_name ?? ""} ${property?.address ?? ""} ${tenantName(tenant)} ${landlord?.name ?? ""}`.toLowerCase();
      return filter ? haystack.includes(filter.toLowerCase()) : true;
    });
  }, [filter, snapshot.documents, snapshot.landlords, snapshot.properties, snapshot.tenants]);

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <SectionCard title="Upload Document" subtitle="Files are written to the configured shared file root, then indexed in PostgreSQL">
        <form onSubmit={handleUpload} className="grid gap-3 lg:grid-cols-4">
          <input name="title" className="ui-input" placeholder="Document title" required />
          <select name="category" className="ui-input" defaultValue="Tenant">
            <option>Tenant</option><option>Property</option><option>Landlord</option><option>Compliance</option><option>Housing Benefit</option><option>Contract</option><option>Maintenance</option>
          </select>
          <select name="tenantId" className="ui-input"><option value="">Tenant link</option>{(snapshot.tenants ?? []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenantName(tenant)}</option>)}</select>
          <select name="propertyId" className="ui-input"><option value="">Property link</option>{(snapshot.properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}</select>
          <select name="landlordId" className="ui-input"><option value="">Landlord link</option>{(snapshot.landlords ?? []).map((landlord) => <option key={landlord.id} value={landlord.id}>{landlord.name}</option>)}</select>
          <input name="file" type="file" className="ui-input lg:col-span-2" required />
          <button disabled={uploading} className="button-primary gap-2"><Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload Document"}</button>
        </form>
        <p className="mt-4 text-sm text-slate-600">Shared root: {snapshot.agency?.shared_file_root || "local app storage until a shared server path is configured"}</p>
      </SectionCard>

      <SectionCard title="Documents" subtitle="Searchable document storage register">
        {storageUsage ? (
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Used</p><p className="mt-1 font-semibold text-slate-900">{Math.ceil(storageUsage.used / 1024 / 1024)} MB</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Free</p><p className="mt-1 font-semibold text-slate-900">{Math.ceil(storageUsage.free / 1024 / 1024)} MB</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Usage</p><p className="mt-1 font-semibold text-slate-900">{storageUsage.usedPercent}%</p></div>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <select className="ui-input" value={storagePath} onChange={(event) => { setStoragePath(event.target.value); void refreshStorage(event.target.value, storageQuery); }}>
            <option value="">All folders</option><option value="Tenant Documents">Tenant Documents</option><option value="Property Documents">Property Documents</option><option value="Landlord Documents">Landlord Documents</option><option value="Contracts">Contracts</option><option value="Compliance">Compliance</option><option value="Finance">Finance</option>
          </select>
          <input className="ui-input" placeholder="Filter by property, tenant, landlord, category, or file path" value={filter} onChange={(event) => { setFilter(event.target.value); setStorageQuery(event.target.value); }} />
          <button className="button-secondary gap-2" onClick={() => void refreshStorage(storagePath, storageQuery)}><Search className="h-4 w-4" /> Search</button>
        </div>
        <form onSubmit={createFolder} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input name="folderPath" className="ui-input" placeholder="Create folder, e.g. Compliance/Fire Safety" />
          <button className="button-secondary gap-2"><FolderPlus className="h-4 w-4" /> Create Folder</button>
        </form>
        {analysis ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{analysis.title}</p>
            <p className="mt-1">{analysis.summary} Size: {fileSize(String(analysis.size))}.</p>
            {analysis.preview ? <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs">{analysis.preview}</pre> : null}
          </div>
        ) : null}
        {storageEntries.length ? (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {storageEntries.slice(0, 12).map((entry) => (
              <div key={entry.path} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium text-slate-900">{entry.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{entry.path} | {entry.type}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-4 space-y-2">
          {rows.length ? rows.map((document) => {
            const property = snapshot.properties?.find((item) => item.id === document.property_id);
            const tenant = snapshot.tenants?.find((item) => item.id === document.tenant_id);
            const landlord = snapshot.landlords?.find((item) => item.id === document.landlord_id);
            const openPath = document.storage_key || document.file_path.split(/[\\/]/).slice(-3).join("/");

            return (
              <article key={document.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{document.title}</p>
                    <p className="mt-1 text-slate-500">{property?.address ?? "No property"} | {tenantName(tenant)} | {landlord?.name ?? "No landlord"} | {document.category}</p>
                    <p className="mt-1 text-xs text-slate-500">{document.original_file_name ?? "stored file"} | {document.mime_type ?? "unknown type"} | {fileSize(document.file_size)}</p>
                  </div>
                  <FileArchive className="h-4 w-4 text-slate-500" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="button-secondary px-4 py-2" onClick={() => void analyzeDocument(document.id, openPath)} disabled={analyzingId === document.id}>{analyzingId === document.id ? "Analyzing..." : "Analyze"}</button>
                  <a className="button-secondary px-4 py-2" href={`/api/storage/open?path=${encodeURIComponent(openPath)}`} target="_blank" rel="noreferrer">Open</a>
                  <a className="button-secondary px-4 py-2" href={`/api/storage/open?path=${encodeURIComponent(openPath)}`} download>Download</a>
                  <button type="button" className="button-secondary px-4 py-2 text-rose-700" onClick={() => void deleteDocument(openPath)}>Delete</button>
                </div>
                <p className="mt-2 break-all text-xs text-slate-500">{document.file_path}</p>
              </article>
            );
          }) : <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No documents have been uploaded yet.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
