import * as XLSX from "xlsx";
import { getPool, query } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import type { AuthSession } from "@/lib/auth";
import { calculateRecordStatus, roomStatusFromRecordStatus } from "@/lib/record-status";

const expectedSheet = "template";
const expectedHeaders = [
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
];

export type TenantCycleRow = Record<string, string | number | null> & {
  rowNumber: number;
  recordStatusCalculated: string;
  statusReason: string;
};

function safeText(value: unknown) {
  const text = value == null ? "" : String(value).trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function excelDate(value: unknown) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = String(value).trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function normalizeRisk(value: unknown) {
  const risk = safeText(value).toUpperCase();
  return ["LOW", "MEDIUM", "HIGH"].includes(risk) ? risk : risk;
}

function normalizeNi(value: unknown) {
  return safeText(value).replace(/\s+/g, "").toUpperCase();
}

function normalizePayment(value: unknown) {
  const raw = safeText(value);
  const v = raw.toLowerCase();
  if (!raw) return "";
  if (v.includes("not paid") || v.includes("appeal") || v.includes("poi")) return "not_paid";
  if (v.includes("leaver")) return "leaver";
  if (v.includes("paid") || v === "ok") return "paid";
  if (v.includes("new claim")) return "new_claim";
  return raw;
}

export function parseTenantCycleWorkbook(buffer: Buffer, filename = "New Tenant List Cycle 74.xlsx") {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => name.toLowerCase() === expectedSheet) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("No worksheet was found.");

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  const headers = rawRows.length ? Object.keys(rawRows[0]).filter(Boolean) : [];
  const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header));
  const rows: TenantCycleRow[] = [];
  const errors: Array<{ row: number; field: string; message: string; severity: "error" | "warning" }> = [];

  rawRows.forEach((raw, index) => {
    const hasCoreData = expectedHeaders.some((header) => safeText(raw[header]));
    if (!hasCoreData) return;
    const rowNumber = index + 2;
    const input = {
      propertyAddress: safeText(raw.PropertyAddress).replace(/\s+/g, " ").toUpperCase(),
      roomLabel: safeText(raw.Room),
      firstName: safeText(raw.FirstName).toUpperCase(),
      middleName: safeText(raw.MiddleName).toUpperCase(),
      lastName: safeText(raw.LastName).toUpperCase(),
      dateOfBirth: excelDate(raw.DateOfBirth),
      niNumber: normalizeNi(raw.NINumber),
      checkinDate: excelDate(raw.CheckinDate),
      checkoutDate: excelDate(raw.CheckoutDate),
      hbClaimRefNumber: safeText(raw.HBClaimRefNumber),
      referralAgency: safeText(raw.ReferralAgency).toUpperCase(),
      age: safeText(raw.Age),
      gender: safeText(raw.Gender).toUpperCase(),
      religion: safeText(raw.Religion).toUpperCase(),
      ethnicity: safeText(raw.Ethnicity).toUpperCase(),
      nationality: safeText(raw.Nationality).toUpperCase(),
      disability: safeText(raw.Disability).toUpperCase(),
      sexualOrientation: safeText(raw.SexualOrientation).toUpperCase(),
      spokenLanguage: safeText(raw.SpokenLanguage).toUpperCase(),
      riskAssessment: normalizeRisk(raw.RiskAssessment),
      lengthOfStay: safeText(raw.LengthOfStay).toUpperCase(),
      templateRecordStatus: safeText(raw.RecordStatus),
      paymentStatus: normalizePayment(raw.__EMPTY),
    };
    const status = calculateRecordStatus(input);
    const required: Array<[keyof typeof input, string]> = [
      ["propertyAddress", "PropertyAddress"],
      ["roomLabel", "Room"],
      ["firstName", "FirstName"],
      ["lastName", "LastName"],
      ["hbClaimRefNumber", "HBClaimRefNumber"],
      ["gender", "Gender"],
    ];
    for (const [field, header] of required) {
      if (!input[field]) errors.push({ row: rowNumber, field: header, message: `${header} is required.`, severity: "error" });
    }
    if (input.niNumber && !/^[A-Z]{2}[0-9]{6}[A-Z]$/.test(input.niNumber)) {
      errors.push({ row: rowNumber, field: "NINumber", message: "NI number should be two letters, six digits, and one suffix letter.", severity: "warning" });
    }
    if (status.status === "needs_review") {
      errors.push({ row: rowNumber, field: "RecordStatus", message: status.reason, severity: "warning" });
    }
    rows.push({ ...input, rowNumber, recordStatusCalculated: status.status, statusReason: status.reason });
  });

  if (missingHeaders.length) {
    for (const header of missingHeaders) errors.unshift({ row: 1, field: header, message: `Expected template header ${header} is missing.`, severity: "error" });
  }

  const propertyCount = new Set(rows.map((row) => String(row.propertyAddress))).size;
  const tenantCount = rows.length;
  const occupancyCount = rows.filter((row) => row.propertyAddress && row.roomLabel).length;
  return {
    filename,
    sheetName,
    headers,
    expectedHeaders,
    missingHeaders,
    rows,
    preview: rows.slice(0, 20),
    errors,
    summary: { propertyCount, tenantCount, occupancyCount, errorCount: errors.filter((e) => e.severity === "error").length, warningCount: errors.filter((e) => e.severity === "warning").length },
  };
}

