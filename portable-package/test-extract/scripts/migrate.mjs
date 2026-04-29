import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Example: postgres://user:password@localhost:5432/realtyos");
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), "db", "schema.sql");
const sql = await fs.readFile(schemaPath, "utf8");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await pool.query(sql);
  console.log("PostgreSQL schema migrated successfully.");
} finally {
  await pool.end();
}
