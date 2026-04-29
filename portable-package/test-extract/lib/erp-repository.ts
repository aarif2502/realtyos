import { first, query } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";

export type StaffRole = "admin" | "manager" | "support_worker" | "housing_officer" | "finance" | "readonly";

export const defaultWebsiteSettings = {
  site_title: "UK Support Housing",
  site_tagline: "Supported accommodation services",
  hero_heading: "Homes, support and accountability for supported living.",
  hero_body:
    "UK Support Housing helps residents, landlords and local partners manage supported accommodation with clear records, responsive repairs and practical weekly support.",
  primary_color: "#172033",
  secondary_color: "#f4c542",
  accent_color: "#b99024",
  logo_path: "/HomeSupport_logo.jpeg",
  logo_width: 96,
  logo_radius: 4,
  body_font_family: "Inter, Arial, sans-serif",
  body_font_size: 16,
  heading_font_size: 56,
  nav_font_size: 14,
  hero_body_font_size: 18,
  card_heading_font_size: 20,
  footer_font_size: 14,
  nav_text_color: "#172033",
  hero_text_color: "#172033",
  body_text_color: "#526075",
  contact_email: "info@uksupporthousing.co.uk",
  contact_phone: "",
  contact_address: "",
  footer_note: "Supported accommodation services powered by a secure operational platform.",
};

