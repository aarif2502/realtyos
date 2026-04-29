import pg from "pg";

const { Client } = pg;
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const commit = args.has("--commit");

if (!dryRun && !commit) {
  console.error("Pass --dry-run or --commit");
  process.exit(1);
}

const BRAND = {
  site_title: "UK Support Housing Ltd",
  site_tagline: "Supported accommodation services",
  hero_heading: "Supported today. Empowered tomorrow.",
  hero_body: "We provide high-quality supported accommodation across the UK, helping individuals achieve stability, independence, and a brighter future.",
  primary_color: "#0F2540",
  secondary_color: "#D4AF37",
  accent_color: "#E88BA7",
  logo_path: "/uksupporthousing_logo.png",
  logo_width: 140,
  logo_radius: 6,
  contact_email: "info@uksupporthousing.co.uk",
  contact_phone: "07900 123456",
  footer_note: "Supporting people. Building better futures.",
  hero_badge: "Safe, secure and people-centred supported housing",
  process_heading: "A clear pathway from referral to independent living.",
  process_body: "Every resident journey is connected across accommodation, support, compliance and reporting so your team can act with confidence."
};

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
  await client.connect();
  await client.query("begin");

  try {
    const uk = await client.query(
      `select id, name from agencies where lower(name) like '%uk support housing%' order by created_at asc limit 1`
    );
    if (!uk.rowCount) throw new Error("UK Support Housing agency not found");
    const agencyId = uk.rows[0].id;

    const sql = `
      insert into website_settings (
        agency_id, site_title, site_tagline, hero_heading, hero_body, primary_color, secondary_color, accent_color,
        logo_path, logo_width, logo_radius, contact_email, contact_phone, footer_note, hero_badge, process_heading, process_body
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      )
      on conflict (agency_id) do update set
        site_title = excluded.site_title,
        site_tagline = excluded.site_tagline,
        hero_heading = excluded.hero_heading,
        hero_body = excluded.hero_body,
        primary_color = excluded.primary_color,
        secondary_color = excluded.secondary_color,
        accent_color = excluded.accent_color,
        logo_path = excluded.logo_path,
        logo_width = excluded.logo_width,
        logo_radius = excluded.logo_radius,
        contact_email = excluded.contact_email,
        contact_phone = excluded.contact_phone,
        footer_note = excluded.footer_note,
        hero_badge = excluded.hero_badge,
        process_heading = excluded.process_heading,
        process_body = excluded.process_body,
        updated_at = now()
      returning agency_id
    `;
    const values = [
      agencyId,
      BRAND.site_title,
      BRAND.site_tagline,
      BRAND.hero_heading,
      BRAND.hero_body,
      BRAND.primary_color,
      BRAND.secondary_color,
      BRAND.accent_color,
      BRAND.logo_path,
      BRAND.logo_width,
      BRAND.logo_radius,
      BRAND.contact_email,
      BRAND.contact_phone,
      BRAND.footer_note,
      BRAND.hero_badge,
      BRAND.process_heading,
      BRAND.process_body
    ];
    const result = await client.query(sql, values);

    if (dryRun) await client.query("rollback");
    else await client.query("commit");

    console.log(
      JSON.stringify(
        {
          mode: dryRun ? "dry-run" : "commit",
          updatedAgency: uk.rows[0].name,
          updated: result.rowCount
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
