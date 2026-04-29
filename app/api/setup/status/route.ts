import { NextResponse } from "next/server";
import { requireOwnerAdmin } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { getSetupStatus } from "@/lib/setup-status";

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireOwnerAdmin();
  if (auth.response) return auth.response;

  return NextResponse.json(await getSetupStatus());
}
