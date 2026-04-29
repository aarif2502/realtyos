import path from "node:path";
import process from "node:process";
import pg from "pg";
import xlsx from "xlsx";

const { Pool } = pg;

const SOURCE_DIR = "Serenity Consultancy (UK) Ltd council tax 2026-2027";
const DEFAULT_WORKBOOK = path.join(process.cwd(), SOURCE_DIR, "Serenity Consultancy UK Ltd C100.xlsx");
const CYCLE_LIST_NUMBER = "100";
const SHEET_NAME = "Tabelle1";
const AGENCY_SEARCH = "%serenity%";
const HOUSING_ASSOCIATION_NAME = "Ash-Shahada Housing Association Ltd";

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

function postcodeFrom(address) {
  const match = clean(address).match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i);
  return match?.[0]?.toUpperCase() ?? null;
}

function amount(value) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(String(value).replace(/[£Ł,\s]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : null;
}

function isoDate(value) {
  const text = clean(value);
  if (!text) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function parseUkDate(value) {
  const text = clean(value);
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4}|\d{2})$/);
  if (!match) return null;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2]}-${match[1]}`;
}

function parsePeriod(value) {
  const text = clean(value);
  const match = text.match(/(\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{2})\s*-\s*(\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{2})/);
  return match ? { start: parseUkDate(match[1]), end: parseUkDate(match[2]), label: text } : { start: null, end: null, label: text };
}

function recordStatus(row) {
  const missing = [];
  if (!row.propertyAddress) missing.push("property address");
  if (!row.claimRef) missing.push("claim reference");
  if (!row.firstName) missing.push("first name");
  if (!row.lastName) missing.push("surname");
  if (!row.bccPeriod.label) missing.push("BCC period");
  if (missing.length) return { status: "needs_review", reason: `Missing ${missing.join(", ")}.` };
  if (!row.checkIn) return { status: "pending", reason: "Check-in date is missing or invalid." };
  if (!row.expectedAmount && !row.grossAmount && row.netAmount < 0) {
    return { status: "needs_review", reason: "Adjustment-only row with negative net amount requires review." };
  }
  if (row.checkOut) {
    const today = new Date().toISOString().slice(0, 10);
    if (row.checkOut < today) return { status: "expired", reason: "Checkout date is in the past." };
  }
  return { status: "active", reason: "C100 row has required property, tenant, claim and period data." };
}

function parseWorkbook(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found. Available sheets: ${workbook.SheetNames.join(", ")}`);
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });
  const rows = [];
  const errors = [];
  const duplicateKeys = new Map();

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const propertyAddress = clean(raw["Property Address"]);
    if (propertyAddress.toLowerCase() === "grand total") return;
    if (!Object.values(raw).some((value) => clean(value))) return;
    const bccPeriod = parsePeriod(raw["BCC Period"]);
    const parsed = {
      rowNumber,
      sourceRowKey: `C100:${rowNumber}:${clean(raw["Claim Ref"]) || "NOCLAIM"}`,
      propertyAddress,
      normalizedPropertyAddress: normalizedAddress(propertyAddress),
      claimRef: clean(raw["Claim Ref"]),
      firstName: clean(raw["First Name"]).toUpperCase(),
      lastName: clean(raw["Surname"]).toUpperCase(),
      checkIn: isoDate(raw["Check in"]),
      checkOut: isoDate(raw["Check out"]),
      bccPeriod,
      numberOfDays: amount(raw["Number of Days"]),
      expectedAmount: amount(raw["Sum of Expected Amount"]),
      grossAmount: amount(raw["Sum of BCC Actual Gross"]),
      overUnderAmount: amount(raw["Sum of Overpayment/Underpayment"]),
      adminCharge: amount(raw["Sum of Admin Charge"]),
      netAmount: amount(raw["Sum of Net Amount"]) ?? 0,
    };
    const status = recordStatus(parsed);
    parsed.recordStatus = status.status;
    parsed.needsReviewReason = status.status === "needs_review" ? status.reason : null;
    parsed.statusReason = status.reason;
    for (const field of ["propertyAddress", "claimRef", "firstName", "lastName"]) {
      if (!parsed[field]) errors.push({ row: rowNumber, severity: "error", field, message: `${field} is required.` });
    }
    if (!parsed.bccPeriod.start || !parsed.bccPeriod.end) {
      errors.push({ row: rowNumber, severity: "error", field: "BCC Period", message: "BCC Period must be a valid date range." });
    }
    if (parsed.expectedAmount === null || parsed.grossAmount === null || parsed.adminCharge === null) {
      errors.push({ row: rowNumber, severity: "warning", field: "amounts", message: "Expected/gross/admin amount is missing; row will be staged as needs review if committed." });
    }
    if (parsed.recordStatus === "needs_review") {
      errors.push({ row: rowNumber, severity: "warning", field: "record_status", message: parsed.statusReason });
    }
    const duplicateKey = `${parsed.claimRef}|${parsed.bccPeriod.start}|${parsed.bccPeriod.end}|${parsed.normalizedPropertyAddress}`;
    duplicateKeys.set(duplicateKey, [...(duplicateKeys.get(duplicateKey) || []), rowNumber]);
    rows.push(parsed);
  });

  for (const [key, rowNumbers] of duplicateKeys.entries()) {
    if (rowNumbers.length > 1) {
      for (const row of rowNumbers) errors.push({ row, severity: "warning", field: "duplicate", message: `Duplicate claim/period/property key appears ${rowNumbers.length} times.` });
    }
  }
  return { rows, errors, workbookSheet: SHEET_NAME, filename: path.basename(filePath) };
}

