import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { confirmTenantCycleImport, createTenantCycleImportLog, getTenantCycleCounts, parseTenantCycleWorkbook, resetPmsData } from "@/lib/tenant-cycle-import";

export const runtime = "nodejs";

const maxUploadBytes = 10 * 1024 * 1024;

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin"]);
  if (auth.response) return auth.response;
  return NextResponse.json({ counts: await getTenantCycleCounts() });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin"]);
  if (auth.response) return auth.response;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose the New Tenant List Cycle 74 .xlsx file." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Only .xlsx files are supported." }, { status: 400 });
    if (file.size > maxUploadBytes) return NextResponse.json({ error: "File is too large. Maximum supported size is 10 MB." }, { status: 400 });
    try {
      const parsed = parseTenantCycleWorkbook(Buffer.from(await file.arrayBuffer()), file.name);
      const log = await createTenantCycleImportLog({ filename: file.name, staffId: auth.session?.staffId, parsed });
      return NextResponse.json({ importId: log.id, blocked: log.blocked, ...parsed }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to parse tenant cycle workbook." }, { status: 400 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "reset") {
    try {
      const deleted = await resetPmsData(auth.session!, String(body.confirmation || ""));
      return NextResponse.json({ deleted });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reset PMS data." }, { status: 400 });
    }
  }

  if (action === "confirm") {
    const importId = String(body.importId || "");
    if (!importId) return NextResponse.json({ error: "Import id is required." }, { status: 400 });
    try {
      return NextResponse.json(await confirmTenantCycleImport(importId, auth.session!));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to confirm tenant cycle import." }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unsupported PMS cycle import action." }, { status: 400 });
}
