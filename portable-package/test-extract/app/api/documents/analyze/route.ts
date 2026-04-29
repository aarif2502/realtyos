import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured, first } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import { getStorageRoot, storageFileExists } from "@/lib/storage";

export const runtime = "nodejs";

function canPreview(name: string, mime?: string | null) {
  const lower = name.toLowerCase();
  return Boolean(mime?.startsWith("text/") || [".txt", ".csv", ".json", ".md", ".log"].some((ext) => lower.endsWith(ext)));
}

export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"]);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const filePath = url.searchParams.get("path") || "";
  if (!filePath) return NextResponse.json({ error: "File path is required." }, { status: 400 });

  const agencyId = await getAgencyId();
  const document = agencyId
    ? await first<{
        title: string;
        category: string;
        read_roles?: string[];
        mime_type?: string | null;
        original_file_name?: string | null;
        file_size?: string | null;
        created_at?: string;
      }>("select title, category, read_roles, mime_type, original_file_name, file_size, created_at from documents where agency_id = $1 and (storage_key = $2 or file_path like $3) limit 1", [agencyId, filePath, `%${filePath}`])
    : null;

  if (document?.read_roles?.length && !document.read_roles.includes(auth.session!.role)) {
    return NextResponse.json({ error: "You do not have permission to inspect this document." }, { status: 403 });
  }

  const root = await getStorageRoot();
  const { target, details } = await storageFileExists(root, filePath);
  const name = document?.original_file_name || filePath.split("/").pop() || "document";
  let preview = "";
  let summary = "Binary or office document. Open or download the file to review its full contents.";

  if (details.isFile() && canPreview(name, document?.mime_type)) {
    const raw = await readFile(target, "utf8");
    preview = raw.slice(0, 4000);
    const words = raw.trim().split(/\s+/).filter(Boolean).length;
    const lines = raw.split(/\r?\n/).length;
    summary = `Text-readable document with approximately ${words} words across ${lines} lines.`;
  }

  return NextResponse.json({
    title: document?.title || name,
    category: document?.category || "Unregistered file",
    name,
    path: filePath,
    size: Number(document?.file_size || details.size),
    modifiedAt: details.mtime.toISOString(),
    mimeType: document?.mime_type || "application/octet-stream",
    summary,
    preview,
  });
}
