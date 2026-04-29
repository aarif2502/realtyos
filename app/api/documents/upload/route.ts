import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { createDocument, getAgencyId } from "@/lib/erp-repository";
import { cleanStorageSegment, getStorageRoot, storageKeyFor, storagePath } from "@/lib/storage";

export const runtime = "nodejs";

function dateFolder() {
  return new Date().toISOString().slice(0, 10);
}

function rolesFrom(form: FormData, field: string, fallback: string[]) {
  const values = form.getAll(field).map(String).filter(Boolean);
  return values.length ? values : fallback;
}

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance"]);
  if (auth.response) {
    return auth.response;
  }

  const agencyId = await getAgencyId();
  if (!agencyId) {
    return NextResponse.json({ error: "Agency setup is required first." }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A document file is required." }, { status: 400 });
  }

  const title = String(form.get("title") || file.name);
  const category = cleanStorageSegment(String(form.get("category") || "General"));
  const root = await getStorageRoot();
  const storageKey = storageKeyFor([category, dateFolder(), `${Date.now()}-${file.name}`]);
  const filePath = storagePath(root, storageKey);
  const folder = filePath.slice(0, Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")));

  await mkdir(folder, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const document = await createDocument({
    title,
    category,
    filePath,
    tenantId: String(form.get("tenantId") || "") || undefined,
    propertyId: String(form.get("propertyId") || "") || undefined,
    landlordId: String(form.get("landlordId") || "") || undefined,
    originalFileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    uploadedBy: auth.session?.staffId,
    storageKey,
    visibility: String(form.get("visibility") || "staff"),
    readRoles: rolesFrom(form, "readRoles", ["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"]),
    writeRoles: rolesFrom(form, "writeRoles", ["admin", "manager"]),
    deleteRoles: rolesFrom(form, "deleteRoles", ["admin"]),
  });

  return NextResponse.json(document, { status: 201 });
}
