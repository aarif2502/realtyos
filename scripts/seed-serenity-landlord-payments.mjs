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
  console.error("DATABASE_URL is required");
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
    const agency = await client.query(
      `select id from agencies where lower(name) like '%serenity%' order by created_at asc limit 1`
    );
    if (!agency.rowCount) throw new Error("Serenity agency not found");
    const agencyId = agency.rows[0].id;

    const properties = await client.query(
      `select p.id, p.landlord_id
       from properties p
       where p.agency_id = $1`,
      [agencyId]
    );

    let ratesCreated = 0;
    for (const property of properties.rows) {
      const existing = await client.query(
        `select id from landlord_payment_rates
         where agency_id = $1 and property_id = $2 and status = 'active'
         order by created_at desc
         limit 1`,
        [agencyId, property.id]
      );
      if (!existing.rowCount) {
        ratesCreated += 1;
        if (commit) {
          await client.query(
            `insert into landlord_payment_rates
             (agency_id, property_id, landlord_id, rate_amount, rate_frequency, effective_from, status, notes, metadata)
             values ($1,$2,$3,200,'monthly',current_date,'active',$4,$5)`,
            [
              agencyId,
              property.id,
              property.landlord_id,
              "Default Serenity landlord monthly rate",
              JSON.stringify({ source: "cycle100_baseline" })
            ]
          );
        }
      }
    }

    const remittance = await client.query(
      `select rl.id as remittance_line_item_id,
              rl.remittance_batch_id,
              rl.cycle_list_number,
              rl.property_id,
              coalesce(rl.landlord_id, p.landlord_id) as landlord_id,
              coalesce(rl.net_amount, rl.gross_amount, rl.expected_amount, 0)::numeric as received_amount
       from remittance_line_items rl
       left join properties p on p.id = rl.property_id
       where rl.agency_id = $1
         and rl.cycle_list_number = '100'
         and rl.property_id is not null`,
      [agencyId]
    );

    let obligationsCreated = 0;
    for (const row of remittance.rows) {
      const exists = await client.query(
        `select id from landlord_payment_obligations
         where agency_id = $1 and remittance_line_item_id = $2
         limit 1`,
        [agencyId, row.remittance_line_item_id]
      );
      if (exists.rowCount) continue;
      obligationsCreated += 1;
      if (commit) {
        const rate = await client.query(
          `select rate_amount
           from landlord_payment_rates
           where agency_id = $1 and property_id = $2 and status = 'active'
             and (effective_to is null or effective_to >= current_date)
           order by effective_from desc nulls last, created_at desc
           limit 1`,
          [agencyId, row.property_id]
        );
        const due = Number(rate.rows[0]?.rate_amount ?? 0);
        const status = due > 0 ? "pending" : "disputed";
        await client.query(
          `insert into landlord_payment_obligations
           (agency_id, remittance_batch_id, remittance_line_item_id, cycle_list_number, property_id, landlord_id,
            received_amount, landlord_rate_amount, calculated_payment_due, due_date, payment_status, notes, metadata)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,current_date + interval '7 day',$10,$11,$12)`,
          [
            agencyId,
            row.remittance_batch_id,
            row.remittance_line_item_id,
            row.cycle_list_number,
            row.property_id,
            row.landlord_id,
            row.received_amount,
            due,
            due,
            status,
            "Auto-calculated from Cycle 100 remittance.",
            JSON.stringify({ calculation: "monthly_rate", source: "remittance_line_item" })
          ]
        );
      }
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
          agencyId,
          ratesCreated,
          obligationsCreated,
          remittanceLinesConsidered: remittance.rowCount
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
