import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { getErpSnapshot } from "@/lib/erp-repository";
import { buildCube, ruleBasedInsights, type CubeDimension, type CubeMetric } from "@/lib/reporting";

export const runtime = "nodejs";

const metrics = new Set(["occupancy", "arrears", "rent", "risk", "referrals", "support", "maintenance"]);
const dimensions = new Set(["property", "localAuthority", "risk", "status", "month"]);

export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "housing_officer", "finance", "readonly"]);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const metric = (url.searchParams.get("metric") || "occupancy") as CubeMetric;
  const dimension = (url.searchParams.get("dimension") || "property") as CubeDimension;
  if (!metrics.has(metric) || !dimensions.has(dimension)) return NextResponse.json({ error: "Unsupported cube metric or dimension." }, { status: 400 });

  const snapshot = await getErpSnapshot();
  return NextResponse.json({
    metric,
    dimension,
    rows: buildCube(snapshot, metric, dimension),
    insights: ruleBasedInsights(snapshot),
  });
}
