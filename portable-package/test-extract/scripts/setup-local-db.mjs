import { execFile } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import pg from "pg";

const exec = promisify(execFile);
const { Pool } = pg;

const config = {
  container: process.env.REALTYOS_PG_CONTAINER || "realtyos-postgres",
  database: process.env.REALTYOS_PG_DATABASE || "realtyos",
  user: process.env.REALTYOS_PG_USER || "realtyos",
  password: process.env.REALTYOS_PG_PASSWORD || "realtyos_dev_password",
  port: process.env.REALTYOS_PG_PORT || "5432",
  agencyName: process.env.REALTYOS_AGENCY_NAME || "Supported Housing Management Agency",
  agencyEmail: process.env.REALTYOS_AGENCY_EMAIL || "admin@realtyos.local",
  adminName: process.env.REALTYOS_ADMIN_NAME || "Platform Administrator",
  adminEmail: process.env.REALTYOS_ADMIN_EMAIL || "admin@realtyos.local",
  adminPassword: process.env.REALTYOS_ADMIN_PASSWORD || randomBytes(12).toString("base64url"),
  sharedFileRoot: process.env.REALTYOS_SHARED_FILE_ROOT || "\\\\SERVER\\SupportedHousing",
};

const databaseUrl = `postgres://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@localhost:${config.port}/${config.database}`;

async function docker(args) {
  return exec("docker", args, { windowsHide: true });
}

async function ensureDocker() {
  try {
    await docker(["version", "--format", "{{.Server.Version}}"]);
  } catch {
    throw new Error("Docker Desktop is installed but not running. Start Docker Desktop, then run npm run db:setup-local again.");
  }
}

async function containerExists() {
  const { stdout } = await docker(["ps", "-a", "--filter", `name=^/${config.container}$`, "--format", "{{.Names}}"]);
  return stdout.trim() === config.container;
}

async function containerRunning() {
  const { stdout } = await docker(["ps", "--filter", `name=^/${config.container}$`, "--format", "{{.Names}}"]);
  return stdout.trim() === config.container;
}

async function ensureContainer() {
  if (await containerRunning()) {
    return;
  }

  if (await containerExists()) {
    await docker(["start", config.container]);
    return;
  }

  await docker([
    "run",
    "--name",
    config.container,
    "-e",
    `POSTGRES_DB=${config.database}`,
    "-e",
    `POSTGRES_USER=${config.user}`,
    "-e",
    `POSTGRES_PASSWORD=${config.password}`,
    "-p",
    `${config.port}:5432`,
    "-v",
    `${config.container}-data:/var/lib/postgresql/data`,
    "-d",
    "postgres:16-alpine",
  ]);
}

async function waitForDatabase() {
  const started = Date.now();
  const pool = new Pool({ connectionString: databaseUrl });

  while (Date.now() - started < 60000) {
    try {
      await pool.query("select 1");
      await pool.end();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  await pool.end().catch(() => undefined);
  throw new Error("PostgreSQL container started, but the database did not become ready within 60 seconds.");
}

async function writeEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  let existing = "";

  try {
    existing = await fs.readFile(envPath, "utf8");
  } catch {
    existing = "";
  }

  const values = new Map(
    existing
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );

  values.set("DATABASE_URL", databaseUrl);
  values.set("DATABASE_SSL", "false");
  values.set("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

  const content = `${Array.from(values.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;

  await fs.writeFile(envPath, content, "utf8");
}

function hashPassword(password) {
  const iterations = 210000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

async function migrateAndBootstrap() {
  const schema = await fs.readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(schema);

    const agencyCount = await pool.query("select count(*)::int as count from agencies");
    if (agencyCount.rows[0].count > 0) {
      return { createdAdmin: false };
    }

    const agency = await pool.query(
      `insert into agencies (name, contact_email, shared_file_root)
       values ($1, $2, $3)
       returning id`,
      [config.agencyName, config.agencyEmail, config.sharedFileRoot],
    );

    await pool.query(
      `insert into staff_users (agency_id, full_name, email, role, password_hash)
       values ($1, $2, lower($3), 'admin', $4)`,
      [agency.rows[0].id, config.adminName, config.adminEmail, hashPassword(config.adminPassword)],
    );

    return { createdAdmin: true };
  } finally {
    await pool.end();
  }
}

await ensureDocker();
await ensureContainer();
await waitForDatabase();
await writeEnvLocal();
const result = await migrateAndBootstrap();

console.log("RealtyOS local PostgreSQL is ready.");
console.log(`DATABASE_URL written to ${path.join(process.cwd(), ".env.local")}`);
console.log(`Container: ${config.container}`);
console.log(`Database: ${config.database}`);
if (result.createdAdmin) {
  console.log("Initial admin created:");
  console.log(`  Email: ${config.adminEmail}`);
  console.log(`  Password: ${config.adminPassword}`);
} else {
  console.log("Existing agency detected; admin bootstrap was skipped.");
}
