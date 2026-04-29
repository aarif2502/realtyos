import pg from "pg";

const { Client } = pg;
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const commit = args.has("--commit");

if (!dryRun && !commit) {
  console.error("Pass --dry-run or --commit");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAddressCore(value) {
  const text = normalizeText(value);
  const noPostcode = text.replace(/\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/g, " ").replace(/\s+/g, " ").trim();
  return noPostcode;
}

async function countLinks(client, propertyId) {
  const tables = [
    ["rooms", "property_id"],
    ["tenants", "property_id"],
    ["occupancy_records", "property_id"],
    ["council_tax_records", "property_id"],
    ["remittance_line_items", "property_id"],
    ["support_notes", "property_id"],
    ["incidents", "property_id"],
    ["maintenance_jobs", "property_id"],
    ["landlord_payment_obligations", "property_id"]
  ];
  let total = 0;
  const existing = await client.query(
    `select table_name, column_name
     from information_schema.columns
     where table_schema='public'
       and table_name = any($1::text[])`,
    [tables.map((entry) => entry[0])]
  );
  const allowed = new Set(existing.rows.map((row) => `${row.table_name}.${row.column_name}`));
  for (const [table, col] of tables) {
    if (!allowed.has(`${table}.${col}`)) continue;
    const row = await client.query(`select count(*)::int c from ${table} where ${col} = $1`, [propertyId]);
    total += row.rows[0].c;
  }
  return total;
}

async function updatePropertyRef(client, table, col, fromId, toId, allowedColumns) {
  if (!allowedColumns.has(`${table}.${col}`)) return 0;
  const row = await client.query(`update ${table} set ${col} = $2 where ${col} = $1`, [fromId, toId]);
  return row.rowCount || 0;
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
    if (!agency.rowCount) throw new Error("Serenity agency not found.");
    const agencyId = agency.rows[0].id;

    const properties = await client.query(
      `select id, address, postcode, local_authority, total_rooms
       from properties
       where agency_id = $1
       order by created_at asc`,
      [agencyId]
    );

    const groups = new Map();
    const schemaRows = await client.query(
      `select table_name, column_name
       from information_schema.columns
       where table_schema='public'
         and table_name = any($1::text[])`,
      [[
        "rooms",
        "tenants",
        "occupancy_records",
        "council_tax_records",
        "remittance_line_items",
        "support_notes",
        "incidents",
        "maintenance_jobs",
        "landlord_payment_obligations"
      ]]
    );
    const allowedColumns = new Set(schemaRows.rows.map((row) => `${row.table_name}.${row.column_name}`));
    for (const p of properties.rows) {
      const addressKey = normalizeAddressCore(p.address);
      if (!addressKey) continue;
      const postKey = normalizeText(p.postcode);
      const key = `${addressKey}|${postKey || "nopostcode"}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    const duplicateGroups = [...groups.values()].filter((list) => list.length > 1);
    let mergedProperties = 0;
    let deletedProperties = 0;
    let updatedReferences = 0;
    let mergedRooms = 0;

    for (const group of duplicateGroups) {
      const scored = [];
      for (const p of group) {
        const linkCount = await countLinks(client, p.id);
        const score = (p.postcode ? 1000 : 0) + linkCount;
        scored.push({ ...p, score });
      }
      scored.sort((a, b) => b.score - a.score);
      const canonical = scored[0];
      const dupes = scored.slice(1);

      for (const dupe of dupes) {
        const tables = [
          ["rooms", "property_id"],
          ["tenants", "property_id"],
          ["occupancy_records", "property_id"],
          ["council_tax_records", "property_id"],
          ["remittance_line_items", "property_id"],
          ["support_notes", "property_id"],
          ["incidents", "property_id"],
          ["maintenance_jobs", "property_id"],
          ["landlord_payment_obligations", "property_id"]
        ];
        for (const [table, col] of tables) {
          updatedReferences += await updatePropertyRef(client, table, col, dupe.id, canonical.id, allowedColumns);
        }

        const canonicalRow = await client.query(`select postcode, local_authority, total_rooms from properties where id = $1`, [canonical.id]);
        const c = canonicalRow.rows[0];
        if (!c.postcode && dupe.postcode) {
          await client.query(`update properties set postcode = $2 where id = $1`, [canonical.id, dupe.postcode]);
        }
        if (!c.local_authority && dupe.local_authority) {
          await client.query(`update properties set local_authority = $2 where id = $1`, [canonical.id, dupe.local_authority]);
        }
        if ((Number(c.total_rooms || 0) || 0) < Number(dupe.total_rooms || 0)) {
          await client.query(`update properties set total_rooms = $2 where id = $1`, [canonical.id, dupe.total_rooms]);
        }

        // Prevent unique-rate conflicts when property duplicates are merged.
        await client.query(`delete from landlord_payment_rates where agency_id = $1 and property_id = $2`, [agencyId, dupe.id]).catch(() => {});

        await client.query(`delete from properties where id = $1 and agency_id = $2`, [dupe.id, agencyId]);
        mergedProperties += 1;
        deletedProperties += 1;
      }
    }

    const rooms = await client.query(
      `select id, property_id, room_label from rooms where agency_id = $1 order by room_label asc, id asc`,
      [agencyId]
    ).catch(() => ({ rows: [] }));

    if (rooms.rows.length) {
      const roomGroups = new Map();
      for (const r of rooms.rows) {
        const key = `${r.property_id}|${normalizeText(r.room_label)}`;
        if (!key.endsWith("|")) {
          if (!roomGroups.has(key)) roomGroups.set(key, []);
          roomGroups.get(key).push(r);
        }
      }
      for (const group of roomGroups.values()) {
        if (group.length < 2) continue;
        const canonical = group[0];
        for (const dupe of group.slice(1)) {
          try {
            updatedReferences += await updatePropertyRef(client, "tenants", "room_id", dupe.id, canonical.id, allowedColumns);
            updatedReferences += await updatePropertyRef(client, "occupancy_records", "room_id", dupe.id, canonical.id, allowedColumns);
            await client.query("delete from rooms where id = $1 and agency_id = $2", [dupe.id, agencyId]);
            mergedRooms += 1;
          } catch {
            // ignore row-level failures, keep safe
          }
        }
      }
    }

    const duplicateTenantOccupancy = await client.query(
      `select tenant_id, count(*)::int c
       from occupancy_records
       where agency_id = $1 and coalesce(record_status,'active') not in ('expired','archived','superseded','vacant')
         and tenant_id is not null
       group by tenant_id
       having count(*) > 1`,
      [agencyId]
    );

    let occupancyResolved = 0;
    for (const row of duplicateTenantOccupancy.rows) {
      const occ = await client.query(
        `select id
         from occupancy_records
         where agency_id = $1 and tenant_id = $2 and coalesce(record_status,'active') not in ('expired','archived','superseded','vacant')
         order by checkin_date desc nulls last, created_at desc`,
        [agencyId, row.tenant_id]
      );
      const keep = occ.rows[0]?.id;
      for (const item of occ.rows.slice(1)) {
        await client.query(
          `update occupancy_records
           set record_status = 'archived', status_reason = 'Automatic dedupe: duplicate active occupancy for same tenant', updated_at = now()
           where id = $1`,
          [item.id]
        );
        occupancyResolved += 1;
      }
      if (!keep) continue;
    }

    if (dryRun) {
      await client.query("rollback");
    } else {
      await client.query("commit");
    }

    console.log(
      JSON.stringify(
        {
          mode: dryRun ? "dry-run" : "commit",
          duplicateGroups: duplicateGroups.length,
          mergedProperties,
          deletedProperties,
          mergedRooms,
          updatedReferences,
          occupancyResolved
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