function redactedPreview(rows) {
  return rows.slice(0, 20).map((row) => ({
    rowNumber: row.rowNumber,
    propertyAddress: row.propertyAddress,
    claimRef: row.claimRef ? "[claim-ref-present]" : "",
    bccPeriod: row.bccPeriod.label,
    recordStatus: row.recordStatus,
    needsReview: row.needsReviewReason,
    grossAmount: row.grossAmount,
    netAmount: row.netAmount,
  }));
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
     values ($1,$2,'active','Created by Serenity Cycle 100 importer.')
     returning id, name`,
    [agencyId, HOUSING_ASSOCIATION_NAME],
  );
  return inserted.rows[0];
}

async function matchExisting(pool, agencyId, rows) {
  const [props, tenants] = await Promise.all([
    pool.query("select id, address from properties where agency_id = $1", [agencyId]),
    pool.query("select id, hb_claim_ref_number, first_name, last_name, property_id from tenants where agency_id = $1", [agencyId]),
  ]);
  const propertyByNorm = new Map(props.rows.map((row) => [normalizedAddress(row.address), row]));
  const tenantByClaim = new Map(tenants.rows.filter((row) => row.hb_claim_ref_number).map((row) => [String(row.hb_claim_ref_number), row]));
  let matchedProperties = 0;
  let matchedTenants = 0;
  for (const row of rows) {
    if (propertyByNorm.has(row.normalizedPropertyAddress)) matchedProperties += 1;
    if (row.claimRef && tenantByClaim.has(row.claimRef)) matchedTenants += 1;
  }
  return {
    existingProperties: props.rowCount,
    existingTenants: tenants.rowCount,
    matchedProperties,
    matchedTenants,
  };
}

function summarize(parsed, matchSummary = {}) {
  const properties = new Set(parsed.rows.map((row) => row.normalizedPropertyAddress)).size;
  const claims = new Set(parsed.rows.map((row) => row.claimRef).filter(Boolean)).size;
  const totals = parsed.rows.reduce((acc, row) => {
    acc.expected += row.expectedAmount || 0;
    acc.gross += row.grossAmount || 0;
    acc.adjustment += row.overUnderAmount || 0;
    acc.admin += row.adminCharge || 0;
    acc.net += row.netAmount || 0;
    return acc;
  }, { expected: 0, gross: 0, adjustment: 0, admin: 0, net: 0 });
  const errorCount = parsed.errors.filter((error) => error.severity === "error").length;
  const warningCount = parsed.errors.filter((error) => error.severity === "warning").length;
  return {
    mode: dryRun ? "dry-run" : "commit",
    source: parsed.filename,
    cycleListNumber: CYCLE_LIST_NUMBER,
    rowsParsed: parsed.rows.length,
    uniqueProperties: properties,
    uniqueClaimRefs: claims,
    errorCount,
    warningCount,
    statusCounts: parsed.rows.reduce((acc, row) => ({ ...acc, [row.recordStatus]: (acc[row.recordStatus] || 0) + 1 }), {}),
    totals: {
      expected: Number(totals.expected.toFixed(2)),
      gross: Number(totals.gross.toFixed(2)),
      adjustment: Number(totals.adjustment.toFixed(2)),
      adminCharge: Number(totals.admin.toFixed(2)),
      net: Number(totals.net.toFixed(2)),
    },
    matchSummary,
  };
}

async function commitImport(pool, agency, parsed) {
  const blocking = parsed.errors.filter((error) => error.severity === "error");
  if (blocking.length) throw new Error(`Commit refused: ${blocking.length} blocking validation error(s). Run --dry-run and fix the source first.`);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const ha = await getOrCreateHousingAssociation(client, agency.id);
    const summary = summarize(parsed);
    const importLog = await client.query(
      `insert into import_logs (
         agency_id, filename, target_modules, sheet_count, rows_parsed, validation_errors, status,
         action_type, mapping, preview, error_summary, cycle_list_number, housing_association_id
       )
       values ($1,$2,array['pms','cycle_100','remittance_staging'],1,$3,$4,'validated','serenity_c100_import',$5,$6,$7,$8,$9)
       returning id`,
      [
        agency.id,
        parsed.filename,
        parsed.rows.length,
        parsed.errors.length,
        JSON.stringify({ source: "Serenity C100", cycleListNumber: CYCLE_LIST_NUMBER, sheet: parsed.workbookSheet }),
        JSON.stringify({ summary, preview: redactedPreview(parsed.rows) }),
        parsed.errors.length ? `${parsed.errors.length} warning(s) recorded.` : null,
        CYCLE_LIST_NUMBER,
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

    const remittanceBatch = await client.query(
      `insert into remittance_batches (
         agency_id, housing_association_id, cycle_list_number, remittance_month,
         remittance_period_start, remittance_period_end, source_file_name, source_file_type,
         total_received_amount, status, metadata
       )
       values ($1,$2,$3,$4,$5,$6,$7,'xlsx',$8,$9,$10)
       on conflict (agency_id, housing_association_id, cycle_list_number, source_file_name)
       do update set total_received_amount = excluded.total_received_amount,
                     status = excluded.status,
                     metadata = excluded.metadata,
                     updated_at = now()
       returning id`,
      [
        agency.id,
        ha.id,
        CYCLE_LIST_NUMBER,
        "2026-04",
        "2026-03-23",
        "2026-04-19",
        parsed.filename,
        summary.totals.gross,
        parsed.errors.some((error) => error.severity === "warning") ? "needs_review" : "validated",
        JSON.stringify({ importLogId, summary }),
      ],
    );
    const remittanceBatchId = remittanceBatch.rows[0].id;

    let propertiesChanged = 0;
    let tenantsChanged = 0;
    let occupanciesChanged = 0;
    let ledgerChanged = 0;
    let remittanceLinesChanged = 0;
    const snapshotRows = [];

    for (const row of parsed.rows) {
      const existingProp = await client.query("select id, landlord_id from properties where agency_id = $1 and trim(regexp_replace(upper(address), '[^A-Z0-9]+', ' ', 'g')) = $2 limit 1", [agency.id, row.normalizedPropertyAddress]);
      let propertyId;
      let landlordId = null;
      if (existingProp.rowCount) {
        propertyId = existingProp.rows[0].id;
        landlordId = existingProp.rows[0].landlord_id;
        await client.query("update properties set housing_association_id = coalesce(housing_association_id, $3), postcode = coalesce(postcode, $4), updated_at = now() where id = $1 and agency_id = $2", [propertyId, agency.id, ha.id, postcodeFrom(row.propertyAddress)]);
      } else {
        const inserted = await client.query(
          `insert into properties (agency_id, housing_association_id, address, postcode, total_rooms, metadata)
           values ($1,$2,$3,$4,0,$5)
           on conflict (agency_id, address)
           do update set housing_association_id = coalesce(properties.housing_association_id, excluded.housing_association_id),
                         postcode = coalesce(properties.postcode, excluded.postcode),
                         metadata = properties.metadata || excluded.metadata,
                         updated_at = now()
           returning id`,
          [agency.id, ha.id, row.propertyAddress, postcodeFrom(row.propertyAddress), JSON.stringify({ sourceImportLogId: importLogId, cycleListNumber: CYCLE_LIST_NUMBER })],
        );
        propertyId = inserted.rows[0].id;
        propertiesChanged += 1;
      }

      const roomLabel = `C100-${row.claimRef || row.rowNumber}`;
      const room = await client.query(
        `insert into rooms (agency_id, property_id, room_label, status, metadata)
         values ($1,$2,$3,$4,$5)
         on conflict (property_id, room_label)
         do update set status = excluded.status, metadata = rooms.metadata || excluded.metadata
         returning id`,
        [agency.id, propertyId, roomLabel, ["active", "needs_review"].includes(row.recordStatus) ? "occupied" : "available", JSON.stringify({ cycleListNumber: CYCLE_LIST_NUMBER })],
      );
      const roomId = room.rows[0].id;

      const existingTenant = row.claimRef
        ? await client.query("select id from tenants where agency_id = $1 and hb_claim_ref_number = $2 limit 1", [agency.id, row.claimRef])
        : await client.query("select id from tenants where agency_id = $1 and source_row_key = $2 limit 1", [agency.id, row.sourceRowKey]);
      let tenantId;
      if (existingTenant.rowCount) {
        tenantId = existingTenant.rows[0].id;
        await client.query(
          `update tenants
           set property_id=$3, room_id=$4, first_name=$5, last_name=$6, checkin_date=$7, checkout_date=$8,
               record_status=$9, status_reason=$10, needs_review_reason=$11, cycle_list_number=$12,
               housing_association_id=$13, source_import_log_id=$14, source_row_key=$15, updated_at=now(),
               metadata = metadata || $16::jsonb
           where id=$1 and agency_id=$2`,
          [tenantId, agency.id, propertyId, roomId, row.firstName, row.lastName, row.checkIn, row.checkOut, row.recordStatus, row.statusReason, row.needsReviewReason, CYCLE_LIST_NUMBER, ha.id, importLogId, row.sourceRowKey, JSON.stringify({ c100: { rowNumber: row.rowNumber, bccPeriod: row.bccPeriod.label } })],
        );
      } else {
        const insertedTenant = await client.query(
          `insert into tenants (
             agency_id, property_id, room_id, first_name, last_name, checkin_date, checkout_date,
             hb_claim_ref_number, record_status, status_reason, needs_review_reason, cycle_list_number,
             housing_association_id, source_import_log_id, source_row_key, metadata
           )
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           returning id`,
          [agency.id, propertyId, roomId, row.firstName, row.lastName, row.checkIn, row.checkOut, row.claimRef || null, row.recordStatus, row.statusReason, row.needsReviewReason, CYCLE_LIST_NUMBER, ha.id, importLogId, row.sourceRowKey, JSON.stringify({ c100: { rowNumber: row.rowNumber, bccPeriod: row.bccPeriod.label } })],
        );
        tenantId = insertedTenant.rows[0].id;
        tenantsChanged += 1;
      }

      const existingOccupancy = await client.query("select id from occupancy_records where agency_id=$1 and property_id=$2 and room_label=$3 and tenant_id=$4 limit 1", [agency.id, propertyId, roomLabel, tenantId]);
      if (existingOccupancy.rowCount) {
        await client.query(
          `update occupancy_records
           set room_id=$5, checkin_date=$6, checkout_date=$7, record_status=$8, status_reason=$9,
               needs_review_reason=$10, cycle_list_number=$11, hb_claim_ref_number=$12, source_file=$13,
               source_row_number=$14, metadata=metadata || $15::jsonb, updated_at=now()
           where id=$1 and agency_id=$2 and property_id=$3 and tenant_id=$4`,
          [existingOccupancy.rows[0].id, agency.id, propertyId, tenantId, roomId, row.checkIn, row.checkOut, row.recordStatus, row.statusReason, row.needsReviewReason, CYCLE_LIST_NUMBER, row.claimRef || null, parsed.filename, row.rowNumber, JSON.stringify({ bccPeriod: row.bccPeriod.label })],
        );
      } else {
        await client.query(
          `insert into occupancy_records (
             agency_id, property_id, room_id, tenant_id, room_label, checkin_date, checkout_date,
             record_status, status_reason, source_file, source_row_number, metadata,
             cycle_list_number, hb_claim_ref_number, needs_review_reason
           )
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [agency.id, propertyId, roomId, tenantId, roomLabel, row.checkIn, row.checkOut, row.recordStatus, row.statusReason, parsed.filename, row.rowNumber, JSON.stringify({ bccPeriod: row.bccPeriod.label }), CYCLE_LIST_NUMBER, row.claimRef || null, row.needsReviewReason],
        );
        occupanciesChanged += 1;
      }

      const ledgerReference = `C100:${row.claimRef || row.rowNumber}:${row.bccPeriod.start || "na"}:${row.bccPeriod.end || "na"}`;
      const ledgerType = row.grossAmount ? "housing_benefit" : "adjustment";
      const debit = row.grossAmount ? 0 : Math.abs(Math.min(row.netAmount || 0, 0));
      const credit = row.grossAmount || 0;
      const ledgerStatus = row.grossAmount ? "posted" : "draft";
      const existingLedger = await client.query("select id from payment_ledger_entries where agency_id=$1 and reference=$2 limit 1", [agency.id, ledgerReference]);
      if (existingLedger.rowCount) {
        await client.query(
          `update payment_ledger_entries
           set tenant_id=$3, property_id=$4, period_start=$5, period_end=$6, type=$7, description=$8,
               debit=$9, credit=$10, status=$11, cycle_list_number=$12, source_import_log_id=$13, housing_association_id=$14
           where id=$1 and agency_id=$2`,
          [existingLedger.rows[0].id, agency.id, tenantId, propertyId, row.bccPeriod.start, row.bccPeriod.end, ledgerType, `Serenity Cycle 100 ${ledgerType.replace("_", " ")}`, debit, credit, ledgerStatus, CYCLE_LIST_NUMBER, importLogId, ha.id],
        );
      } else {
        await client.query(
          `insert into payment_ledger_entries (
             agency_id, tenant_id, property_id, entry_date, period_start, period_end, type, description,
             debit, credit, status, reference, cycle_list_number, source_import_log_id, housing_association_id
           )
           values ($1,$2,$3,coalesce($4::date,current_date),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [agency.id, tenantId, propertyId, row.bccPeriod.end, row.bccPeriod.start, row.bccPeriod.end, ledgerType, `Serenity Cycle 100 ${ledgerType.replace("_", " ")}`, debit, credit, ledgerStatus, ledgerReference, CYCLE_LIST_NUMBER, importLogId, ha.id],
        );
        ledgerChanged += 1;
      }

      await client.query(
        `insert into remittance_line_items (
           remittance_batch_id, agency_id, housing_association_id, cycle_list_number, tenant_id, property_id, landlord_id,
           raw_tenant_name, raw_property_address, normalized_property_address, reference_number,
           payment_period_start, payment_period_end, number_of_days, expected_amount, gross_amount, adjustment_amount,
           admin_charge, net_amount, match_status, match_confidence, needs_review_reason, metadata
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         on conflict (agency_id, cycle_list_number, reference_number, raw_property_address, payment_period_start, payment_period_end)
         do update set tenant_id=excluded.tenant_id, property_id=excluded.property_id, landlord_id=excluded.landlord_id,
                       expected_amount=excluded.expected_amount, gross_amount=excluded.gross_amount,
                       adjustment_amount=excluded.adjustment_amount, admin_charge=excluded.admin_charge,
                       net_amount=excluded.net_amount, match_status=excluded.match_status,
                       match_confidence=excluded.match_confidence, needs_review_reason=excluded.needs_review_reason,
                       metadata=excluded.metadata, updated_at=now()`,
        [
          remittanceBatchId,
          agency.id,
          ha.id,
          CYCLE_LIST_NUMBER,
          tenantId,
          propertyId,
          landlordId,
          `${row.firstName} ${row.lastName}`.trim(),
          row.propertyAddress,
          row.normalizedPropertyAddress,
          row.claimRef || row.sourceRowKey,
          row.bccPeriod.start,
          row.bccPeriod.end,
          row.numberOfDays,
          row.expectedAmount || 0,
          row.grossAmount || 0,
          row.overUnderAmount || 0,
          row.adminCharge || 0,
          row.netAmount || 0,
          row.needsReviewReason ? "needs_review" : "matched",
          row.needsReviewReason ? 70 : 95,
          row.needsReviewReason,
          JSON.stringify({ sourceRowNumber: row.rowNumber, importLogId }),
        ],
      );
      remittanceLinesChanged += 1;

      snapshotRows.push({
        PropertyAddress: row.propertyAddress,
        Room: roomLabel,
        FirstName: row.firstName,
        MiddleName: "",
        LastName: row.lastName,
        DateOfBirth: "",
        NINumber: "",
        CheckinDate: row.checkIn,
        CheckoutDate: row.checkOut,
        HBClaimRefNumber: row.claimRef,
        ReferralAgency: "",
        Age: "",
        Gender: "",
        Religion: "",
        Ethnicity: "",
        Nationality: "",
        Disability: "",
        SexualOrientation: "",
        SpokenLanguage: "",
        RiskAssessment: "",
        LengthOfStay: "",
        RecordStatus: row.recordStatus,
      });
    }

    await client.query(
      `update properties
       set total_rooms = counts.total, updated_at = now()
       from (select property_id, count(*)::int as total from rooms where agency_id = $1 group by property_id) counts
       where properties.id = counts.property_id and properties.agency_id = $1`,
      [agency.id],
    );

    const propertyCount = new Set(parsed.rows.map((row) => row.normalizedPropertyAddress)).size;
    const snapshot = await client.query(
      `insert into pms_cycle_snapshots (
         agency_id, housing_association_id, cycle_list_number, row_count, property_count, tenant_count,
         total_expected_amount, snapshot_rows, summary, status
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'created')
       on conflict (agency_id, housing_association_id, cycle_list_number)
       do update set row_count=excluded.row_count, property_count=excluded.property_count,
                     tenant_count=excluded.tenant_count, total_expected_amount=excluded.total_expected_amount,
                     snapshot_rows=excluded.snapshot_rows, summary=excluded.summary, updated_at=now()
       returning id`,
      [agency.id, ha.id, CYCLE_LIST_NUMBER, parsed.rows.length, propertyCount, parsed.rows.length, summary.totals.expected, JSON.stringify(snapshotRows), JSON.stringify(summary)],
    );

    await client.query(
      `insert into housing_association_payments (
         agency_id, housing_association_id, snapshot_id, cycle_list_number, expected_amount, payment_status, notes
       )
       values ($1,$2,$3,$4,$5,'pending',$6)
       on conflict (agency_id, housing_association_id, cycle_list_number)
       do update set snapshot_id=excluded.snapshot_id, expected_amount=excluded.expected_amount, updated_at=now()`,
      [agency.id, ha.id, snapshot.rows[0].id, CYCLE_LIST_NUMBER, summary.totals.gross, "Created from Serenity C100 dry-run/commit tooling; not marked paid."],
    );

    await client.query(
      "update import_logs set status='imported', rows_imported=$3, rows_skipped=0, updated_at=now() where id=$1 and agency_id=$2",
      [importLogId, agency.id, parsed.rows.length],
    );
    await client.query("commit");
    return { importLogId, housingAssociation: ha.name, propertiesChanged, tenantsChanged, occupanciesChanged, ledgerChanged, remittanceLinesChanged };
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
  const matchSummary = await matchExisting(pool, agency.id, parsed.rows);
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
