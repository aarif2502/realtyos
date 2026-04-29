import path from "node:path";
import process from "node:process";
import pg from "pg";
import xlsx from "xlsx";

const { Pool } = pg;

const workbookPath = process.argv[2] || path.join(process.cwd(), "New Tenant List Cycle 74.xlsx");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

function asDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function clean(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
}

function postcodeFrom(address) {
  const match = String(address || "").match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i);
  return match?.[0]?.toUpperCase() ?? null;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  const agency = await pool.query("select id from agencies order by created_at asc limit 1");
  const agencyId = agency.rows[0]?.id;

  if (!agencyId) {
    throw new Error("No agency exists. Run db:bootstrap-admin or complete setup first.");
  }

  const workbook = xlsx.readFile(workbookPath, { cellDates: true });
  const sheet = workbook.Sheets.template;
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });

  let imported = 0;
  const propertyIds = new Map();

  for (const row of rows) {
    const propertyAddress = clean(row.PropertyAddress);
    const firstName = clean(row.FirstName);
    const lastName = clean(row.LastName);

    if (!propertyAddress || !firstName || !lastName) {
      continue;
    }

    let propertyId = propertyIds.get(propertyAddress);
    if (!propertyId) {
      const propertyResult = await pool.query(
        `insert into properties (agency_id, address, postcode, total_rooms, metadata)
         values ($1, $2, $3, 0, $4)
         on conflict (agency_id, address)
         do update set postcode = coalesce(properties.postcode, excluded.postcode)
         returning id`,
        [agencyId, propertyAddress, postcodeFrom(propertyAddress), JSON.stringify({ importedFrom: path.basename(workbookPath) })],
      );
      propertyId = propertyResult.rows[0].id;
      propertyIds.set(propertyAddress, propertyId);
    }

    const roomLabel = clean(row.Room) || "Unassigned";
    const roomResult = await pool.query(
      `insert into rooms (agency_id, property_id, room_label, status)
       values ($1, $2, $3, 'occupied')
       on conflict (property_id, room_label)
       do update set status = 'occupied'
       returning id`,
      [agencyId, propertyId, roomLabel],
    );

    await pool.query(
      `insert into tenants (
        agency_id, property_id, room_id, first_name, middle_name, last_name, date_of_birth, ni_number,
        checkin_date, checkout_date, hb_claim_ref_number, referral_agency, age, gender, religion,
        ethnicity, nationality, disability, sexual_orientation, spoken_language, risk_assessment,
        length_of_stay, record_status, metadata
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
      [
        agencyId,
        propertyId,
        roomResult.rows[0].id,
        firstName,
        clean(row.MiddleName),
        lastName,
        asDate(row.DateOfBirth),
        clean(row.NINumber),
        asDate(row.CheckinDate),
        asDate(row.CheckoutDate),
        clean(row.HBClaimRefNumber),
        clean(row.ReferralAgency),
        row.Age ? Number(row.Age) : null,
        clean(row.Gender),
        clean(row.Religion),
        clean(row.Ethnicity),
        clean(row.Nationality),
        clean(row.Disability),
        clean(row.SexualOrientation),
        clean(row.SpokenLanguage),
        clean(row.RiskAssessment)?.toUpperCase() || null,
        clean(row.LengthOfStay),
        clean(row.RecordStatus),
        JSON.stringify({ importedFrom: path.basename(workbookPath) }),
      ],
    );

    imported += 1;
  }

  await pool.query(
    `update properties
     set total_rooms = room_counts.total
     from (
       select property_id, count(*)::int as total
       from rooms
       where agency_id = $1
       group by property_id
     ) room_counts
     where properties.id = room_counts.property_id`,
    [agencyId],
  );

  console.log(`Imported ${imported} tenants across ${propertyIds.size} properties from ${workbookPath}.`);
} finally {
  await pool.end();
}
