import * as XLSX from "xlsx";
import { first, getPool, query } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import type { AuthSession } from "@/lib/auth";

type Target = "crmPartners" | "referrals" | "properties" | "tenants" | "ledger";
type SheetMapping = { target: Target; columns: Record<string, string> };
type Mapping = Record<string, SheetMapping>;
type ParsedSheet = {
  name: string;
  suggestedTarget: Target;
  headers: string[];
  rows: Record<string, unknown>[];
  preview: Record<string, unknown>[];
  suggestedMapping: SheetMapping;
};

const maxRowsPerSheet = 1000;

const targets: Record<Target, { label: string; required: string[]; fields: Record<string, string[]> }> = {
  crmPartners: {
    label: "CRM Contacts / Accounts",
    required: ["organisationName"],
    fields: {
      organisationName: ["organisation", "organization", "company", "account", "account name", "client", "customer", "partner", "council"],
      contactName: ["contact", "contact name", "main contact", "name", "person"],
      email: ["email", "email address", "contact email"],
      phone: ["phone", "telephone", "mobile", "contact number"],
      type: ["type", "partner type", "category"],
      notes: ["notes", "description", "comments"],
    },
  },
  referrals: {
    label: "CRM Leads / Referrals",
    required: ["applicantName"],
    fields: {
      applicantName: ["applicant", "applicant name", "lead", "lead name", "tenant", "client name", "name"],
      source: ["source", "referral source", "referrer"],
      status: ["status", "lead status", "stage", "pipeline stage"],
      priority: ["priority", "urgency"],
      supportNeeds: ["support needs", "needs", "requirements", "risk", "risk notes"],
      notes: ["notes", "comments"],
      targetMoveIn: ["target move in", "move in", "move-in date", "target date"],
    },
  },
  properties: {
    label: "PMS Properties / Units",
    required: ["address"],
    fields: {
      address: ["address", "property", "property address", "site", "building"],
      postcode: ["postcode", "post code", "zip"],
      localAuthority: ["local authority", "council", "borough"],
      totalRooms: ["rooms", "total rooms", "units", "bedrooms", "capacity"],
      landlordName: ["landlord", "owner", "provider"],
      weeklyRent: ["weekly rent", "rent", "eligible rent", "room rate"],
    },
  },
  tenants: {
    label: "PMS Tenants / Residents",
    required: ["firstName", "lastName"],
    fields: {
      firstName: ["first name", "firstname", "forename"],
      middleName: ["middle name"],
      lastName: ["last name", "lastname", "surname"],
      propertyAddress: ["property", "property address", "address"],
      dateOfBirth: ["date of birth", "dob", "birth date"],
      niNumber: ["ni", "ni number", "national insurance"],
      checkinDate: ["checkin", "check-in", "move in", "start date"],
      checkoutDate: ["checkout", "check-out", "move out", "end date"],
      referralAgency: ["referral agency", "referrer", "source"],
      riskAssessment: ["risk", "risk assessment", "risk level"],
      gender: ["gender"],
    },
  },
  ledger: {
    label: "Overview / Reporting Ledger",
    required: ["description"],
    fields: {
      entryDate: ["date", "entry date", "payment date", "transaction date"],
      type: ["type", "transaction type", "payment type"],
      description: ["description", "narrative", "details", "reference"],
      debit: ["debit", "charge", "rent due", "amount due", "cost"],
      credit: ["credit", "payment", "rent paid", "amount paid", "income", "revenue"],
      status: ["status"],
      reference: ["reference", "ref", "transaction id"],
    },
  },
};

