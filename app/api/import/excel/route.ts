import { NextResponse } from "next/server";
import { requireOwnerAdmin } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { confirmImport, createImportLog, getImportLog, importTargets, listImportLogs, parseWorkbook, validateImport } from "@/lib/excel-import";

export const runtime = "nodejs";

const maxUploadBytes = 8 * 1024 * 1024;

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireOwnerAdmin();
  if (auth.response) return auth.response;
  return NextResponse.json({ logs: await listImportLogs(), targets: importTargets });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireOwnerAdmin();
  if (auth.response) return auth.response;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose an Excel .xlsx file." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Only .xlsx files are supported." }, { status: 400 });
    }
    if (file.size > maxUploadBytes) {
      return NextResponse.json({ error: "File is too large. Maximum supported size is 8 MB." }, { status: 400 });
    }

    try {
      const parsed = parseWorkbook(Buffer.from(await file.arrayBuffer()));
      if (!parsed.sheets.length) {
        return NextResponse.json({ error: "No usable sheets or headers were detected." }, { status: 400 });
      }
      const log = await createImportLog({ filename: file.name, staffId: auth.session?.staffId, sheets: parsed.sheets, mapping: parsed.mapping });
      return NextResponse.json({ importId: log?.id, ...parsed, validation: validateImport(parsed.sheets, parsed.mapping) }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to parse workbook." }, { status: 400 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "validate");
  const importId = String(body.importId || "");
  if (!importId) return NextResponse.json({ error: "Import id is required." }, { status: 400 });
  const log = await getImportLog(importId);
  if (!log) return NextResponse.json({ error: "Import log not found." }, { status: 404 });

  const preview = log.preview as { sheets?: ReturnType<typeof parseWorkbook>["sheets"] };
  const sheets = preview.sheets || [];
  const mapping = body.mapping || log.mapping || {};

  if (action === "validate") {
    return NextResponse.json({ importId, validation: validateImport(sheets, mapping), sheets, mapping, targets: importTargets });
  }

  if (action === "confirm") {
    try {
      const result = await confirmImport(importId, sheets, mapping, auth.session!);
      return NextResponse.json({ importId, ...result });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import workbook." }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unsupported import action." }, { status: 400 });
}
