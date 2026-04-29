import crypto from "node:crypto";
import { Pool } from "pg";

const admins = [
  { email: "admin@serenityhousing.com", agencyName: "Serenity Housing", env: "SERENITY_ADMIN_PASSWORD" },
  { email: "admin@uksupporthousing.co.uk", agencyName: "UK Support Housing Ltd", env: "UK_SUPPORT_HOUSING_ADMIN_PASSWORD" },
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
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
  for (const admin of admins) {
    const password = process.env[admin.env];
    if (!password) {
      console.log(`Skipped ${admin.email}; ${admin.env} was not provided.`);
      continue;
    }

    const preferred = await client.query("select id from agencies where lower(name) = lower($1) order by created_at asc limit 1", [admin.agencyName]);
    let agencyId = preferred.rows[0]?.id;
    if (!agencyId) {
      const agencyResult = await client.query(
        `insert into agencies (name, trading_name, contact_email, status, shared_file_root, currency_code)
         values ($1, $1, $2, 'active', '/mnt/storage', 'GBP')
         returning id`,
        [admin.agencyName, admin.email],
      );
      agencyId = agencyResult.rows[0]?.id;
    }
    if (!agencyId) throw new Error(`Unable to create/find ${admin.agencyName}.`);

    await client.query(
      `insert into staff_users (agency_id, full_name, email, role, password_hash, active, force_password_change, password_updated_at)
       values ($1, $2, $3, 'admin', $4, true, true, now())
       on conflict (email) do update set agency_id = excluded.agency_id,
                                      role = 'admin',
                                      password_hash = excluded.password_hash,
                                      active = true,
                                      force_password_change = true,
                                      password_updated_at = now()`,
      [agencyId, `${admin.agencyName} Admin`, admin.email, hashPassword(password)],
    );
    await client.query("update staff_sessions set revoked_at = now() where staff_id in (select id from staff_users where email = $1) and revoked_at is null", [admin.email]);
    console.log(`Ensured Managing Agent admin ${admin.email}; password was not printed.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