function normal(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function safeText(value: unknown) {
  const text = value == null ? "" : String(value).trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function inferTarget(sheetName: string, headers: string[]): Target {
  const haystack = `${sheetName} ${headers.join(" ")}`.toLowerCase();
  if (/(contact|customer|client|account|partner|council|referrer)/.test(haystack)) return "crmPartners";
  if (/(lead|referral|pipeline|applicant)/.test(haystack)) return "referrals";
  if (/(tenant|resident|service user)/.test(haystack)) return "tenants";
  if (/(property|unit|room|asset|building|maintenance)/.test(haystack)) return "properties";
  if (/(payment|rent|ledger|transaction|revenue|cost|kpi|metric|finance|sales)/.test(haystack)) return "ledger";
  return "crmPartners";
}

function suggestMapping(target: Target, headers: string[]): SheetMapping {
  const lookup = new Map(headers.map((header) => [normal(header), header]));
  const columns: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(targets[target].fields)) {
    const match = aliases.map(normal).find((alias) => lookup.has(alias)) || aliases.map(normal).find((alias) => headers.some((header) => normal(header).includes(alias)));
    if (match) {
      columns[field] = lookup.get(match) || headers.find((header) => normal(header).includes(match)) || "";
    }
  }
  return { target, columns };
}

function value(row: Record<string, unknown>, header?: string) {
  return header ? safeText(row[header]) : "";
}

function normalizeStatus(target: Target, field: string, raw: string) {
  const v = normal(raw);
  if (!v) return "";
  if (target === "referrals" && field === "status") {
    if (/(screen|review)/.test(v)) return "screening";
    if (/(approve|accepted)/.test(v)) return "approved";
    if (/(wait)/.test(v)) return "waitlist";
    if (/(convert|moved|tenant)/.test(v)) return "converted";
    if (/(reject|decline)/.test(v)) return "rejected";
    return "new";
  }
  if (target === "referrals" && field === "priority") {
    if (/(urgent|high)/.test(v)) return "urgent";
    if (/(low)/.test(v)) return "low";
    return "normal";
  }
  if (target === "ledger" && field === "type") {
    if (/(benefit|hb|uc)/.test(v)) return "housing_benefit";
    if (/(payment|paid|receipt)/.test(v)) return "tenant_payment";
    if (/(arrears)/.test(v)) return "arrears";
    if (/(adjust)/.test(v)) return "adjustment";
    return "rent_charge";
  }
  return raw;
}

export function parseWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheets: ParsedSheet[] = workbook.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], { defval: "", raw: false }).slice(0, maxRowsPerSheet);
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const suggestedTarget = inferTarget(name, headers);
    return {
      name,
      suggestedTarget,
      headers,
      rows,
      preview: rows.slice(0, 10),
      suggestedMapping: suggestMapping(suggestedTarget, headers),
    };
  }).filter((sheet) => sheet.headers.length);

  const mapping = Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet.suggestedMapping])) as Mapping;
  return { sheets, mapping };
}

export function validateImport(sheets: ParsedSheet[], mapping: Mapping) {
  const errors: Array<{ sheet: string; row: number; field: string; message: string }> = [];
  let validRows = 0;

  for (const sheet of sheets) {
    const map = mapping[sheet.name] || sheet.suggestedMapping;
    const required = targets[map.target].required;
    sheet.rows.forEach((row, index) => {
      const missing = required.filter((field) => !value(row, map.columns[field]));
      if (missing.length) {
        for (const field of missing) errors.push({ sheet: sheet.name, row: index + 2, field, message: `${field} is required.` });
      } else {
        validRows += 1;
      }
    });
  }

  return { errors, validRows };
}

export async function createImportLog(input: { filename: string; staffId?: string; sheets: ParsedSheet[]; mapping: Mapping }) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  const validation = validateImport(input.sheets, input.mapping);
  const targetModules = [...new Set(Object.values(input.mapping).map((item) => item.target))];
  const preview = { sheets: input.sheets };

  return first<{ id: string }>(
    `insert into import_logs (
      agency_id, uploaded_by, filename, target_modules, sheet_count, rows_parsed,
      validation_errors, status, mapping, preview, error_summary
    )
    values ($1,$2,$3,$4,$5,$6,$7,'parsed',$8,$9,$10)
    returning id`,
    [
      agencyId,
      input.staffId || null,
      input.filename,
      targetModules,
      input.sheets.length,
      input.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0),
      validation.errors.length,
      JSON.stringify(input.mapping),
      JSON.stringify({ ...preview, errors: validation.errors.slice(0, 200), validRows: validation.validRows }),
      validation.errors.length ? `${validation.errors.length} validation issue(s) found.` : null,
    ],
  );
}

export async function getImportLog(id: string) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first<Record<string, unknown>>("select * from import_logs where id = $1 and agency_id = $2", [id, agencyId]);
}

export async function listImportLogs() {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  const result = await query("select id, filename, target_modules, sheet_count, rows_parsed, rows_imported, rows_skipped, validation_errors, status, error_summary, created_at, updated_at from import_logs where agency_id = $1 order by created_at desc limit 25", [agencyId]);
  return result.rows;
}

function rowInput(row: Record<string, unknown>, map: SheetMapping) {
  const output: Record<string, string> = {};
  for (const field of Object.keys(targets[map.target].fields)) {
    output[field] = normalizeStatus(map.target, field, value(row, map.columns[field]));
  }
  return output;
}

