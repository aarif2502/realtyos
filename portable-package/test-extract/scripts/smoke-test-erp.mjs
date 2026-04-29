const base = process.env.REALTYOS_SMOKE_BASE || "http://127.0.0.1";

async function request(label, path, init) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  console.log(`${label}: ${response.status} ${text.slice(0, 240).replace(/\s+/g, " ")}`);
  if (!response.ok) {
    process.exitCode = 1;
  }
  return { response, text };
}

await request("login", "/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "admin@realtyos.local", password: "AdminTemp2026!" }),
});

await request("create staff", "/api/erp/staff", {
  method: "POST",
  body: JSON.stringify({
    fullName: "Aesha Akhtar",
    email: "aesha.akhtar@uksupporthousing.co.uk",
    role: "admin",
    password: "TempPass2026!",
  }),
});

await request("update agency", "/api/erp/agency", {
  method: "PATCH",
  body: JSON.stringify({
    name: "Supported Housing Management Agency",
    currencyCode: "GBP",
    contactEmail: "admin@realtyos.local",
  }),
});

const erp = await fetch(`${base}/api/erp`).then((response) => response.json());
console.log(
  `snapshot: properties=${erp.properties?.length ?? 0} tenants=${erp.tenants?.length ?? 0} rooms=${erp.rooms?.length ?? 0} staff=${erp.staff?.length ?? 0}`,
);
