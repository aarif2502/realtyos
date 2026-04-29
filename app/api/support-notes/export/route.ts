import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured, query } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";

export const runtime = "nodejs";

function escapePdfText(value: unknown) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, " ");
}

function simplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 800 Td",
    ...lines.flatMap((line, index) => {
      const safe = escapePdfText(line).slice(0, 105);
      return index === 0 ? [`(${safe}) Tj`] : ["0 -16 Td", `(${safe}) Tj`];
    }),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "readonly"]);
  if (auth.response) return auth.response;
  const agencyId = await getAgencyId();
  if (!agencyId) return NextResponse.json({ error: "Managing Agent context is required." }, { status: 400 });
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");
  const propertyId = url.searchParams.get("propertyId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const params: unknown[] = [agencyId];
  const filters = ["sn.agency_id = $1"];
  if (tenantId) { params.push(tenantId); filters.push(`sn.tenant_id = $${params.length}`); }
  if (propertyId) { params.push(propertyId); filters.push(`sn.property_id = $${params.length}`); }
  if (from) { params.push(from); filters.push(`sn.week_start >= $${params.length}::date`); }
  if (to) { params.push(to); filters.push(`sn.week_start <= $${params.length}::date`); }
  const notes = await query<any>(
    `select sn.week_start, sn.period_end, sn.note, sn.outcomes, sn.next_actions, sn.risk_change,
            t.first_name, t.last_name, p.address, su.full_name as staff_name
     from support_notes sn
     join tenants t on t.id = sn.tenant_id and t.agency_id = sn.agency_id
     left join properties p on p.id = sn.property_id and p.agency_id = sn.agency_id
     left join staff_users su on su.id = sn.staff_id and su.agency_id = sn.agency_id
     where ${filters.join(" and ")}
     order by sn.week_start desc
     limit 120`,
    params,
  );
  const lines = [
    "Weekly Support Notes Export",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    `Records: ${notes.rows.length}`,
    "",
    ...notes.rows.flatMap((row) => [
      `${row.week_start?.toISOString?.().slice(0, 10) || row.week_start} - ${row.first_name} ${row.last_name} - ${row.address || "No property"}`,
      `Staff: ${row.staff_name || "Unassigned"} | Risk: ${row.risk_change || "none"}`,
      `Note: ${row.note || ""}`,
      row.outcomes ? `Outcomes: ${row.outcomes}` : "",
      row.next_actions ? `Next: ${row.next_actions}` : "",
      "",
    ]).filter(Boolean),
  ];
  return new Response(simplePdf(lines), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="support-notes-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
