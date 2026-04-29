import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured, first } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";

export const runtime = "nodejs";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nextStatus(input: string | null, hasProperty: boolean, hasBand: boolean, hasStart: boolean, hasCharge: boolean, endDate: string | null) {
  if (input) return input;
  if (!hasProperty) return "needs_review";
  if (!hasBand || !hasStart || !hasCharge) return "missing_info";
  if (endDate && endDate < todayIso()) return "ended";
  return "active";
}

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireStaffSession(["admin", "manager", "housing_officer", "finance"]);
  if (auth.response) return auth.response;

  const agencyId = await getAgencyId();
  if (!agencyId) {
    return NextResponse.json({ error: "Managing Agent context is required." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const councilTaxRecordId = typeof body.councilTaxRecordId === "string" ? body.councilTaxRecordId : "";
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const manualNote = typeof body.manualNote === "string" ? body.manualNote.trim() : "";
  const overrideStatus = typeof body.status === "string" ? body.status.trim() : "";

  if (!councilTaxRecordId || !propertyId) {
    return NextResponse.json({ error: "councilTaxRecordId and propertyId are required." }, { status: 400 });
  }

  const property = await first<{ id: string; address: string }>(
    "select id, address from properties where id = $1 and agency_id = $2",
    [propertyId, agencyId],
  );
  if (!property) {
    return NextResponse.json({ error: "Property was not found for this Managing Agent." }, { status: 404 });
  }

  const current = await first<{
    id: string;
    band: string | null;
    liability_start_date: string | null;
    annual_charge: string | null;
    liability_end_date: string | null;
    metadata: Record<string, unknown> | null;
  }>(
    `select id, band, liability_start_date, annual_charge, liability_end_date, metadata
     from council_tax_records
     where id = $1 and agency_id = $2`,
    [councilTaxRecordId, agencyId],
  );
  if (!current) {
    return NextResponse.json({ error: "Council tax record was not found for this Managing Agent." }, { status: 404 });
  }

  const status = nextStatus(
    overrideStatus || null,
    true,
    Boolean(current.band),
    Boolean(current.liability_start_date),
    current.annual_charge !== null,
    current.liability_end_date,
  );
  const reviewReason = status === "active" ? null : "Manual match completed but required fields are still incomplete.";
  const mergedMetadata = {
    ...(current.metadata || {}),
    manualPropertyMatch: {
      matchedByStaffId: auth.session?.staffId ?? null,
      matchedAt: new Date().toISOString(),
      note: manualNote || null,
    },
  };

  const updated = await first(
    `update council_tax_records
     set property_id = $3,
         status = $4,
         needs_review_reason = $5,
         metadata = $6::jsonb,
         updated_at = now()
     where id = $1 and agency_id = $2
     returning *`,
    [councilTaxRecordId, agencyId, propertyId, status, reviewReason, JSON.stringify(mergedMetadata)],
  );

  return NextResponse.json(updated);
}
