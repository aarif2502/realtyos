import pg from "pg";

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
  await client.connect();

  const rows = await client.query(
    `select s.email, s.role, s.active, a.name as agency
     from staff_users s
     left join agencies a on a.id = s.agency_id
     where lower(s.email) in ('admin@serenityhousing.com','admin@uksupporthousing.co.uk','admin@platform.local')
     order by s.email asc`
  );
  console.log(JSON.stringify(rows.rows, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
