import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { exportPmsCycleWorkbook } from "@/lib/pms-cycle-export";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "finance", "housing_officer", "readonly"]);
  if (auth.response) return auth.response;
  const { id } = await context.params;

  try {
    const exported = await exportPmsCycleWorkbook(id);
    return new NextResponse(exported.buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to export PMS snapshot." }, { status: 404 });
  }
}
