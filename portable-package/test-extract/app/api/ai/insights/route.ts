import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { getErpSnapshot } from "@/lib/erp-repository";
import { ruleBasedInsights } from "@/lib/reporting";

export const runtime = "nodejs";

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "housing_officer", "support_worker", "finance", "readonly"]);
  if (auth.response) return auth.response;
  const snapshot = await getErpSnapshot();
  return NextResponse.json({
    mode: "free-rule-based",
    source: "PostgreSQL operational data",
    insights: ruleBasedInsights(snapshot),
    templates: [
      "New referral -> create screening task",
      "Missed rent / arrears -> create finance review task",
      "High risk tenant -> review support plan",
      "Void room -> match against approved referrals",
      "Open maintenance -> assign owner and follow-up reminder",
    ],
  });
}
