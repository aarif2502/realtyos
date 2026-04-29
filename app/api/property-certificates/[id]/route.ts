import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { calculateCertificateStatus } from "@/lib/certificate-status";
import { databaseConfigured, first } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  const auth = await requireStaffSession(["admin", "manager", "housing_officer"]);
  if (auth.response) return auth.response;

  const agencyId = await getAgencyId();
  if (!agencyId) return NextResponse.json({ error: "Agency setup is required first." }, { status: 400 });

  const { id } = await params;
  const input = await request.json().catch(() => ({}));
  const current = await first<{ file_path?: string | null; certificate_name?: string | null; expiry_date?: string | null }>(
    "select file_path, certificate_name, expiry_date from property_certificates where id = $1 and agency_id = $2",
    [id, agencyId],
  );
  if (!current) return NextResponse.json({ error: "Certificate was not found for this Managing Agent." }, { status: 404 });

  const status = calculateCertificateStatus({
    certificateName: input.certificateName || current.certificate_name,
    expiryDate: input.expiryDate || current.expiry_date,
    filePath: current.file_path,
  });

  const certificate = await first(
    `update property_certificates
     set certificate_type = coalesce($3, certificate_type),
         certificate_name = coalesce($4, certificate_name),
         certificate_number = $5,
         issuing_authority = $6,
         issue_date = $7,
         expiry_date = $8,
         notes = $9,
         status = $10,
         updated_by_user_id = $11,
         updated_at = now()
     where id = $1 and agency_id = $2
     returning *`,
    [
      id,
      agencyId,
      input.certificateType || null,
      input.certificateName || null,
      input.certificateNumber || null,
      input.issuingAuthority || null,
      input.issueDate || null,
      input.expiryDate || null,
      input.notes || null,
      status,
      auth.session?.staffId,
    ],
  );

  return NextResponse.json(certificate);
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  const auth = await requireStaffSession(["admin", "manager"]);
  if (auth.response) return auth.response;

  const agencyId = await getAgencyId();
  if (!agencyId) return NextResponse.json({ error: "Agency setup is required first." }, { status: 400 });

  const { id } = await params;
  const deleted = await first("delete from property_certificates where id = $1 and agency_id = $2 returning id", [id, agencyId]);
  if (!deleted) return NextResponse.json({ error: "Certificate was not found for this Managing Agent." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
