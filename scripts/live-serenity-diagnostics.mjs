import pg from "pg";

const { Client } = pg;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
  await client.connect();

  const agencyRow = await client.query(
    `select id, name from agencies where lower(name) like '%serenity%' order by created_at asc limit 1`
  );
  const agency = agencyRow.rows[0];
  if (!agency) {
    throw new Error("Serenity agency not found");
  }

  async function tableColumns(tableName) {
    const result = await client.query(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
      [tableName]
    );
    return new Set(result.rows.map((row) => row.column_name));
  }

  const occupancyColumns = await tableColumns("occupancy_records");
  const activeWhere = occupancyColumns.has("status")
    ? `status = 'active'`
    : occupancyColumns.has("checked_out_at")
      ? `checked_out_at is null`
      : `true`;

  const counts = {};
  const queries = {
    properties: `select count(*)::int as c from properties where agency_id = $1`,
    rooms: `select count(*)::int as c from rooms where agency_id = $1`,
    tenants: `select count(*)::int as c from tenants where agency_id = $1`,
    occupancy_records: `select count(*)::int as c from occupancy_records where agency_id = $1`,
    active_residents: `select count(distinct tenant_id)::int as c from occupancy_records where agency_id = $1 and ${activeWhere}`,
    occupied_rooms: `select count(distinct room_id)::int as c from occupancy_records where agency_id = $1 and ${activeWhere} and room_id is not null`,
    contracts: `select count(*)::int as c from tenancy_contracts where agency_id = $1`,
    support_plans: `select count(*)::int as c from support_plans where agency_id = $1`,
    risk_assessments: `select count(*)::int as c from risk_assessments where agency_id = $1`,
    council_tax: `select count(*)::int as c from council_tax_records where agency_id = $1`,
    remittance_lines: `select count(*)::int as c from remittance_line_items where agency_id = $1`,
    landlord_rates: `select count(*)::int as c from landlord_payment_rates where agency_id = $1`,
    landlord_obligations: `select count(*)::int as c from landlord_payment_obligations where agency_id = $1`
  };

  for (const [key, sql] of Object.entries(queries)) {
    try {
      const row = await client.query(sql, [agency.id]);
      counts[key] = row.rows[0].c;
    } catch {
      counts[key] = null;
    }
  }

  const kings = await client.query(
    `select id, address, postcode, local_authority
     from properties
     where agency_id = $1 and lower(address) like '%kings road%'
     order by address asc`,
    [agency.id]
  );

  let kingsDetails = null;
  const percy = await client.query(
    `select address, postcode
     from properties
     where agency_id = $1 and lower(address) like '%percy%'
     order by address asc`,
    [agency.id]
  );
  const kingsRawRemit = await client.query(
    `select count(*)::int as c
     from remittance_line_items
     where agency_id = $1 and lower(coalesce(normalized_property_address, raw_property_address, '')) like '%kings road%'`,
    [agency.id]
  );
  const kingsRawCouncilTax = await client.query(
    `select count(*)::int as c
     from council_tax_records
     where agency_id = $1 and lower(coalesce(normalized_property_address, source_property_address, '')) like '%kings road%'`,
    [agency.id]
  );
  if (kings.rows[0]) {
    const propertyId = kings.rows[0].id;
    const remit = await client.query(
      `select cycle_list_number, sum(coalesce(net_amount, received_amount, 0))::numeric(12,2) as amount
       from remittance_line_items
       where agency_id = $1 and (property_id = $2 or lower(coalesce(normalized_property_address, raw_property_address, '')) like '%kings road%')
       group by cycle_list_number
       order by cycle_list_number desc`,
      [agency.id, propertyId]
    );
    const rates = await client.query(
      `select rate_amount, rate_frequency, effective_from, effective_to, status
       from landlord_payment_rates
       where agency_id = $1 and property_id = $2
       order by created_at desc`,
      [agency.id, propertyId]
    );
    const obligations = await client.query(
      `select cycle_list_number, calculated_payment_due, payment_status, due_date, paid_date
       from landlord_payment_obligations
       where agency_id = $1 and property_id = $2
       order by created_at desc
       limit 10`,
      [agency.id, propertyId]
    );
    kingsDetails = {
      property: kings.rows[0],
      remittanceByCycle: remit.rows,
      rates: rates.rows,
      obligations: obligations.rows
    };
  }

  const out = {
    agency,
    counts,
    declaredRooms: (await client.query(`select coalesce(sum(total_rooms),0)::int as c from properties where agency_id = $1`, [agency.id])).rows[0].c,
    kingsRemittanceLineCount: kingsRawRemit.rows[0].c,
    kingsCouncilTaxCount: kingsRawCouncilTax.rows[0].c,
    percyMatches: percy.rows,
    kingsPropertyCount: kings.rows.length,
    kingsDetails
  };
  console.log(JSON.stringify(out, null, 2));

  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