export async function confirmImport(id: string, sheets: ParsedSheet[], mapping: Mapping, session: AuthSession) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  const validation = validateImport(sheets, mapping);
  if (validation.errors.length) {
    await query("update import_logs set status = 'failed', validation_errors = $3, error_summary = $4, updated_at = now() where id = $1 and agency_id = $2", [id, agencyId, validation.errors.length, `${validation.errors.length} validation issue(s) must be fixed before import.`]);
    return { imported: 0, skipped: 0, errors: validation.errors };
  }

  const client = await getPool().connect();
  let imported = 0;
  let skipped = 0;
  try {
    await client.query("begin");
    for (const sheet of sheets) {
      const map = mapping[sheet.name] || sheet.suggestedMapping;
      for (const row of sheet.rows) {
        const input = rowInput(row, map);
        if (map.target === "crmPartners") {
          const existing = await client.query("select id from crm_partners where agency_id = $1 and lower(organisation_name) = lower($2) limit 1", [agencyId, input.organisationName]);
          if (existing.rowCount) { skipped += 1; continue; }
          await client.query(
            "insert into crm_partners (agency_id, type, organisation_name, contact_name, email, phone, notes) values ($1,$2,$3,$4,lower($5),$6,$7)",
            [agencyId, input.type || "referrer", input.organisationName, input.contactName || null, input.email || null, input.phone || null, input.notes || null],
          );
        }
        if (map.target === "referrals") {
          const existing = await client.query("select id from referrals where agency_id = $1 and lower(applicant_name) = lower($2) limit 1", [agencyId, input.applicantName]);
          if (existing.rowCount) { skipped += 1; continue; }
          await client.query(
            "insert into referrals (agency_id, applicant_name, source, status, priority, support_needs, notes, target_move_in) values ($1,$2,$3,$4,$5,$6,$7,$8)",
            [agencyId, input.applicantName, input.source || null, input.status || "new", input.priority || "normal", input.supportNeeds || null, input.notes || null, input.targetMoveIn || null],
          );
        }
        if (map.target === "properties") {
          const result = await client.query(
            `insert into properties (agency_id, address, postcode, local_authority, total_rooms, metadata)
             values ($1,$2,$3,$4,$5,$6)
             on conflict (agency_id, address) do nothing returning id`,
            [agencyId, input.address, input.postcode || null, input.localAuthority || null, Number(input.totalRooms || 0), JSON.stringify({ importedLandlordName: input.landlordName || null, importedBy: session.email })],
          );
          if (!result.rowCount) { skipped += 1; continue; }
        }
        if (map.target === "tenants") {
          const duplicate = input.niNumber
            ? await client.query("select id from tenants where agency_id = $1 and ni_number = $2 limit 1", [agencyId, input.niNumber])
            : await client.query("select id from tenants where agency_id = $1 and lower(first_name) = lower($2) and lower(last_name) = lower($3) limit 1", [agencyId, input.firstName, input.lastName]);
          if (duplicate.rowCount) { skipped += 1; continue; }
          const property = input.propertyAddress ? await client.query("select id from properties where agency_id = $1 and lower(address) = lower($2) limit 1", [agencyId, input.propertyAddress]) : null;
          await client.query(
            `insert into tenants (agency_id, property_id, first_name, middle_name, last_name, date_of_birth, ni_number, checkin_date, checkout_date, referral_agency, gender, risk_assessment)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [agencyId, property?.rows[0]?.id || null, input.firstName, input.middleName || null, input.lastName, input.dateOfBirth || null, input.niNumber || null, input.checkinDate || null, input.checkoutDate || null, input.referralAgency || null, input.gender || null, ["LOW", "MEDIUM", "HIGH"].includes(input.riskAssessment) ? input.riskAssessment : null],
          );
        }
        if (map.target === "ledger") {
          await client.query(
            `insert into payment_ledger_entries (agency_id, entry_date, type, description, debit, credit, status, reference)
             values ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [agencyId, input.entryDate || new Date().toISOString().slice(0, 10), input.type || "rent_charge", input.description, Number(input.debit || 0), Number(input.credit || 0), input.status || "posted", input.reference || null],
          );
        }
        imported += 1;
      }
    }
    await client.query(
      "update import_logs set status = 'imported', rows_imported = $3, rows_skipped = $4, validation_errors = 0, mapping = $5, updated_at = now() where id = $1 and agency_id = $2",
      [id, agencyId, imported, skipped, JSON.stringify(mapping)],
    );
    await client.query("commit");
    return { imported, skipped, errors: [] };
  } catch (error) {
    await client.query("rollback");
    await query("update import_logs set status = 'failed', error_summary = $3, updated_at = now() where id = $1 and agency_id = $2", [id, agencyId, error instanceof Error ? error.message : "Import failed."]);
    throw error;
  } finally {
    client.release();
  }
}

export const importTargets = targets;
