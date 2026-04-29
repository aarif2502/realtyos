import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { getErpSnapshot } from "@/lib/erp-repository";

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json(
      {
        error: "DATABASE_URL is not configured.",
        setupRequired: true,
        databaseConfigured: false,
      },
      { status: 503 },
    );
  }

  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"]);
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(await getErpSnapshot());
}
