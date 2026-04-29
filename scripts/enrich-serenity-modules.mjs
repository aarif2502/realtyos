import pg from "pg";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

function riskLevel(value) {
  const text = String(value || "").toUpperCase();
  if (text === "HIGH") return "high";
  if (text === "MEDIUM") return "medium";
  return "low";
}

function contractNo(tenant) {
  const key = String(tenant.hb_claim_ref_number || "NOREF").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `SER-C100-${key}-${tenant.id.slice(0, 8)}`;
}

async function main() {
  await client.connect();
  await client.query("begin");
  try {
    const agency = await client.query(
      "select id from agencies where lower(name) like $1 order by created_at limit 1",
      ["%serenity%"],
    );
    if (!agency.rowCount) throw new Error("Serenity Housing agency not found.");
    const agencyId = agency.rows[0].id;

    const staff = await client.query(
      "select id from staff_users where agency_id = $1 and role in ('admin','manager','housing_officer') and active = true order by created_at asc limit 1",
      [agencyId],
    );
    const staffId = staff.rows[0]?.id ?? null;

    const tenants = await client.query(
      `select t.id, t.property_id, t.room_id, t.first_name, t.last_name, t.hb_claim_ref_number,
              t.checkin_date, t.checkout_date, t.risk_assessment, r.weekly_rent
       from tenants t
       left join rooms r on r.id = t.room_id and r.agency_id = t.agency_id
       where t.agency_id = $1`,
      [agencyId],
    );

    let contracts = 0;
    let supportPlans = 0;
    let riskAssessments = 0;
    let referrals = 0;

    for (const tenant of tenants.rows) {
      if (tenant.property_id && tenant.room_id) {
        const contract = await client.query(
          "select id from tenancy_contracts where agency_id = $1 and tenant_id = $2 limit 1",
          [agencyId, tenant.id],
        );
        if (!contract.rowCount) {
          await client.query(
            `insert into tenancy_contracts
              (agency_id, tenant_id, property_id, room_id, contract_number, start_date, end_date, weekly_rent, status)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              agencyId,
              tenant.id,
              tenant.property_id,
              tenant.room_id,
              contractNo(tenant),
              tenant.checkin_date || new Date().toISOString().slice(0, 10),
              tenant.checkout_date || null,
              Number(tenant.weekly_rent || 0),
              tenant.checkout_date ? "expired" : "active",
            ],
          );
          contracts += 1;
        }
      }

      const plan = await client.query(
        "select id from support_plans where agency_id = $1 and tenant_id = $2 limit 1",
        [agencyId, tenant.id],
      );
      if (!plan.rowCount) {
        await client.query(
          `insert into support_plans
            (agency_id, tenant_id, status, goals, review_date, owner_id)
           values ($1,$2,$3,$4,$5,$6)`,
          [
            agencyId,
            tenant.id,
            tenant.checkout_date ? "closed" : "active",
            "Stabilise tenancy, maintain support engagement, progress outcomes.",
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            staffId,
          ],
        );
        supportPlans += 1;
      }

      const risk = await client.query(
        "select id from risk_assessments where agency_id = $1 and tenant_id = $2 limit 1",
        [agencyId, tenant.id],
      );
      if (!risk.rowCount) {
        await client.query(
          `insert into risk_assessments
            (agency_id, tenant_id, assessor_id, risk_level, safeguarding_concerns, mitigation_plan, review_date)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [
            agencyId,
            tenant.id,
            staffId,
            String(tenant.risk_assessment || "LOW").toUpperCase(),
            "Imported baseline safeguarding concerns from Cycle 100 context.",
            "Continue weekly check-ins and tenancy sustainment support.",
            new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          ],
        );
        riskAssessments += 1;
      }

      if (tenant.hb_claim_ref_number) {
        const ref = await client.query(
          "select id from referrals where agency_id = $1 and tenant_id = $2 limit 1",
          [agencyId, tenant.id],
        );
        if (!ref.rowCount) {
          await client.query(
            `insert into referrals
              (agency_id, tenant_id, applicant_name, source, status, priority, notes)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [
              agencyId,
              tenant.id,
              `${tenant.first_name} ${tenant.last_name}`.trim(),
              "Council/HB",
              tenant.checkout_date ? "converted" : "approved",
              "normal",
              "Created from Cycle 100 import context.",
            ],
          );
          referrals += 1;
        }
      }
    }

    const hasPartner = await client.query(
      "select id from crm_partners where agency_id = $1 and lower(organisation_name) = lower($2) limit 1",
      [agencyId, "Ash-Shahada Housing Association Ltd"],
    );
    let crmPartners = 0;
    if (!hasPartner.rowCount) {
      await client.query(
        `insert into crm_partners
          (agency_id, type, organisation_name, notes)
         values ($1,'support_provider',$2,$3)`,
        [agencyId, "Ash-Shahada Housing Association Ltd", "Created by Serenity module enrichment pass."],
      );
      crmPartners = 1;
    }

    await client.query("commit");
    console.log(
      JSON.stringify(
        {
          committed: true,
          agencyId,
          created: { contracts, supportPlans, riskAssessments, referrals, crmPartners },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
