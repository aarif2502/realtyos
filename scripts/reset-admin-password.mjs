import { pbkdf2Sync, randomBytes } from "node:crypto";
import fs from "node:fs";
import pg from "pg";

const password = process.env.REALTYOS_RESET_ADMIN_PASSWORD;
const email = process.env.REALTYOS_RESET_ADMIN_EMAIL || process.env.REALTYOS_ADMIN_EMAIL || "admin@platform.local";

if (!password) {
  console.error("Set REALTYOS_RESET_ADMIN_PASSWORD before resetting an admin password.");
  process.exit(1);
}

function readEnv() {
  const entries = fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^'|'$/g, "")];
    });
  return Object.fromEntries(entries);
}

const salt = randomBytes(16).toString("hex");
const hash = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");
const stored = `pbkdf2:210000:${salt}:${hash}`;
const env = readEnv();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || env.DATABASE_URL });

await pool.query("update staff_users set password_hash = $1, active = true where email = lower($2)", [stored, email]);
await pool.end();

console.log(`Admin password reset for ${email}. Password was not printed.`);
