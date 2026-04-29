import crypto from "node:crypto";
import { Pool } from "pg";

const email = (process.env.PLATFORM_SUPER_ADMIN_EMAIL || "admin@platform.local").toLowerCase();
const password = process.env.PLATFORM_SUPER_ADMIN_PASSWORD;
const resetPassword = process.env.RESET_PLATFORM_SUPER_ADMIN_PASSWORD === "true";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!password) {
  console.error("PLATFORM_SUPER_ADMIN_PASSWORD is required. The password is never printed or stored in plaintext.");
  process.exit(1);
}

function hashPassword(value) {
  const iterations = 210000;
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(value, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const client = await pool.connect();
try {
  await client.query("begin");

  const agencyResult = await client.query(
    `insert into agencies (name, trading_name, contact_email, status, shared_file_root, currency_code)
     values ('Platform Administration', 'Platform Administration', $1, 'active', '/mnt/storage', 'GBP')
     on conflict do nothing
     returning id`,
    [email],
  );
  let agencyId = agencyResult.rows[0]?.id;
  if (!agencyId) {
    const existing = await client.query("select id from agencies where lower(name) = lower('Platform Administration') limit 1");
    agencyId = existing.rows[0]?.id;
  }
  if (!agencyId) throw new Error("Unable to create or find Platform Administration agency.");

  const existingUser = await client.query("select id from staff_users where email = $1 limit 1", [email]);
  const passwordHash = hashPassword(password);

  if (!existingUser.rowCount) {
    await client.query(
      `insert into staff_users (agency_id, full_name, email, role, password_hash, active, force_password_change, password_updated_at)
       values ($1, 'Platform Super Admin', $2, 'platform_admin', $3, true, true, now())`,
      [agencyId, email, passwordHash],
    );
  } else if (resetPassword) {
    await client.query(
      `update staff_users
       set agency_id = $2,
           full_name = coalesce(nullif(full_name, ''), 'Platform Super Admin'),
           role = 'platform_admin',
           password_hash = $3,
           active = true,
           force_password_change = true,
           password_updated_at = now()
       where email = $1`,
      [email, agencyId, passwordHash],
    );
    await client.query("update staff_sessions set revoked_at = now() where staff_id = $1 and revoked_at is null", [existingUser.rows[0].id]);
  } else {
    await client.query("update staff_users set agency_id = $2, role = 'platform_admin', active = true where email = $1", [email, agencyId]);
  }

  await client.query("commit");
  console.log(`Platform admin ensured for ${email}. Password was accepted via environment variable and was not printed.`);
} catch (error) {
  await client.query("rollback");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