export async function createTenantCycleImportLog(input: { filename: string; staffId?: string; parsed: ReturnType<typeof parseTenantCycleWorkbook> }) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  const errorCount = input.parsed.errors.filter((error) => error.severity === "error").length;
  const log = await query<{ id: string }>(
    `insert into import_logs (agency_id, uploaded_by, filename, target_modules, sheet_count, rows_parsed, validation_errors, status, action_type, mapping, preview, error_summary)
     values ($1,$2,$3,array['pms_cycle_template'],1,$4,$5,'parsed','pms_cycle_import',$6,$7,$8) returning id`,
    [
      agencyId,
      input.staffId || null,
      input.filename,
      input.parsed.rows.length,
      input.parsed.errors.length,
      JSON.stringify({ template: "New Tenant List Cycle 74.xlsx", headers: input.parsed.headers }),
      JSON.stringify(input.parsed),
      input.parsed.errors.length ? `${input.parsed.errors.length} validation warning/error(s) found.` : null,
    ],
  );
  const importId = log.rows[0]?.id;
  if (importId) {
    for (const error of input.parsed.errors.slice(0, 300)) {
      await query(
        "insert into import_row_errors (agency_id, import_log_id, row_number, severity, field_name, message) values ($1,$2,$3,$4,$5,$6)",
        [agencyId, importId, error.row, error.severity, error.field, error.message],
      );
    }
  }
  return { id: importId, blocked: errorCount > 0 };
}

export async function getTenantCycleCounts() {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  const result = await query<{
    properties: string;
    rooms: string;
    tenants: string;
    occupancy_records: string;
  }>(
    `select
      (select count(*) from properties where agency_id = $1)::text as properties,
      (select count(*) from rooms where agency_id = $1)::text as rooms,
      (select count(*) from tenants where agency_id = $1)::text as tenants,
      (select count(*) from occupancy_records where agency_id = $1)::text as occupancy_records`,
    [agencyId],
  );
  return result.rows[0];
}

