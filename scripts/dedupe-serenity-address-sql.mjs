import pg from "pg";

const { Client } = pg;
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const commit = args.has("--commit");

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

    const dupes = await client.query(
      `with normalized as (
         select id, agency_id, address, postcode,
                trim(regexp_replace(regexp_replace(lower(regexp_replace(address,'[^a-zA-Z0-9 ]',' ','g')), '\m[a-z]{1,2}[0-9][a-z0-9]?\s*[0-9][a-z]{2}\M', ' ', 'g'), '\s+', ' ', 'g')) as addr_key
         from properties
         where agency_id = $1
       )
       select addr_key, array_agg(id order by (postcode is not null) desc, id asc) ids, count(*)::int c
       from normalized
       where addr_key <> ''
       group by addr_key
       having count(*) > 1`,
      [agencyId]
    );

    let merged = 0;
    let refUpdates = 0;
    for (const row of dupes.rows) {
      const ids = row.ids;
      const canonical = ids[0];
      for (const dupe of ids.slice(1)) {
        for (const table of ["rooms", "tenants", "occupancy_records", "council_tax_records", "remittance_line_items", "support_notes", "incidents", "maintenance_jobs", "landlord_payment_obligations"]) {
          try {
            const result = await client.query(`update ${table} set property_id = $2 where property_id = $1`, [dupe, canonical]);
            refUpdates += result.rowCount || 0;
          } catch {}
        }
        await client.query("delete from landlord_payment_rates where agency_id=$1 and property_id=$2", [agencyId, dupe]).catch(() => {});
        await client.query("delete from properties where id=$1 and agency_id=$2", [dupe, agencyId]);
        merged += 1;
      }
    }

    if (dryRun) await client.query("rollback");
    else await client.query("commit");

    console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "commit", duplicateGroups: dupes.rowCount, merged, refUpdates }, null, 2));
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