export type AgencySetupInput = {
  agencyName: string;
  registrationNumber?: string;
  localAuthority?: string;
  contactEmail: string;
  contactPhone?: string;
  sharedFileRoot?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export async function getBootstrapStatus() {
  const agency = await first<{ count: string }>("select count(*)::text as count from agencies");
  const staff = await first<{ count: string }>("select count(*)::text as count from staff_users");
  return {
    hasAgency: Number(agency?.count ?? 0) > 0,
    hasStaff: Number(staff?.count ?? 0) > 0,
  };
}

export async function setupAgency(input: AgencySetupInput) {
  const existing = await getBootstrapStatus();
  if (existing.hasAgency || existing.hasStaff) {
    throw new Error("Agency setup has already been completed.");
  }

  const agency = await first<{ id: string }>(
    `insert into agencies (name, registration_number, local_authority, contact_email, contact_phone, shared_file_root)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [
      input.agencyName,
      input.registrationNumber || null,
      input.localAuthority || null,
      input.contactEmail,
      input.contactPhone || null,
      input.sharedFileRoot || null,
    ],
  );

  if (!agency) {
    throw new Error("Unable to create agency.");
  }

  await query(
    `insert into staff_users (agency_id, full_name, email, role, password_hash)
     values ($1, $2, lower($3), 'admin', $4)`,
    [agency.id, input.adminName, input.adminEmail, hashPassword(input.adminPassword)],
  );

  return agency;
}

export async function getAgencyId() {
  const agency = await first<{ id: string }>("select id from agencies order by created_at asc limit 1");
  return agency?.id ?? null;
}

export async function getWebsiteSettings() {
  const agencyId = await getAgencyId();
  if (!agencyId) return defaultWebsiteSettings;

  const settings = await first(
    `insert into website_settings (agency_id)
     values ($1)
     on conflict (agency_id) do nothing
     returning *`,
    [agencyId],
  );

  return settings || (await first("select * from website_settings where agency_id = $1", [agencyId])) || defaultWebsiteSettings;
}

export async function getErpSnapshot() {
  const agencyId = await getAgencyId();

  if (!agencyId) {
    return {
      setupRequired: true,
      agency: null,
      staff: [],
      properties: [],
      rooms: [],
      tenants: [],
      supportNotes: [],
      documents: [],
      claims: [],
      incidents: [],
      summary: {
        residents: 0,
        occupancyRate: 0,
        openIncidents: 0,
        highRiskResidents: 0,
        arrearsTotal: 0,
        weeklyHousingBenefit: 0,
        voids: 0,
        expiringCompliance: 0,
        pendingReferrals: 0,
      },
    };
  }

  const [
    agency,
    websiteSettings,
    staff,
    landlords,
    properties,
    rooms,
    tenants,
    supportNotes,
    documents,
    claims,
    contracts,
    ledger,
    incidents,
    crmPartners,
    referrals,
    communicationLogs,
    supportPlans,
    riskAssessments,
    automationTasks,
    maintenanceJobs,
    expenses,
    landlordPayments,
  ] = await Promise.all([
    first("select * from agencies where id = $1", [agencyId]),
    getWebsiteSettings(),
    query("select id, full_name, email, role, active, created_at from staff_users where agency_id = $1 order by created_at desc", [agencyId]),
    query("select * from landlords where agency_id = $1 order by created_at desc", [agencyId]),
    query("select * from properties where agency_id = $1 order by created_at desc", [agencyId]),
    query("select * from rooms where agency_id = $1 order by room_label", [agencyId]),
    query("select * from tenants where agency_id = $1 order by created_at desc limit 250", [agencyId]),
    query("select * from support_notes where agency_id = $1 order by created_at desc limit 100", [agencyId]),
    query("select * from documents where agency_id = $1 order by created_at desc limit 100", [agencyId]),
    query("select * from housing_benefit_claims where agency_id = $1 order by created_at desc limit 100", [agencyId]),
    query("select * from tenancy_contracts where agency_id = $1 order by created_at desc limit 250", [agencyId]),
    query("select * from payment_ledger_entries where agency_id = $1 order by entry_date desc, created_at desc limit 500", [agencyId]),
    query("select * from incidents where agency_id = $1 order by reported_at desc limit 100", [agencyId]),
    query("select * from crm_partners where agency_id = $1 order by created_at desc limit 250", [agencyId]),
    query("select * from referrals where agency_id = $1 order by created_at desc limit 250", [agencyId]),
    query("select * from communication_logs where agency_id = $1 order by created_at desc limit 250", [agencyId]),
    query("select * from support_plans where agency_id = $1 order by created_at desc limit 250", [agencyId]),
    query("select * from risk_assessments where agency_id = $1 order by created_at desc limit 250", [agencyId]),
    query("select * from automation_tasks where agency_id = $1 order by due_date asc nulls last, created_at desc limit 250", [agencyId]),
    query("select * from maintenance_jobs where agency_id = $1 order by reported_at desc limit 250", [agencyId]),
    query("select * from expense_entries where agency_id = $1 order by expense_date desc, created_at desc limit 250", [agencyId]),
    query("select * from landlord_payments where agency_id = $1 order by created_at desc limit 250", [agencyId]),
  ]);

  const totalRooms = rooms.rows.length;
  const occupiedRooms = rooms.rows.filter((room) => room.status === "occupied").length;

  return {
    setupRequired: false,
    agency,
    websiteSettings,
    staff: staff.rows,
    landlords: landlords.rows,
    properties: properties.rows,
    rooms: rooms.rows,
    tenants: tenants.rows,
    supportNotes: supportNotes.rows,
    documents: documents.rows,
    claims: claims.rows,
    contracts: contracts.rows,
    ledger: ledger.rows,
    incidents: incidents.rows,
    crmPartners: crmPartners.rows,
    referrals: referrals.rows,
    communicationLogs: communicationLogs.rows,
    supportPlans: supportPlans.rows,
    riskAssessments: riskAssessments.rows,
    automationTasks: automationTasks.rows,
    maintenanceJobs: maintenanceJobs.rows,
    expenses: expenses.rows,
    landlordPayments: landlordPayments.rows,
    summary: {
      residents: tenants.rows.filter((tenant) => !tenant.checkout_date).length,
      occupancyRate: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      openIncidents: incidents.rows.filter((incident) => incident.status !== "closed").length,
      highRiskResidents: tenants.rows.filter((tenant) => tenant.risk_assessment === "HIGH").length,
      arrearsTotal: ledger.rows.reduce((sum, entry) => sum + Number(entry.debit ?? 0) - Number(entry.credit ?? 0), 0),
      weeklyHousingBenefit: claims.rows.reduce((sum, claim) => sum + Number(claim.amount ?? 0), 0),
      voids: rooms.rows.filter((room) => room.status === "void" || room.status === "available").length,
      expiringCompliance: 0,
      pendingReferrals: 0,
      openReferrals: referrals.rows.filter((referral) => !["rejected", "converted"].includes(referral.status)).length,
      overdueTasks: automationTasks.rows.filter((task) => task.status !== "done" && task.due_date && new Date(task.due_date).getTime() < Date.now()).length,
      openMaintenance: maintenanceJobs.rows.filter((job) => !["complete", "cancelled"].includes(job.status)).length,
      activeSupportPlans: supportPlans.rows.filter((plan) => plan.status === "active").length,
    },
  };
}

export async function createLandlord(input: { name: string; email?: string; phone?: string; address?: string; notes?: string; portalEnabled?: boolean }) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");

  return first(
    `insert into landlords (agency_id, name, email, phone, address, notes, portal_enabled)
     values ($1, $2, lower($3), $4, $5, $6, $7)
     returning *`,
    [agencyId, input.name, input.email || null, input.phone || null, input.address || null, input.notes || null, Boolean(input.portalEnabled)],
  );
}

export async function updateLandlord(id: string, input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");

  return first(
    `update landlords
     set name = coalesce($3, name),
         email = $4,
         phone = $5,
         address = $6,
         notes = $7,
         portal_enabled = coalesce($8, portal_enabled)
     where id = $1 and agency_id = $2
     returning *`,
    [id, agencyId, input.name || null, input.email || null, input.phone || null, input.address || null, input.notes || null, input.portalEnabled],
  );
}

export async function deleteLandlord(id: string) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  await query("update properties set landlord_id = null where agency_id = $1 and landlord_id = $2", [agencyId, id]);
  return first("delete from landlords where id = $1 and agency_id = $2 returning id", [id, agencyId]);
}

export async function createStaffUser(input: { fullName: string; email: string; role: StaffRole; password: string }) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first(
    `insert into staff_users (agency_id, full_name, email, role, password_hash)
     values ($1, $2, lower($3), $4, $5)
     on conflict (email)
     do update set full_name = excluded.full_name,
                   role = excluded.role,
                   password_hash = excluded.password_hash,
                   active = true
     returning id, full_name, email, role, active`,
    [agencyId, input.fullName, input.email, input.role, hashPassword(input.password)],
  );
}

export async function updateStaffUser(id: string, input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  const password = typeof input.password === "string" && input.password.length >= 8 ? hashPassword(input.password) : null;

  return first(
    `update staff_users
     set full_name = coalesce($3, full_name),
         email = coalesce(lower($4), email),
         role = coalesce($5, role),
         active = coalesce($6, active),
         password_hash = coalesce($7, password_hash)
     where id = $1 and agency_id = $2
     returning id, full_name, email, role, active, created_at`,
    [
      id,
      agencyId,
      input.fullName || null,
      input.email || null,
      input.role || null,
      typeof input.active === "boolean" ? input.active : input.active === "true" ? true : input.active === "false" ? false : null,
      password,
    ],
  );
}

export async function updateWebsiteSettings(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first(
    `insert into website_settings (
      agency_id, site_title, site_tagline, hero_heading, hero_body,
      primary_color, secondary_color, accent_color, logo_path, logo_width,
      logo_radius, body_font_family, body_font_size, heading_font_size,
      nav_font_size, hero_body_font_size, card_heading_font_size, footer_font_size,
      nav_text_color, hero_text_color, body_text_color,
      contact_email, contact_phone, contact_address, footer_note
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    on conflict (agency_id)
    do update set site_title = excluded.site_title,
                  site_tagline = excluded.site_tagline,
                  hero_heading = excluded.hero_heading,
                  hero_body = excluded.hero_body,
                  primary_color = excluded.primary_color,
                  secondary_color = excluded.secondary_color,
                  accent_color = excluded.accent_color,
                  logo_path = excluded.logo_path,
                  logo_width = excluded.logo_width,
                  logo_radius = excluded.logo_radius,
                  body_font_family = excluded.body_font_family,
                  body_font_size = excluded.body_font_size,
                  heading_font_size = excluded.heading_font_size,
                  nav_font_size = excluded.nav_font_size,
                  hero_body_font_size = excluded.hero_body_font_size,
                  card_heading_font_size = excluded.card_heading_font_size,
                  footer_font_size = excluded.footer_font_size,
                  nav_text_color = excluded.nav_text_color,
                  hero_text_color = excluded.hero_text_color,
                  body_text_color = excluded.body_text_color,
                  contact_email = excluded.contact_email,
                  contact_phone = excluded.contact_phone,
                  contact_address = excluded.contact_address,
                  footer_note = excluded.footer_note,
                  updated_at = now()
    returning *`,
    [
      agencyId,
      input.siteTitle || defaultWebsiteSettings.site_title,
      input.siteTagline || defaultWebsiteSettings.site_tagline,
      input.heroHeading || defaultWebsiteSettings.hero_heading,
      input.heroBody || defaultWebsiteSettings.hero_body,
      input.primaryColor || defaultWebsiteSettings.primary_color,
      input.secondaryColor || defaultWebsiteSettings.secondary_color,
      input.accentColor || defaultWebsiteSettings.accent_color,
      input.logoPath || defaultWebsiteSettings.logo_path,
      Number(input.logoWidth || defaultWebsiteSettings.logo_width),
      Number(input.logoRadius || defaultWebsiteSettings.logo_radius),
      input.bodyFontFamily || defaultWebsiteSettings.body_font_family,
      Number(input.bodyFontSize || defaultWebsiteSettings.body_font_size),
      Number(input.headingFontSize || defaultWebsiteSettings.heading_font_size),
      Number(input.navFontSize || defaultWebsiteSettings.nav_font_size),
      Number(input.heroBodyFontSize || defaultWebsiteSettings.hero_body_font_size),
      Number(input.cardHeadingFontSize || defaultWebsiteSettings.card_heading_font_size),
      Number(input.footerFontSize || defaultWebsiteSettings.footer_font_size),
      input.navTextColor || defaultWebsiteSettings.nav_text_color,
      input.heroTextColor || defaultWebsiteSettings.hero_text_color,
      input.bodyTextColor || defaultWebsiteSettings.body_text_color,
      input.contactEmail || defaultWebsiteSettings.contact_email,
      input.contactPhone || null,
      input.contactAddress || null,
      input.footerNote || defaultWebsiteSettings.footer_note,
    ],
  );
}

export async function createProperty(input: {
  address: string;
  postcode?: string;
  localAuthority?: string;
  totalRooms: number;
  weeklyRent?: number;
  landlordName?: string;
  landlordId?: string;
}) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  let landlordId = input.landlordId || null;
  if (!landlordId && input.landlordName) {
    const landlord = await createLandlord({ name: input.landlordName });
    landlordId = landlord?.id ?? null;
  }

  const property = await first<{ id: string }>(
    `insert into properties (agency_id, landlord_id, address, postcode, local_authority, total_rooms, metadata)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id`,
    [
      agencyId,
      landlordId,
      input.address,
      input.postcode || null,
      input.localAuthority || null,
      input.totalRooms || 0,
      JSON.stringify({ landlordName: input.landlordName || null }),
    ],
  );

  if (property && input.totalRooms > 0) {
    for (let room = 1; room <= input.totalRooms; room += 1) {
      await query(
        `insert into rooms (agency_id, property_id, room_label, weekly_rent, status)
         values ($1, $2, $3, $4, 'available')
         on conflict (property_id, room_label) do nothing`,
        [agencyId, property.id, String(room), input.weeklyRent || 0],
      );
    }
  }

  return property;
}

export async function updateAgency(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first(
    `update agencies
     set name = coalesce($2, name),
         registration_number = coalesce($3, registration_number),
         local_authority = coalesce($4, local_authority),
         contact_email = coalesce($5, contact_email),
         contact_phone = coalesce($6, contact_phone),
         shared_file_root = coalesce($7, shared_file_root),
         currency_code = coalesce($8, currency_code),
         updated_at = now()
     where id = $1
     returning *`,
    [
      agencyId,
      input.name || null,
      input.registrationNumber || null,
      input.localAuthority || null,
      input.contactEmail || null,
      input.contactPhone || null,
      input.sharedFileRoot || null,
      input.currencyCode || null,
    ],
  );
}

export async function updateProperty(id: string, input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  const property = await first(
    `update properties
     set address = coalesce($3, address),
         postcode = coalesce($4, postcode),
         local_authority = coalesce($5, local_authority),
         landlord_id = coalesce($6, landlord_id),
         metadata = metadata || $7::jsonb,
         updated_at = now()
     where id = $1 and agency_id = $2
     returning *`,
    [
      id,
      agencyId,
      input.address || null,
      input.postcode || null,
      input.localAuthority || null,
      input.landlordId || null,
      JSON.stringify({ landlordName: input.landlordName || null }),
    ],
  );

  if (input.weeklyRent !== undefined && input.weeklyRent !== "") {
    await query("update rooms set weekly_rent = $1 where agency_id = $2 and property_id = $3", [
      Number(input.weeklyRent),
      agencyId,
      id,
    ]);
  }

  return property;
}

export async function updateRoom(id: string, input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first(
    `update rooms
     set room_label = coalesce($3, room_label),
         weekly_rent = coalesce($4, weekly_rent),
         status = coalesce($5, status),
         metadata = metadata || $6::jsonb
     where id = $1 and agency_id = $2
     returning *`,
    [
      id,
      agencyId,
      input.roomLabel || null,
      input.weeklyRent !== undefined && input.weeklyRent !== "" ? Number(input.weeklyRent) : null,
      input.status || null,
      JSON.stringify({ notes: input.notes || null }),
    ],
  );
}

export async function createContract(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  const contractNumber = input.contractNumber || `CTR-${Date.now().toString(36).toUpperCase()}`;

  return first(
    `insert into tenancy_contracts (
      agency_id, tenant_id, property_id, room_id, contract_number, start_date, end_date,
      weekly_rent, deposit_amount, status, document_path, terms
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    returning *`,
    [
      agencyId,
      input.tenantId,
      input.propertyId || null,
      input.roomId || null,
      contractNumber,
      input.startDate,
      input.endDate || null,
      Number(input.weeklyRent || 0),
      Number(input.depositAmount || 0),
      input.status || "draft",
      input.documentPath || null,
      JSON.stringify({ notes: input.notes || null }),
    ],
  );
}

export async function updateContract(id: string, input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");

  return first(
    `update tenancy_contracts
     set contract_number = coalesce($3, contract_number),
         start_date = coalesce($4, start_date),
         end_date = $5,
         weekly_rent = coalesce($6, weekly_rent),
         deposit_amount = coalesce($7, deposit_amount),
         status = coalesce($8, status),
         document_path = $9,
         updated_at = now()
     where id = $1 and agency_id = $2
     returning *`,
    [
      id,
      agencyId,
      input.contractNumber || null,
      input.startDate || null,
      input.endDate || null,
      input.weeklyRent !== undefined && input.weeklyRent !== "" ? Number(input.weeklyRent) : null,
      input.depositAmount !== undefined && input.depositAmount !== "" ? Number(input.depositAmount) : null,
      input.status || null,
      input.documentPath || null,
    ],
  );
}

export async function deleteContract(id: string) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first("delete from tenancy_contracts where id = $1 and agency_id = $2 returning id", [id, agencyId]);
}

export async function createLedgerEntry(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");

  return first(
    `insert into payment_ledger_entries (
      agency_id, tenant_id, property_id, contract_id, entry_date, period_start, period_end,
      type, description, debit, credit, status, reference
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    returning *`,
    [
      agencyId,
      input.tenantId || null,
      input.propertyId || null,
      input.contractId || null,
      input.entryDate || new Date().toISOString().slice(0, 10),
      input.periodStart || null,
      input.periodEnd || null,
      input.type || "rent_charge",
      input.description || "Ledger entry",
      Number(input.debit || 0),
      Number(input.credit || 0),
      input.status || "posted",
      input.reference || null,
    ],
  );
}

export async function updateLedgerEntry(id: string, input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");

  return first(
    `update payment_ledger_entries
     set entry_date = coalesce($3, entry_date),
         type = coalesce($4, type),
         description = coalesce($5, description),
         debit = coalesce($6, debit),
         credit = coalesce($7, credit),
         status = coalesce($8, status),
         reference = $9
     where id = $1 and agency_id = $2
     returning *`,
    [
      id,
      agencyId,
      input.entryDate || null,
      input.type || null,
      input.description || null,
      input.debit !== undefined && input.debit !== "" ? Number(input.debit) : null,
      input.credit !== undefined && input.credit !== "" ? Number(input.credit) : null,
      input.status || null,
      input.reference || null,
    ],
  );
}

export async function deleteLedgerEntry(id: string) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first("delete from payment_ledger_entries where id = $1 and agency_id = $2 returning id", [id, agencyId]);
}

export async function deleteProperty(id: string) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first("delete from properties where id = $1 and agency_id = $2 returning id", [id, agencyId]);
}

export async function createTenant(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  const property = typeof input.propertyAddress === "string"
    ? await first<{ id: string }>(
        `insert into properties (agency_id, address, total_rooms)
         values ($1, $2, 0)
         on conflict do nothing
         returning id`,
        [agencyId, input.propertyAddress],
      )
    : null;
  const existingProperty = property || (typeof input.propertyAddress === "string"
    ? await first<{ id: string }>("select id from properties where agency_id = $1 and address = $2 limit 1", [agencyId, input.propertyAddress])
    : null);

  return first(
    `insert into tenants (
      agency_id, property_id, first_name, middle_name, last_name, date_of_birth, ni_number, checkin_date,
      checkout_date, hb_claim_ref_number, referral_agency, age, gender, religion, ethnicity, nationality,
      disability, sexual_orientation, spoken_language, risk_assessment, length_of_stay, record_status
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
    returning *`,
    [
      agencyId,
      existingProperty?.id || null,
      input.firstName,
      input.middleName || null,
      input.lastName,
      input.dateOfBirth || null,
      input.niNumber || null,
      input.checkinDate || null,
      input.checkoutDate || null,
      input.hbClaimRefNumber || null,
      input.referralAgency || null,
      input.age || null,
      input.gender || null,
      input.religion || null,
      input.ethnicity || null,
      input.nationality || null,
      input.disability || null,
      input.sexualOrientation || null,
      input.spokenLanguage || null,
      input.riskAssessment || null,
      input.lengthOfStay || null,
      input.recordStatus || null,
    ],
  );
}

export async function updateTenant(id: string, input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first(
    `update tenants
     set first_name = coalesce($3, first_name),
         middle_name = $4,
         last_name = coalesce($5, last_name),
         ni_number = $6,
         hb_claim_ref_number = $7,
         referral_agency = $8,
         gender = $9,
         risk_assessment = $10,
         updated_at = now()
     where id = $1 and agency_id = $2
     returning *`,
    [
      id,
      agencyId,
      input.firstName || null,
      input.middleName || null,
      input.lastName || null,
      input.niNumber || null,
      input.hbClaimRefNumber || null,
      input.referralAgency || null,
      input.gender || null,
      input.riskAssessment || null,
    ],
  );
}

export async function deleteTenant(id: string) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first("delete from tenants where id = $1 and agency_id = $2 returning id", [id, agencyId]);
}

export async function createSupportNote(input: {
  tenantId: string;
  staffId?: string;
  weekStart: string;
  note: string;
  outcomes?: string;
  nextActions?: string;
  riskChange?: string;
}) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first(
    `insert into support_notes (agency_id, tenant_id, staff_id, week_start, note, outcomes, next_actions, risk_change)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning *`,
    [agencyId, input.tenantId, input.staffId || null, input.weekStart, input.note, input.outcomes || null, input.nextActions || null, input.riskChange || "none"],
  );
}

export async function createDocument(input: {
  tenantId?: string;
  propertyId?: string;
  landlordId?: string;
  category: string;
  title: string;
  filePath: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  uploadedBy?: string;
  storageKey?: string;
  visibility?: string;
  readRoles?: string[];
  writeRoles?: string[];
  deleteRoles?: string[];
}) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first(
    `insert into documents (
       agency_id, tenant_id, property_id, landlord_id, category, title, file_path,
       original_file_name, mime_type, file_size, uploaded_by, storage_key,
       visibility, read_roles, write_roles, delete_roles
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     returning *`,
    [
      agencyId,
      input.tenantId || null,
      input.propertyId || null,
      input.landlordId || null,
      input.category,
      input.title,
      input.filePath,
      input.originalFileName || null,
      input.mimeType || null,
      input.fileSize ?? null,
      input.uploadedBy || null,
      input.storageKey || null,
      input.visibility || "staff",
      input.readRoles?.length ? input.readRoles : ["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"],
      input.writeRoles?.length ? input.writeRoles : ["admin", "manager"],
      input.deleteRoles?.length ? input.deleteRoles : ["admin"],
    ],
  );
}

export async function createIncident(input: {
  tenantId?: string;
  propertyId?: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  ownerId?: string;
}) {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }

  return first(
    `insert into incidents (agency_id, tenant_id, property_id, category, severity, summary, owner_id)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [agencyId, input.tenantId || null, input.propertyId || null, input.category, input.severity, input.summary, input.ownerId || null],
  );
}

export async function createCrmPartner(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into crm_partners (agency_id, type, organisation_name, contact_name, email, phone, notes)
     values ($1,$2,$3,$4,lower($5),$6,$7)
     returning *`,
    [agencyId, input.type || "referrer", input.organisationName, input.contactName || null, input.email || null, input.phone || null, input.notes || null],
  );
}

export async function createReferral(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into referrals (agency_id, partner_id, applicant_name, source, status, priority, support_needs, notes, target_move_in)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     returning *`,
    [
      agencyId,
      input.partnerId || null,
      input.applicantName,
      input.source || null,
      input.status || "new",
      input.priority || "normal",
      input.supportNeeds || null,
      input.notes || null,
      input.targetMoveIn || null,
    ],
  );
}

export async function createCommunicationLog(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into communication_logs (agency_id, partner_id, tenant_id, referral_id, staff_id, channel, subject, notes, follow_up_date)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     returning *`,
    [
      agencyId,
      input.partnerId || null,
      input.tenantId || null,
      input.referralId || null,
      input.staffId || null,
      input.channel || "email",
      input.subject,
      input.notes || null,
      input.followUpDate || null,
    ],
  );
}

export async function createSupportPlan(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into support_plans (agency_id, tenant_id, owner_id, status, goals, needs_summary, review_date)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning *`,
    [agencyId, input.tenantId, input.ownerId || null, input.status || "draft", input.goals || null, input.needsSummary || null, input.reviewDate || null],
  );
}

export async function createRiskAssessment(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into risk_assessments (agency_id, tenant_id, assessor_id, risk_level, safeguarding_concerns, mitigation_plan, review_date)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning *`,
    [agencyId, input.tenantId, input.assessorId || null, input.riskLevel || "LOW", input.safeguardingConcerns || null, input.mitigationPlan || null, input.reviewDate || null],
  );
}

export async function createAutomationTask(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into automation_tasks (agency_id, tenant_id, property_id, assigned_to, type, title, due_date, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning *`,
    [agencyId, input.tenantId || null, input.propertyId || null, input.assignedTo || null, input.type || "general", input.title, input.dueDate || null, input.status || "open"],
  );
}

export async function createMaintenanceJob(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into maintenance_jobs (agency_id, property_id, tenant_id, title, priority, status, cost, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning *`,
    [agencyId, input.propertyId || null, input.tenantId || null, input.title, input.priority || "normal", input.status || "reported", Number(input.cost || 0), input.notes || null],
  );
}

export async function createExpenseEntry(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into expense_entries (agency_id, property_id, landlord_id, category, description, amount, expense_date, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning *`,
    [agencyId, input.propertyId || null, input.landlordId || null, input.category || "General", input.description, Number(input.amount || 0), input.expenseDate || new Date().toISOString().slice(0, 10), input.status || "recorded"],
  );
}

export async function createLandlordPayment(input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Agency setup is required first.");
  return first(
    `insert into landlord_payments (agency_id, landlord_id, property_id, period_start, period_end, amount, status, reference, paid_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,case when $7 = 'paid' then now() else null end)
     returning *`,
    [agencyId, input.landlordId, input.propertyId || null, input.periodStart || null, input.periodEnd || null, Number(input.amount || 0), input.status || "draft", input.reference || null],
  );
}

const updateTables = {
  claims: "housing_benefit_claims",
  incidents: "incidents",
  supportNotes: "support_notes",
} as const;

export async function updateErpRecord(collection: keyof typeof updateTables, input: Record<string, unknown>) {
  const agencyId = await getAgencyId();
  const id = typeof input.id === "string" ? input.id : "";

  if (!agencyId) {
    throw new Error("Agency setup is required first.");
  }
  if (!id) {
    throw new Error("Record id is required.");
  }

  if (collection === "claims") {
    const status = input.status === "Paid" ? "paid" : input.status === "Submitted" ? "submitted" : "evidence_required";
    return first(
      `update housing_benefit_claims
       set status = $1, paid_at = case when $1 = 'paid' then now() else paid_at end
       where id = $2 and agency_id = $3
       returning *`,
      [status, id, agencyId],
    );
  }

  if (collection === "incidents") {
    return first(
      `update incidents
       set status = coalesce($1, status)
       where id = $2 and agency_id = $3
       returning *`,
      [input.status, id, agencyId],
    );
  }

  return null;
}

export async function updateAdminCollection(collection: string, id: string | null, input: Record<string, unknown>) {
  if (collection === "agency") {
    return updateAgency(input);
  }
  if (collection === "website") {
    return updateWebsiteSettings(input);
  }
  if (collection === "staff" && id) {
    return updateStaffUser(id, input);
  }
  if (collection === "properties" && id) {
    return updateProperty(id, input);
  }
  if (collection === "rooms" && id) {
    return updateRoom(id, input);
  }
  if (collection === "landlords" && id) {
    return updateLandlord(id, input);
  }
  if (collection === "tenants" && id) {
    return updateTenant(id, input);
  }
  if (collection === "contracts" && id) {
    return updateContract(id, input);
  }
  if (collection === "ledger" && id) {
    return updateLedgerEntry(id, input);
  }
  return updateErpRecord(collection as keyof typeof updateTables, input);
}

export async function deleteAdminCollection(collection: string, id: string) {
  if (collection === "properties") {
    return deleteProperty(id);
  }
  if (collection === "landlords") {
    return deleteLandlord(id);
  }
  if (collection === "tenants") {
    return deleteTenant(id);
  }
  if (collection === "contracts") {
    return deleteContract(id);
  }
  if (collection === "ledger") {
    return deleteLedgerEntry(id);
  }
  throw new Error("Unsupported delete operation.");
}