export async function resetPmsData(session: AuthSession, confirmation: string) {
  if (confirmation !== "DELETE PMS DATA") throw new Error("Confirmation phrase must be DELETE PMS DATA.");
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const counts = await getTenantCycleCounts();
    await client.query("delete from support_notes where agency_id = $1", [agencyId]);
    await client.query("delete from housing_benefit_claims where agency_id = $1", [agencyId]);
    await client.query("delete from tenancy_contracts where agency_id = $1", [agencyId]);
    await client.query("delete from payment_ledger_entries where agency_id = $1 and (tenant_id is not null or property_id is not null)", [agencyId]);
    await client.query("delete from occupancy_records where agency_id = $1", [agencyId]);
    await client.query("delete from tenants where agency_id = $1", [agencyId]);
    await client.query("delete from rooms where agency_id = $1", [agencyId]);
    await client.query("delete from properties where agency_id = $1", [agencyId]);
    await client.query(
      "insert into pms_reset_logs (agency_id, reset_by, properties_deleted, rooms_deleted, tenants_deleted, occupancy_records_deleted, confirmation_text) values ($1,$2,$3,$4,$5,$6,$7)",
      [agencyId, session.staffId, Number(counts.properties), Number(counts.rooms), Number(counts.tenants), Number(counts.occupancy_records), confirmation],
    );
    await client.query(
      "insert into import_logs (agency_id, uploaded_by, filename, target_modules, action_type, status, rows_skipped, error_summary) values ($1,$2,'PMS fresh start',array['properties','rooms','tenants','occupancy'],'pms_reset','imported',$3,$4)",
      [agencyId, session.staffId, Number(counts.properties) + Number(counts.rooms) + Number(counts.tenants) + Number(counts.occupancy_records), "PMS records reset by owner-admin confirmation."],
    );
    await client.query("commit");
    return counts;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmTenantCycleImport(importId: string, session: AuthSession) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  const log = await query<{ preview: any }>("select preview from import_logs where id = $1 and agency_id = $2", [importId, agencyId]);
  const parsed = log.rows[0]?.preview as ReturnType<typeof parseTenantCycleWorkbook> | undefined;
  if (!parsed?.rows?.length) throw new Error("Import preview was not found.");
  const blocking = (parsed.errors || []).filter((error) => error.severity === "error");
  if (blocking.length) throw new Error("Fix blocking validation errors before confirming import.");

  const client = await getPool().connect();
  let propertyCount = 0;
  let tenantCount = 0;
  let occupancyCount = 0;
  let skipped = 0;
  try {
    await client.query("begin");
    for (const row of parsed.rows) {
      const prop = await client.query<{ id: string }>(
        `insert into properties (agency_id, address, total_rooms, metadata)
         values ($1,$2,0,$3)
         on conflict (agency_id, address) do update set updated_at = now()
         returning id`,
        [agencyId, row.propertyAddress, JSON.stringify({ sourceTemplate: parsed.filename })],
      );
      propertyCount += prop.rowCount ? 1 : 0;
      const propertyId = prop.rows[0].id;
      const room = await client.query<{ id: string }>(
        `insert into rooms (agency_id, property_id, room_label, status, metadata)
         values ($1,$2,$3,$4,$5)
         on conflict (property_id, room_label) do update set status = excluded.status
         returning id`,
        [agencyId, propertyId, row.roomLabel, roomStatusFromRecordStatus(row.recordStatusCalculated as any), JSON.stringify({ sourceTemplate: parsed.filename })],
      );
      const roomId = room.rows[0].id;
      await client.query("update properties set total_rooms = greatest(total_rooms, (select count(*) from rooms where property_id = $1)) where id = $1", [propertyId]);
      const duplicate = row.niNumber
        ? await client.query("select id from tenants where agency_id = $1 and ni_number = $2 limit 1", [agencyId, row.niNumber])
        : await client.query("select id from tenants where agency_id = $1 and property_id = $2 and room_id = $3 and lower(first_name)=lower($4) and lower(last_name)=lower($5) limit 1", [agencyId, propertyId, roomId, row.firstName, row.lastName]);
      if (duplicate.rowCount) { skipped += 1; continue; }
      const tenant = await client.query<{ id: string }>(
        `insert into tenants (
          agency_id, property_id, room_id, first_name, middle_name, last_name, date_of_birth, ni_number,
          checkin_date, checkout_date, hb_claim_ref_number, referral_agency, age, gender, religion, ethnicity,
          nationality, disability, sexual_orientation, spoken_language, risk_assessment, length_of_stay,
          record_status, template_record_status, payment_status, status_reason, metadata, source_import_log_id
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) returning id`,
        [
          agencyId, propertyId, roomId, row.firstName, row.middleName || null, row.lastName, row.dateOfBirth || null, row.niNumber || null,
          row.checkinDate || null, row.checkoutDate || null, row.hbClaimRefNumber || null, row.referralAgency || null, row.age ? Number(row.age) : null, row.gender || null,
          row.religion || null, row.ethnicity || null, row.nationality || null, row.disability || null, row.sexualOrientation || null, row.spokenLanguage || null,
          ["LOW", "MEDIUM", "HIGH"].includes(String(row.riskAssessment)) ? row.riskAssessment : null, row.lengthOfStay || null,
          row.recordStatusCalculated, row.templateRecordStatus || null, row.paymentStatus || null, row.statusReason || null,
          JSON.stringify({ sourceRowNumber: row.rowNumber }), importId,
        ],
      );
      tenantCount += 1;
      await client.query(
        `insert into occupancy_records (agency_id, property_id, room_id, tenant_id, room_label, checkin_date, checkout_date, record_status, status_reason, source_file, source_row_number, metadata)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         on conflict (agency_id, property_id, room_label, tenant_id) do nothing`,
        [agencyId, propertyId, roomId, tenant.rows[0].id, row.roomLabel, row.checkinDate || null, row.checkoutDate || null, row.recordStatusCalculated, row.statusReason, parsed.filename, row.rowNumber, JSON.stringify({ paymentStatus: row.paymentStatus, templateRecordStatus: row.templateRecordStatus })],
      );
      occupancyCount += 1;
    }
    await client.query(
      "update import_logs set status = 'imported', rows_imported = $3, rows_skipped = $4, validation_errors = $5, updated_at = now() where id = $1 and agency_id = $2",
      [importId, agencyId, tenantCount + occupancyCount, skipped, (parsed.errors || []).length],
    );
    await client.query("commit");
    return { propertyCount, tenantCount, occupancyCount, skipped, warnings: (parsed.errors || []).filter((e) => e.severity === "warning").length };
  } catch (error) {
    await client.query("rollback");
    await query("update import_logs set status = 'failed', error_summary = $3, updated_at = now() where id = $1 and agency_id = $2", [importId, agencyId, error instanceof Error ? error.message : "Import failed."]);
    throw error;
  } finally {
    client.release();
  }
}
