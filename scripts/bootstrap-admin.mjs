import { pbkdf2Sync, randomBytes } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const config = {
  agencyName: process.env.REALTYOS_AGENCY_NAME || "Supported Housing Management Agency",
  agencyRegistration: process.env.REALTYOS_AGENCY_REGISTRATION || null,
  agencyLocalAuthority: process.env.REALTYOS_AGENCY_LOCAL_AUTHORITY || null,
  agencyEmail: process.env.REALTYOS_AGENCY_EMAIL || "admin@realtyos.local",
  agencyPhone: process.env.REALTYOS_AGENCY_PHONE || null,
  sharedFileRoot: process.env.REALTYOS_SHARED_FILE_ROOT || process.env.DOCUMENT_STORAGE_ROOT || "/mnt/storage",
  adminName: process.env.REALTYOS_ADMIN_NAME || "Platform Administrator",
  adminEmail: process.env.REALTYOS_ADMIN_EMAIL || "admin@platform.local",
  adminPassword: process.env.REALTYOS_ADMIN_PASSWORD || randomBytes(12).toString("base64url"),
};

function hashPassword(password) {
  const iterations = 210000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  const agencyCount = await pool.query("select count(*)::int as count from agencies");
  if (agencyCount.rows[0].count > 0) {
    console.log("Existing agency detected; bootstrap skipped.");
    process.exit(0);
  }

  const agency = await pool.query(
    `insert into agencies (name, registration_number, local_authority, contact_email, contact_phone, shared_file_root)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [
      config.agencyName,
      config.agencyRegistration,
      config.agencyLocalAuthority,
      config.agencyEmail,
      config.agencyPhone,
      config.sharedFileRoot,
    ],
  );

  await pool.query(
    `insert into staff_users (agency_id, full_name, email, role, password_hash)
     values ($1, $2, lower($3), 'admin', $4)`,
    [agency.rows[0].id, config.adminName, config.adminEmail, hashPassword(config.adminPassword)],
  );

  console.log("Initial agency and admin created.");
  console.log(`Admin email: ${config.adminEmail}`);
  console.log(`Admin password: ${config.adminPassword}`);
} finally {
  await pool.end();
}
