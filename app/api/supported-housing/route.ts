import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { getSupportedHousingState } from "@/lib/supported-housing-store";

export async function GET() {
  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"]);
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(getSupportedHousingState());
}
