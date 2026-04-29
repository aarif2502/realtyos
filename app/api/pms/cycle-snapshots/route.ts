import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured, query } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import { createPmsCycleSnapshot } from "@/lib/pms-cycle-export";

export const runtime = "nodejs";

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "finance", "housing_officer", "readonly"]);
  if (auth.response) return auth.response;
  const agencyId = await getAgencyId();
  if (!agencyId) return NextResponse.json({ error: "Managing Agent context is required." }, { status: 400 });

  const snapshots = await query("select * from pms_cycle_snapshots where agency_id = $1 order by snapshot_date desc limit 100", [agencyId]);
  return NextResponse.json({ snapshots: snapshots.rows });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "finance"]);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));

  try {
    const snapshot = await createPmsCycleSnapshot({
      housingAssociationId: body.housingAssociationId || null,
      cycleListNumber: String(body.cycleListNumber || ""),
      expectedAmount: Number(body.expectedAmount || 0),
      dueDate: body.dueDate || null,
      session: auth.session!,
    });
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create PMS snapshot." }, { status: 400 });
  }
}
