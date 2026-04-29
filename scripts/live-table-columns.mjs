import pg from "pg";

const { Client } = pg;

const TABLES = [
  "agencies",
  "staff_users",
  "properties",
  "rooms",
  "tenants",
  "occupancy_records",
  "council_tax_records",
  "remittance_batches",
  "remittance_line_items",
  "landlord_payment_rates",
  "landlord_payment_obligations",
  "support_notes"
  , "tenancy_contracts"
  , "support_plans"
  , "risk_assessments"
  , "referrals"
  , "crm_partners"
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
  await client.connect();
  for (const table of TABLES) {
    const exists = await client.query(
      `select 1 from information_schema.tables where table_schema='public' and table_name=$1`,
      [table]
    );
    if (!exists.rowCount) {
      console.log(`${table}: <missing>`);
      continue;
    }
    const cols = await client.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,
      [table]
    );
    console.log(`${table}: ${cols.rows.map((r) => r.column_name).join(", ")}`);
  }
  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
