const base = process.env.REALTYOS_SMOKE_BASE || "http://127.0.0.1";
const adminEmail = process.env.REALTYOS_SMOKE_EMAIL || process.env.REALTYOS_ADMIN_EMAIL || "admin@platform.local";
const adminPassword = process.env.REALTYOS_SMOKE_PASSWORD || process.env.REALTYOS_ADMIN_PASSWORD;

async function check(path, expected = [200, 302, 401]) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  if (!expected.includes(response.status)) {
    throw new Error(`${path} returned ${response.status}, expected ${expected.join(", ")}`);
  }
  console.log(`${path}: ${response.status}`);
  return response;
}

await check("/");
await check("/realtyos");
await check("/realtyos/admin/login");
await check("/realtyos/api/erp", [401, 503]);

if (adminPassword) {
  const response = await fetch(`${base}/realtyos/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  if (!response.ok) {
    throw new Error(`Admin login smoke test failed with ${response.status}`);
  }
  console.log("Authenticated admin login smoke test passed.");
} else {
  console.log("Skipping authenticated smoke test because REALTYOS_SMOKE_PASSWORD/REALTYOS_ADMIN_PASSWORD is not set.");
}
