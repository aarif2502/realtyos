import pg from "pg";

const { Client } = pg;
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const commit = args.has("--commit");

if (!dryRun && !commit) {
  console.error("Pass --dry-run or --commit");
  process.exit(1);
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
  await client.connect();
  await client.query("begin");
  try {
    const agency = await client.query(
      `select id from agencies where lower(name) like '%serenity%' order by created_at asc limit 1`
    );
    if (!agency.rowCount) throw new Error("Serenity agency not found");
    const agencyId = agency.rows[0].id;

    const properties = await client.query(
      `select id, address, postcode from properties where agency_id = $1`,
      [agencyId]
    );

    const ct = await client.query(
      `select id, source_property_address, normalized_property_address
       from council_tax_records
       where agency_id = $1 and (property_id is null or status = 'needs_review')`,
      [agencyId]
    );

    let updated = 0;
    const suggestions = [];
    for (const row of ct.rows) {
      const target = normalize(row.normalized_property_address || row.source_property_address);
      if (!target) continue;

      const matches = properties.rows
        .map((p) => ({ ...p, key: normalize(`${p.address} ${p.postcode || ""}`) }))
        .filter((p) => p.key.includes(target) || target.includes(p.key))
        .slice(0, 3);

      if (matches.length === 1) {
        updated += 1;
        if (commit) {
          await client.query(
            `update council_tax_records
             set property_id = $2,
                 status = 'matched',
                 needs_review_reason = null,
                 updated_at = now()
             where id = $1 and agency_id = $3`,
            [row.id, matches[0].id, agencyId]
          );
        }
      } else if (matches.length > 1) {
        suggestions.push({
          councilTaxId: row.id,
          address: row.source_property_address,
          options: matches.map((m) => ({ propertyId: m.id, address: m.address, postcode: m.postcode }))
        });
      }
    }

    if (dryRun) {
      await client.query("rollback");
    } else {
      await client.query("commit");
    }

    const remaining = await client.query(
      `select count(*)::int as c
       from council_tax_records
       where agency_id = $1 and (property_id is null or status = 'needs_review')`,
      [agencyId]
    );

    console.log(
      JSON.stringify(
        {
          mode: dryRun ? "dry-run" : "commit",
          autoMatched: updated,
          remainingNeedsReview: remaining.rows[0].c,
          ambiguousSuggestions: suggestions.slice(0, 25)
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
