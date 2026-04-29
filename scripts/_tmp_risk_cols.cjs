const { Client } = require("pg");

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  const result = await client.query(
    `select column_name
     from information_schema.columns
     where table_schema='public' and table_name='risk_assessments'
     order by ordinal_position`,
  );
  console.log(result.rows.map((r) => r.column_name).join(","));
  await client.end();
})();
