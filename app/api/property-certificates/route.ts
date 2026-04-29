import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { calculateCertificateStatus } from "@/lib/certificate-status";
import { databaseConfigured, first, query } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import { cleanStorageSegment, getStorageRoot, storageKeyFor, storagePath } from "@/lib/storage";

export const runtime = "nodejs";

const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const maxUploadBytes = 10 * 1024 * 1024;

function dateFolder() {
  return new Date().toISOString().slice(0, 10);
}

function value(form: FormData, key: string) {
  const item = form.get(key);
  return typeof item === "string" && item.trim() ? item.trim() : null;
}

export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  const auth = await requireStaffSession(["admin", "manager", "housing_officer", "support_worker", "finance", "readonly"]);
  if (auth.response) return auth.response;

  const agencyId = await getAgencyId();
  if (!agencyId) return NextResponse.json({ error: "Agency setup is required first." }, { status: 400 });

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  const status = url.searchParams.get("status");

  const filters = ["agency_id = $1"];
  const params: unknown[] = [agencyId];
  if (propertyId) {
    params.push(propertyId);
    filters.push(`property_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    filters.push(`status = $${params.length}`);
  }

  const certificates = await query(
    `select * from property_certificates
     where ${filters.join(" and ")}
     order by expiry_date asc nulls first, created_at desc`,
    params,
  );

  return NextResponse.json({ certificates: certificates.rows });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  const auth = await requireStaffSession(["admin", "manager", "housing_officer"]);
  if (auth.response) return auth.response;

  const agencyId = await getAgencyId();
  if (!agencyId) return NextResponse.json({ error: "Agency setup is required first." }, { status: 400 });

  const form = await request.formData();
  const propertyId = value(form, "propertyId");
  if (!propertyId) return NextResponse.json({ error: "Property is required." }, { status: 400 });

  const property = await first<{ id: string; address: string }>("select id, address from properties where id = $1 and agency_id = $2", [propertyId, agencyId]);
  if (!property) return NextResponse.json({ error: "Property was not found for this Managing Agent." }, { status: 404 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A certificate file is required." }, { status: 400 });
  }
  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: "Certificate file is too large. Maximum supported size is 10 MB." }, { status: 400 });
  }
  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: "Only PDF, PNG, JPG or WEBP certificate files are supported." }, { status: 400 });
  }

  const certificateName = value(form, "certificateName") || file.name;
  const certificateType = value(form, "certificateType") || "Other";
  const root = await getStorageRoot();
  const storageKey = storageKeyFor(["Property Certificates", property.address, dateFolder(), `${Date.now()}-${file.name}`]);
  const filePath = storagePath(root, storageKey);
  const folder = filePath.slice(0, Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")));

  await mkdir(folder, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const status = calculateCertificateStatus({
    certificateName,
    expiryDate: value(form, "expiryDate"),
    filePath,
  });

  const certificate = await first(
    `insert into property_certificates (
       agency_id, property_id, certificate_type, certificate_name, certificate_number,
       issuing_authority, issue_date, expiry_date, status, file_path, storage_key,
       original_file_name, mime_type, file_size, notes, created_by_user_id, updated_by_user_id
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)
     returning *`,
    [
      agencyId,
      propertyId,
      cleanStorageSegment(certificateType),
      certificateName,
      value(form, "certificateNumber"),
      value(form, "issuingAuthority"),
      value(form, "issueDate"),
      value(form, "expiryDate"),
      status,
      filePath,
      storageKey,
      file.name,
      file.type,
      file.size,
      value(form, "notes"),
      auth.session?.staffId,
    ],
  );

  return NextResponse.json(certificate, { status: 201 });
}
