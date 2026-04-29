import pg from "pg";

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
  await client.connect();

  const constraints = await client.query(
    `select t.relname as table_name, conname, pg_get_constraintdef(c.oid) as definition
     from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     where t.relname in ('tenancy_contracts','support_plans','risk_assessments','referrals','occupancy_records') and contype='c'
     order by t.relname, conname`
  );
  console.log("constraints", JSON.stringify(constraints.rows, null, 2));

  const statuses = await client.query(
    `select status, count(*)::int as c from tenancy_contracts group by status order by c desc`
  ).catch(() => ({ rows: [] }));
  console.log("tenancy_contract_statuses", JSON.stringify(statuses.rows, null, 2));

  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
