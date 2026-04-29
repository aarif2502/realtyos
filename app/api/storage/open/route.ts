import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured, first } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import { getStorageRoot, storageFileExists } from "@/lib/storage";

export const runtime = "nodejs";

function contentTypeFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === "txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"]);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const filePath = url.searchParams.get("path") || "";
  if (!filePath) {
    return NextResponse.json({ error: "File path is required." }, { status: 400 });
  }

  const agencyId = await getAgencyId();
  const document = agencyId
    ? await first<{ read_roles?: string[]; mime_type?: string | null; original_file_name?: string | null }>(
        "select read_roles, mime_type, original_file_name from documents where agency_id = $1 and (storage_key = $2 or file_path like $3) limit 1",
        [agencyId, filePath, `%${filePath}`],
      )
    : null;
  const certificate = agencyId
    ? await first<{ mime_type?: string | null; original_file_name?: string | null }>(
        "select mime_type, original_file_name from property_certificates where agency_id = $1 and (storage_key = $2 or file_path like $3) limit 1",
        [agencyId, filePath, `%${filePath}`],
      )
    : null;

  if (!document && !certificate) {
    return NextResponse.json({ error: "File record was not found for this Managing Agent." }, { status: 404 });
  }

  if (document?.read_roles?.length && !document.read_roles.includes(auth.session!.role)) {
    return NextResponse.json({ error: "You do not have permission to open this document." }, { status: 403 });
  }

  try {
    const root = await getStorageRoot();
    const { target, details } = await storageFileExists(root, filePath);
    if (!details.isFile()) {
      return NextResponse.json({ error: "The requested path is not a file." }, { status: 400 });
    }
    const body = await readFile(target);
    const contentType = document?.mime_type || certificate?.mime_type || contentTypeFor(target);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${(document?.original_file_name || certificate?.original_file_name || filePath.split("/").pop() || "document").replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to open file." }, { status: 404 });
  }
}
