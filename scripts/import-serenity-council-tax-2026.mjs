import path from "node:path";
import process from "node:process";
import pg from "pg";
import xlsx from "xlsx";

const { Pool } = pg;

const SOURCE_DIR = "Serenity Consultancy (UK) Ltd council tax 2026-2027";
const DEFAULT_WORKBOOK = path.join(process.cwd(), SOURCE_DIR, "Council Tax Receipt 2026-27.xlsx");
const AGENCY_SEARCH = "%serenity%";
const HOUSING_ASSOCIATION_NAME = "Ash-Shahada Housing Association Ltd";
const TAX_YEAR = "2026/27";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const commit = args.has("--commit");
const sourceArgIndex = process.argv.findIndex((arg) => arg === "--source");
const workbookPath = sourceArgIndex >= 0 ? process.argv[sourceArgIndex + 1] : DEFAULT_WORKBOOK;

if (dryRun === commit) {
  console.error("Refusing to run. Use exactly one mode: --dry-run or --commit.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. No database connection was attempted.");
  process.exit(1);
}

function clean(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "(blank)") return "";
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function normalizedAddress(value) {
  return clean(value)
    .toUpperCase()
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function amount(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value);
  if (text.startsWith("=")) return null;
  const numeric = Number(text.replace(/[\\u00a3,\\s]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : null;
}

function isoDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const parsed = new Date(clean(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function boolValue(value) {
  const text = clean(value).toLowerCase();
  if (!text) return null;
  if (["yes", "y", "true"].includes(text)) return true;
  if (["no", "n", "false"].includes(text)) return false;
  return null;
}

function statusFor(row) {
  const missing = [];
  if (!row.accountRef) missing.push("account ref");
  if (!row.sourcePropertyAddress) missing.push("property address");
  if (!row.liabilityStartDate) missing.push("start date");
  if (!row.band) missing.push("band");
  if (row.annualCharge === null) missing.push("annual charge");
  if (missing.length) return { status: "missing_info", reason: `Missing ${missing.join(", ")}.` };
  if (!row.propertyMatched) return { status: "needs_review", reason: "Property address did not match an existing Serenity PMS property." };
  if (row.liabilityEndDate && row.liabilityEndDate < new Date().toISOString().slice(0, 10)) return { status: "ended", reason: "Liability end date is in the past." };
  return { status: "active", reason: "Council tax row has required fields and matched property." };
}

function isNarrativeRow(row) {
  if (row.sourcePropertyAddress) return false;
  if (!row.accountRef) return true;
  const accountText = row.accountRef.toUpperCase();
  const hasNumericRef = /\d/.test(accountText);
  const hasDataCells = Boolean(
    row.liabilityStartDate ||
    row.liabilityEndDate ||
    row.band ||
    row.annualCharge !== null ||
    row.outstandingDebt !== null ||
    row.sixMonthDeduction !== null
  );
  if (hasDataCells) return false;
  if (accountText.startsWith("TOTAL")) return true;
  if (accountText.startsWith("GENERATED")) return true;
  if (accountText.includes("DEDUCTION PAYMENT SCHEDULE")) return true;
  if (accountText.includes("HOW TO READ THIS STATEMENT")) return true;
  if (accountText.startsWith("FOR ALL QUERIES")) return true;
  if (accountText.startsWith("SELF-CONTAINED")) return true;
  if (row.accountRef.startsWith("►")) return true;
  if (!hasNumericRef && row.accountRef.length > 18) return true;
  return false;
}

function parseWorkbook(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets["Council Tax Receipt"] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("No worksheet was found.");
  const rows = xlsx.utils.sheet_to_json(sheet, { range: 4, defval: null, raw: false });
  const parsed = [];
  const errors = [];
  rows.forEach((raw, index) => {
    const rowNumber = index + 6;
    const accountRef = clean(raw["Account Ref"]);
    const sourcePropertyAddress = clean(raw["Property Address"]);
    if (!accountRef && !sourcePropertyAddress) return;
    const row = {
      rowNumber,
      accountRef,
      sourcePropertyAddress,
      normalizedPropertyAddress: normalizedAddress(sourcePropertyAddress),
      liabilityStartDate: isoDate(raw["Start Date"]),
      liabilityEndDate: isoDate(raw["End Date"]),
      band: clean(raw["Band"]).toUpperCase(),
      annualCharge: amount(raw["Annual Charge (GBP)"]),
      outstandingDebt: amount(raw["Outstanding Debt (GBP)"]),
      sixMonthDeduction: amount(raw["6 Month Deduction (GBP)"]),
      selfContained: boolValue(raw["Self Contained"]),
    };
    if (isNarrativeRow(row)) return;
    for (const field of ["accountRef", "sourcePropertyAddress"]) {
      if (!row[field]) errors.push({ row: rowNumber, severity: "error", field, message: `${field} is required.` });
    }
    if (!row.liabilityStartDate) errors.push({ row: rowNumber, severity: "warning", field: "Start Date", message: "Start date is missing or invalid." });
    if (!row.band) errors.push({ row: rowNumber, severity: "warning", field: "Band", message: "Council tax band is blank." });
    if (row.annualCharge === null) errors.push({ row: rowNumber, severity: "warning", field: "Annual Charge", message: "Annual charge is missing, formula-only, or invalid." });
    parsed.push(row);
  });
  return { filename: path.basename(filePath), rows: parsed, errors };
}

async function resolveSerenity(pool) {
  const agencies = await pool.query(
    `select id, name, trading_name
     from agencies
     where coalesce(status, 'active') = 'active'
       and (name ilike $1 or coalesce(trading_name, '') ilike $1)
     order by created_at asc`,
    [AGENCY_SEARCH],
  );
  if (agencies.rowCount !== 1) throw new Error(`Expected exactly one active Serenity agency, found ${agencies.rowCount}.`);
  return agencies.rows[0];
}

async function getOrCreateHousingAssociation(client, agencyId) {
  const existing = await client.query("select id, name from housing_associations where agency_id = $1 and lower(name) = lower($2) limit 1", [agencyId, HOUSING_ASSOCIATION_NAME]);
  if (existing.rowCount) return existing.rows[0];
  const inserted = await client.query(
    `insert into housing_associations (agency_id, name, status, notes)
     values ($1,$2,'active','Created by Serenity council tax importer.')
     returning id, name`,
    [agencyId, HOUSING_ASSOCIATION_NAME],
  );
  return inserted.rows[0];
}

async function enrichMatches(pool, agencyId, parsed) {
  const props = await pool.query("select id, address from properties where agency_id = $1", [agencyId]);
  const byNorm = new Map(props.rows.map((row) => [normalizedAddress(row.address), row]));
  let matched = 0;
  for (const row of parsed.rows) {
    const prop = byNorm.get(row.normalizedPropertyAddress);
    row.propertyId = prop?.id || null;
    row.propertyMatched = Boolean(prop);
    const status = statusFor(row);
    row.status = status.status;
    row.needsReviewReason = status.status === "active" ? null : status.reason;
    if (row.propertyMatched) matched += 1;
    if (!row.propertyMatched) parsed.errors.push({ row: row.rowNumber, severity: "warning", field: "Property Address", message: "No matching Serenity property was found." });
  }
  return { existingProperties: props.rowCount, matchedProperties: matched };
}

function summarize(parsed, matchSummary = {}) {
  const totals = parsed.rows.reduce((acc, row) => {
    acc.annual += row.annualCharge || 0;
    acc.outstanding += row.outstandingDebt || 0;
    acc.deduction += row.sixMonthDeduction || 0;
    return acc;
  }, { annual: 0, outstanding: 0, deduction: 0 });
  return {
    mode: dryRun ? "dry-run" : "commit",
    source: parsed.filename,
    taxYear: TAX_YEAR,
    rowsParsed: parsed.rows.length,
    uniqueAccountRefs: new Set(parsed.rows.map((row) => row.accountRef).filter(Boolean)).size,
    uniquePropertyStrings: new Set(parsed.rows.map((row) => row.normalizedPropertyAddress).filter(Boolean)).size,
    errorCount: parsed.errors.filter((error) => error.severity === "error").length,
    warningCount: parsed.errors.filter((error) => error.severity === "warning").length,
    statusCounts: parsed.rows.reduce((acc, row) => ({ ...acc, [row.status || "unchecked"]: (acc[row.status || "unchecked"] || 0) + 1 }), {}),
    totals: {
      annualCharge: Number(totals.annual.toFixed(2)),
      outstandingDebt: Number(totals.outstanding.toFixed(2)),
      sixMonthDeduction: Number(totals.deduction.toFixed(2)),
    },
    matchSummary,
  };
}

async function commitImport(pool, agency, parsed) {
  const blocking = parsed.errors.filter((error) => error.severity === "error");
  if (blocking.length) throw new Error(`Commit refused: ${blocking.length} blocking validation error(s).`);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const ha = await getOrCreateHousingAssociation(client, agency.id);
    const summary = summarize(parsed);
    const importLog = await client.query(
      `insert into import_logs (
         agency_id, filename, target_modules, sheet_count, rows_parsed, validation_errors, status,
         action_type, mapping, preview, error_summary, housing_association_id
       )
       values ($1,$2,array['council_tax'],1,$3,$4,'validated','serenity_council_tax_2026_import',$5,$6,$7,$8)
       returning id`,
      [
        agency.id,
        parsed.filename,
        parsed.rows.length,
        parsed.errors.length,
        JSON.stringify({ taxYear: TAX_YEAR, housingAssociation: HOUSING_ASSOCIATION_NAME }),
        JSON.stringify({ summary, preview: parsed.rows.slice(0, 20).map((row) => ({ rowNumber: row.rowNumber, accountRef: row.accountRef ? "[account-ref-present]" : "", propertyAddress: row.sourcePropertyAddress, status: row.status })) }),
        parsed.errors.length ? `${parsed.errors.length} warning/error record(s).` : null,
        ha.id,
      ],
    );
    const importLogId = importLog.rows[0].id;
    for (const error of parsed.errors.slice(0, 1000)) {
      await client.query(
        `insert into import_row_errors (agency_id, import_log_id, row_number, severity, field_name, message)
         values ($1,$2,$3,$4,$5,$6)`,
        [agency.id, importLogId, error.row, error.severity, error.field, error.message],
      );
    }
    let changed = 0;
    for (const row of parsed.rows) {
      await client.query(
        `insert into council_tax_records (
           agency_id, housing_association_id, property_id, account_ref, source_property_address,
           normalized_property_address, tax_year, liability_start_date, liability_end_date, band,
           annual_charge, outstanding_debt, six_month_deduction, self_contained, status, source_file,
           source_import_log_id, needs_review_reason, metadata
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         on conflict (agency_id, account_ref, tax_year)
         do update set housing_association_id=excluded.housing_association_id,
                       property_id=excluded.property_id,
                       source_property_address=excluded.source_property_address,
                       normalized_property_address=excluded.normalized_property_address,
                       liability_start_date=excluded.liability_start_date,
                       liability_end_date=excluded.liability_end_date,
                       band=excluded.band,
                       annual_charge=excluded.annual_charge,
                       outstanding_debt=excluded.outstanding_debt,
                       six_month_deduction=excluded.six_month_deduction,
                       self_contained=excluded.self_contained,
                       status=excluded.status,
                       source_file=excluded.source_file,
                       source_import_log_id=excluded.source_import_log_id,
                       needs_review_reason=excluded.needs_review_reason,
                       metadata=excluded.metadata,
                       updated_at=now()`,
        [
          agency.id,
          ha.id,
          row.propertyId,
          row.accountRef,
          row.sourcePropertyAddress,
          row.normalizedPropertyAddress,
          TAX_YEAR,
          row.liabilityStartDate,
          row.liabilityEndDate,
          row.band || null,
          row.annualCharge || 0,
          row.outstandingDebt || 0,
          row.sixMonthDeduction || 0,
          row.selfContained,
          row.status,
          parsed.filename,
          importLogId,
          row.needsReviewReason,
          JSON.stringify({ rowNumber: row.rowNumber }),
        ],
      );
      changed += 1;
    }
    await client.query("update import_logs set status='imported', rows_imported=$3, updated_at=now() where id=$1 and agency_id=$2", [importLogId, agency.id, changed]);
    await client.query("commit");
    return { importLogId, housingAssociation: ha.name, rowsChanged: changed };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

const parsed = parseWorkbook(workbookPath);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  const agency = await resolveSerenity(pool);
  const matchSummary = await enrichMatches(pool, agency.id, parsed);
  const summary = summarize(parsed, matchSummary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errorCount > 0) {
    console.error(`Validation produced ${summary.errorCount} blocking error(s). Commit is not allowed.`);
    if (commit) process.exitCode = 1;
  }
  if (dryRun) {
    console.log("Dry-run complete. No database writes were performed.");
  } else if (summary.errorCount === 0) {
    const result = await commitImport(pool, agency, parsed);
    console.log(JSON.stringify({ committed: true, ...result }, null, 2));
  }
} finally {
  await pool.end();
}

