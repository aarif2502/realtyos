import pg from "pg";

const { Client } = pg;
const argv = process.argv.slice(2);
const args = new Set(argv);
const tokenArg = argv.find((item) => item.startsWith("--token="));
const token = tokenArg ? tokenArg.slice("--token=".length).trim().toLowerCase() : "";
const dryRun = args.has("--dry-run");
const commit = args.has("--commit");

if (!token) {
  console.error("Use --token=<address token>");
  process.exit(1);
}
if (!dryRun && !commit) {
  console.error("Pass --dry-run or --commit");
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
  await client.connect();
  await client.query("begin");
  try {
    const agency = await client.query(`select id from agencies where lower(name) like '%serenity%' limit 1`);
    const agencyId = agency.rows[0]?.id;
    if (!agencyId) throw new Error("Serenity agency not found");

    const properties = await client.query(
      `select id, address, postcode,
              (case when postcode is not null and postcode <> '' then 1 else 0 end) as has_postcode
       from properties
       where agency_id = $1 and lower(address) like $2
       order by has_postcode desc, id asc`,
      [agencyId, `%${token}%`]
    );

    if (properties.rowCount < 2) {
      if (dryRun) await client.query("rollback");
      else await client.query("commit");
      console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "commit", token, merged: 0, reason: "No duplicates found for token." }, null, 2));
      return;
    }

    const canonical = properties.rows[0];
    let merged = 0;
    let refUpdates = 0;
    for (const dupe of properties.rows.slice(1)) {
      for (const table of ["rooms", "tenants", "occupancy_records", "council_tax_records", "remittance_line_items", "support_notes", "incidents", "maintenance_jobs", "landlord_payment_obligations"]) {
        try {
          const result = await client.query(`update ${table} set property_id = $2 where property_id = $1`, [dupe.id, canonical.id]);
          refUpdates += result.rowCount || 0;
        } catch {}
      }
      await client.query("delete from landlord_payment_rates where agency_id = $1 and property_id = $2", [agencyId, dupe.id]).catch(() => {});
      await client.query("delete from properties where id = $1 and agency_id = $2", [dupe.id, agencyId]);
      merged += 1;
    }

    if (dryRun) await client.query("rollback");
    else await client.query("commit");
    console.log(
      JSON.stringify(
        {
          mode: dryRun ? "dry-run" : "commit",
          token,
          canonical: { id: canonical.id, address: canonical.address, postcode: canonical.postcode },
          merged,
          refUpdates
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
