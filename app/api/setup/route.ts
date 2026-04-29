import { NextResponse } from "next/server";
import { requireOwnerAdmin } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { getBootstrapStatus, setupAgency } from "@/lib/erp-repository";

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ databaseConfigured: false, hasAgency: false, hasStaff: false });
  }

  const auth = await requireOwnerAdmin();
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ databaseConfigured: true, ...(await getBootstrapStatus()) });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireOwnerAdmin();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const agency = await setupAgency(body);
    return NextResponse.json({ agency }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete setup." }, { status: 400 });
  }
}
