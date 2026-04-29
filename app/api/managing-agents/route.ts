import { NextResponse } from "next/server";
import { requireStaffSession, switchStaffSessionAgency } from "@/lib/auth";
import { databaseConfigured, query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  const auth = await requireStaffSession();
  if (auth.response) return auth.response;

  if (auth.session?.role !== "platform_admin") {
    return NextResponse.json({
      currentAgencyId: auth.session?.agencyId,
      agents: [],
      canSwitch: false,
    });
  }

  const agents = await query(
    "select id, name, trading_name, contact_email, status from agencies where coalesce(status, 'active') = 'active' order by name",
  );

  return NextResponse.json({
    currentAgencyId: auth.session.agencyId,
    agents: agents.rows,
    canSwitch: true,
  });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  const auth = await requireStaffSession(["platform_admin"]);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const agencyId = String(body.agencyId || "");
  if (!agencyId) return NextResponse.json({ error: "Managing Agent is required." }, { status: 400 });

  const updated = await switchStaffSessionAgency(auth.session!.token, agencyId);
  if (!updated.rowCount) return NextResponse.json({ error: "Managing Agent was not found or is not active." }, { status: 404 });

  return NextResponse.json({ ok: true, agencyId });
}
