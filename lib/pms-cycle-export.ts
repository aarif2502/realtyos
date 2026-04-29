import * as XLSX from "xlsx";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAgencyId } from "@/lib/erp-repository";
import { first, getPool, query } from "@/lib/db";
import type { AuthSession } from "@/lib/auth";
import { calculateHousingAssociationPaymentStatus } from "@/lib/payment-status";

const templatePath = join(process.cwd(), "New Tenant List Cycle 74.xlsx");
const templateSheet = "template";
const exportHeaders = [
  "PropertyAddress",
  "Room",
  "FirstName",
  "MiddleName",
  "LastName",
  "DateOfBirth",
  "NINumber",
  "CheckinDate",
  "CheckoutDate",
  "HBClaimRefNumber",
  "ReferralAgency",
  "Age",
  "Gender",
  "Religion",
  "Ethnicity",
  "Nationality",
  "Disability",
  "SexualOrientation",
  "SpokenLanguage",
  "RiskAssessment",
  "LengthOfStay",
  "RecordStatus",
] as const;

type SnapshotRow = Record<(typeof exportHeaders)[number], string | number | null>;

function dateForExcel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
}

function safe(value: unknown) {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function cyclePaymentDueDate(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function rowsForSnapshot(agencyId: string, housingAssociationId?: string | null) {
  const filters = ["t.agency_id = $1"];
  const params: unknown[] = [agencyId];
  if (housingAssociationId) {
    params.push(housingAssociationId);
    filters.push(`p.housing_association_id = $${params.length}`);
  }
  const result = await query<any>(
    `select t.*, p.address as property_address, r.room_label
     from tenants t
     left join properties p on p.id = t.property_id and p.agency_id = t.agency_id
     left join rooms r on r.id = t.room_id and r.agency_id = t.agency_id
     where ${filters.join(" and ")}
     order by p.address nulls last, r.room_label nulls last, t.last_name`,
    params,
  );

  return result.rows.map((row): SnapshotRow => ({
    PropertyAddress: safe(row.property_address),
    Room: safe(row.room_label),
    FirstName: safe(row.first_name),
    MiddleName: safe(row.middle_name),
    LastName: safe(row.last_name),
    DateOfBirth: dateForExcel(row.date_of_birth),
    NINumber: safe(row.ni_number),
    CheckinDate: dateForExcel(row.checkin_date),
    CheckoutDate: dateForExcel(row.checkout_date),
    HBClaimRefNumber: safe(row.hb_claim_ref_number),
    ReferralAgency: safe(row.referral_agency),
    Age: row.age ?? "",
    Gender: safe(row.gender),
    Religion: safe(row.religion),
    Ethnicity: safe(row.ethnicity),
    Nationality: safe(row.nationality),
    Disability: safe(row.disability),
    SexualOrientation: safe(row.sexual_orientation),
    SpokenLanguage: safe(row.spoken_language),
    RiskAssessment: safe(row.risk_assessment),
    LengthOfStay: safe(row.length_of_stay),
    RecordStatus: safe(row.template_record_status || row.record_status),
  }));
}

export async function createPmsCycleSnapshot(input: {
  housingAssociationId?: string | null;
  cycleListNumber: string;
  expectedAmount?: number;
  dueDate?: string | null;
  session: AuthSession;
}) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Managing Agent context is required.");
  const cycle = input.cycleListNumber.trim();
  if (!cycle) throw new Error("Cycle List Number is required.");

  if (input.housingAssociationId) {
    const ha = await first("select id from housing_associations where id = $1 and agency_id = $2 and status = 'active'", [input.housingAssociationId, agencyId]);
    if (!ha) throw new Error("Housing Association was not found for this Managing Agent.");
  }

  const rows = await rowsForSnapshot(agencyId, input.housingAssociationId || null);
  const propertyCount = new Set(rows.map((row) => String(row.PropertyAddress || ""))).size;
  const tenantCount = rows.length;
  const expected = Number(input.expectedAmount || 0);
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const snapshot = await client.query<{ id: string }>(
      `insert into pms_cycle_snapshots (
         agency_id, housing_association_id, cycle_list_number, created_by_user_id,
         row_count, property_count, tenant_count, total_expected_amount, snapshot_rows, summary
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       returning id`,
      [
        agencyId,
        input.housingAssociationId || null,
        cycle,
        input.session.staffId,
        rows.length,
        propertyCount,
        tenantCount,
        expected,
        JSON.stringify(rows),
        JSON.stringify({ template: "New Tenant List Cycle 74.xlsx", warning: rows.length ? null : "No PMS rows matched the selected filters." }),
      ],
    );
    const status = calculateHousingAssociationPaymentStatus({ expectedAmount: expected, dueDate: input.dueDate });
    await client.query(
      `insert into housing_association_payments (
         agency_id, housing_association_id, snapshot_id, cycle_list_number, expected_amount, payment_status, due_date, created_by_user_id, updated_by_user_id
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$8)
       on conflict (agency_id, housing_association_id, cycle_list_number)
       do update set snapshot_id = excluded.snapshot_id,
                     expected_amount = excluded.expected_amount,
                     payment_status = excluded.payment_status,
                     due_date = excluded.due_date,
                     updated_by_user_id = excluded.updated_by_user_id,
                     updated_at = now()`,
      [agencyId, input.housingAssociationId || null, snapshot.rows[0].id, cycle, expected, status, input.dueDate || cyclePaymentDueDate(), input.session.staffId],
    );
    await client.query("commit");
    return { id: snapshot.rows[0].id, rowCount: rows.length, propertyCount, tenantCount };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function exportPmsCycleWorkbook(snapshotId: string) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Managing Agent context is required.");
  const snapshot = await first<any>("select * from pms_cycle_snapshots where id = $1 and agency_id = $2", [snapshotId, agencyId]);
  if (!snapshot) throw new Error("Snapshot was not found for this Managing Agent.");

  const buffer = await readFile(templatePath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true });
  const sheet = workbook.Sheets[templateSheet] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Template workbook does not contain the export sheet.");

  const rows = Array.isArray(snapshot.snapshot_rows) ? snapshot.snapshot_rows : [];
  for (let r = 2; r <= 5000; r += 1) {
    for (let c = 0; c < exportHeaders.length; c += 1) {
      const cell = XLSX.utils.encode_cell({ r: r - 1, c });
      if (sheet[cell]) delete sheet[cell].v;
    }
  }

  rows.forEach((row: SnapshotRow, index: number) => {
    exportHeaders.forEach((header, colIndex) => {
      const cell = XLSX.utils.encode_cell({ r: index + 1, c: colIndex });
      const templateCell = sheet[XLSX.utils.encode_cell({ r: 1, c: colIndex })];
      sheet[cell] = { ...(templateCell || { t: "s" }), v: row[header] ?? "", t: typeof row[header] === "number" ? "n" : "s" };
    });
  });

  sheet["!ref"] = `A1:AG${Math.max(5000, rows.length + 1)}`;
  await query("update pms_cycle_snapshots set status = 'exported', updated_at = now() where id = $1 and agency_id = $2", [snapshotId, agencyId]);
  return {
    filename: `PMS_Cycle_${snapshot.cycle_list_number.replace(/[^A-Za-z0-9_-]/g, "_")}.xlsx`,
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx", cellStyles: true }),
  };
}
