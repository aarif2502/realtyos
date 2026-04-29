const { Client } = require("pg");

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  const agency = await client.query(
    "select id,name from agencies where lower(name) like $1 order by created_at limit 1",
    ["%serenity%"],
  );
  if (!agency.rowCount) {
    console.log(JSON.stringify({ error: "Serenity agency not found" }));
    await client.end();
    return;
  }
  const agencyId = agency.rows[0].id;

  const counts = await client.query(
    `select
      (select count(*) from properties where agency_id=$1) as properties,
      (select count(*) from rooms where agency_id=$1) as rooms,
      (select count(*) from tenants where agency_id=$1) as tenants,
      (select count(*) from occupancy_records where agency_id=$1) as occupancy,
      (select count(*) from tenancy_contracts where agency_id=$1) as contracts,
      (select count(*) from support_plans where agency_id=$1) as support_plans,
      (select count(*) from risk_assessments where agency_id=$1) as risk_assessments,
      (select count(*) from crm_partners where agency_id=$1) as crm_partners,
      (select count(*) from referrals where agency_id=$1) as referrals,
      (select count(*) from remittance_line_items where agency_id=$1 and cycle_list_number=$2) as remittance_cycle_100,
      (select count(*) from council_tax_records where agency_id=$1 and tax_year=$3) as council_tax_2026`,
    [agencyId, "100", "2026/27"],
  );

  const kings = await client.query(
    "select p.id,p.address,p.landlord_id from properties p where p.agency_id=$1 and upper(p.address) like $2 order by p.created_at limit 1",
    [agencyId, "%KINGS ROAD%"],
  );

  let rate = null;
  let obligations = { rows: [] };
  if (kings.rowCount) {
    const property = kings.rows[0];
    await client.query(
      `insert into landlord_payment_rates
        (agency_id, property_id, landlord_id, rate_amount, rate_frequency, effective_from, status, notes)
       values ($1,$2,$3,$4,'monthly',current_date,'active','Standard monthly landlord rate')
       on conflict do nothing`,
      [agencyId, property.id, property.landlord_id, 200],
    );
    rate = await client.query(
      "select id, rate_amount, rate_frequency, effective_from, effective_to, status from landlord_payment_rates where agency_id=$1 and property_id=$2 and status='active' order by effective_from desc limit 1",
      [agencyId, property.id],
    );
    obligations = await client.query(
      `select lpo.id, lpo.cycle_list_number, lpo.calculated_payment_due, lpo.payment_status, lpo.amount_paid,
              rli.raw_property_address, coalesce(rli.gross_amount,rli.net_amount,0) as received_amount
       from landlord_payment_obligations lpo
       left join remittance_line_items rli on rli.id=lpo.remittance_line_item_id
       where lpo.agency_id=$1 and lpo.property_id=$2
       order by lpo.created_at desc limit 10`,
      [agencyId, property.id],
    );
  }

  const kingsReceived = await client.query(
    `select cycle_list_number, coalesce(sum(coalesce(gross_amount, net_amount, 0)),0) as received
     from remittance_line_items
     where agency_id=$1 and upper(raw_property_address) like $2
     group by cycle_list_number
     order by cycle_list_number desc`,
    [agencyId, "%KINGS ROAD%"],
  );

  console.log(
    JSON.stringify(
      {
        agency: agency.rows[0],
        counts: counts.rows[0],
        kingsProperty: kings.rows[0] || null,
        kingsRate: rate?.rows?.[0] || null,
        kingsReceivedByCycle: kingsReceived.rows,
        kingsObligations: obligations.rows,
      },
      null,
      2,
    ),
  );

  await client.end();
})();
