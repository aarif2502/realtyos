import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const requireFromRuntime = createRequire(
  path.join(process.env.MANUAL_NODE_MODULES || process.cwd(), "manual-runtime.js"),
);
const { chromium } = requireFromRuntime("playwright");

const baseUrl = process.env.MANUAL_BASE_URL || "https://www.uksupporthousing.co.uk";
const email = process.env.MANUAL_ADMIN_EMAIL;
const password = process.env.MANUAL_ADMIN_PASSWORD;
const outDir = path.resolve("docs/manual-assets/screenshots");

const shots = [
  { name: "01-public-home.png", url: "/", title: "Public website homepage", auth: false },
  { name: "02-login.png", url: "/realtyos/admin/login", title: "Admin login page", auth: false },
  { name: "03-overview.png", url: "/realtyos/app", title: "Overview dashboard", auth: true, redact: true },
  { name: "04-setup-checklist.png", url: "/realtyos/app/setup", title: "Setup Panel checklist", auth: true, redact: true },
  { name: "05-setup-company-profile.png", url: "/realtyos/app/setup?activity=company_profile", title: "Company Profile activity", auth: true, redact: true },
  { name: "06-setup-branding.png", url: "/realtyos/app/setup?activity=branding", title: "Branding activity", auth: true, redact: true },
  { name: "07-setup-data-import.png", url: "/realtyos/app/setup?activity=source_data_import", title: "Excel import activity", auth: true, redact: true },
  { name: "08-crm-workspace.png", url: "/realtyos/app/crm", title: "CRM workspace", auth: true, redact: true },
  { name: "09-pms-properties.png", url: "/realtyos/app/properties", title: "PMS properties", auth: true, redact: true },
  { name: "10-documents.png", url: "/realtyos/app/documents", title: "Documents module", auth: true, redact: true },
  { name: "11-reports-bi.png", url: "/realtyos/app/analytics", title: "Reports and BI", auth: true, redact: true },
  { name: "12-settings.png", url: "/realtyos/app/settings", title: "Settings page", auth: true, redact: true },
];

async function ensureLoggedIn(page) {
  if (!email || !password) {
    throw new Error("MANUAL_ADMIN_EMAIL and MANUAL_ADMIN_PASSWORD are required for authenticated screenshots.");
  }
  await page.goto(`${baseUrl}/realtyos/admin/login`, { waitUntil: "networkidle" });
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.locator('button[type="submit"], button:has-text("Sign in")').first().click();
  await page.waitForLoadState("networkidle");
}

async function applyRedaction(page) {
  await page.addStyleTag({
    content: `
      input[type="email"],
      input[name*="email" i],
      input[name*="phone" i],
      input[name*="password" i],
      tbody td,
      .manual-private,
      [data-private="true"] {
        filter: blur(4px) !important;
      }
      input[type="password"] { color: transparent !important; }
      .text-rose-800, .text-rose-700 { filter: blur(3px) !important; }
    `,
  });
}

await fs.mkdir(outDir, { recursive: true });

const chromePath = process.env.MANUAL_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });

try {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "01-public-home.png"), fullPage: false });

  await page.goto(`${baseUrl}/realtyos/admin/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "02-login.png"), fullPage: false });

  await ensureLoggedIn(page);

  for (const shot of shots.filter((item) => item.auth)) {
    await page.goto(`${baseUrl}${shot.url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    if (shot.redact) await applyRedaction(page);
    await page.screenshot({ path: path.join(outDir, shot.name), fullPage: false });
  }
} finally {
  await browser.close();
}

console.log(`Manual screenshots saved to ${outDir}`);
