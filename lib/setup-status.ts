import { first } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";

export type SetupStatus = "not_started" | "in_progress" | "needs_attention" | "completed" | "optional";

export type SetupTask = {
  key: string;
  title: string;
  description: string;
  status: SetupStatus;
  progress: number;
  actionLabel: string;
  workflow: "system" | "website" | "platform" | "records" | "storage" | "import" | "review";
  href: string;
  completionCriteria: string;
  warnings: string[];
  lastUpdated?: string | null;
};

function statusFrom(progress: number, warnings: string[] = []): SetupStatus {
  if (warnings.length) return "needs_attention";
  if (progress >= 100) return "completed";
  if (progress > 0) return "in_progress";
  return "not_started";
}

function pct(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

export async function getSetupStatus() {
  const agencyId = await getAgencyId();
  if (!agencyId) {
    return {
      overallProgress: 0,
      tasks: [] as SetupTask[],
      updatedAt: new Date().toISOString(),
    };
  }

  const [agency, website, counts, lastImport] = await Promise.all([
    first<Record<string, string | null>>("select * from agencies where id = $1", [agencyId]),
    first<Record<string, string | number | null>>("select * from website_settings where agency_id = $1", [agencyId]),
    first<{
      staff_count: string;
      admin_count: string;
      property_count: string;
      room_count: string;
      tenant_count: string;
      occupancy_count: string;
      crm_partner_count: string;
      referral_count: string;
      ledger_count: string;
      document_count: string;
      import_count: string;
      imported_count: string;
    }>(
      `select
        (select count(*) from staff_users where agency_id = $1)::text as staff_count,
        (select count(*) from staff_users where agency_id = $1 and role = 'admin')::text as admin_count,
        (select count(*) from properties where agency_id = $1)::text as property_count,
        (select count(*) from rooms where agency_id = $1)::text as room_count,
        (select count(*) from tenants where agency_id = $1)::text as tenant_count,
        (select count(*) from occupancy_records where agency_id = $1)::text as occupancy_count,
        (select count(*) from crm_partners where agency_id = $1)::text as crm_partner_count,
        (select count(*) from referrals where agency_id = $1)::text as referral_count,
        (select count(*) from payment_ledger_entries where agency_id = $1)::text as ledger_count,
        (select count(*) from documents where agency_id = $1)::text as document_count,
        (select count(*) from import_logs where agency_id = $1)::text as import_count,
        (select count(*) from import_logs where agency_id = $1 and status = 'imported')::text as imported_count`,
      [agencyId],
    ),
    first<{ created_at: string | null }>("select created_at from import_logs where agency_id = $1 order by created_at desc limit 1", [agencyId]),
  ]);

  const number = (value: unknown) => Number(value ?? 0);
  const requiredAgency = [agency?.name, agency?.contact_email, agency?.currency_code, agency?.shared_file_root];
  const agencyProgress = pct(requiredAgency.filter(Boolean).length, requiredAgency.length);
  const brandingRequired = [website?.site_title, website?.logo_path, website?.primary_color, website?.hero_heading];
  const brandingProgress = pct(brandingRequired.filter(Boolean).length, brandingRequired.length);
  const contactRequired = [website?.contact_email, website?.contact_phone || website?.contact_address];
  const contactProgress = pct(contactRequired.filter(Boolean).length, contactRequired.length);
  const staffProgress = pct(Math.min(2, number(counts?.staff_count)) + (number(counts?.admin_count) > 0 ? 1 : 0), 3);
  const pmsProgress = pct(
    (number(counts?.property_count) > 0 ? 1 : 0) + (number(counts?.room_count) > 0 ? 1 : 0) + (number(counts?.tenant_count) > 0 ? 1 : 0) + (number(counts?.occupancy_count) > 0 ? 1 : 0),
    4,
  );
  const crmProgress = pct((number(counts?.crm_partner_count) > 0 ? 1 : 0) + (number(counts?.referral_count) > 0 ? 1 : 0), 2);
  const reportingProgress = pct((number(counts?.ledger_count) > 0 ? 1 : 0) + (number(counts?.property_count) > 0 ? 1 : 0), 2);
  const storageProgress = pct((agency?.shared_file_root ? 1 : 0) + (number(counts?.document_count) > 0 ? 1 : 0), 2);
  const importProgress = number(counts?.imported_count) > 0 ? 100 : number(counts?.import_count) > 0 ? 50 : 0;
  const launchProgress = pct(
    [agencyProgress, brandingProgress, staffProgress, pmsProgress, crmProgress, storageProgress].filter((value) => value >= 100).length,
    6,
  );

  const tasks: SetupTask[] = [
    {
      key: "company_profile",
      title: "Company Profile",
      description: "Agency name, contact email, currency and shared file root.",
      status: statusFrom(agencyProgress),
      progress: agencyProgress,
      actionLabel: "Open Company Settings",
      workflow: "system",
      href: "/realtyos/app/setup?activity=company_profile",
      completionCriteria: "Agency name, contact email, currency and shared file root are populated.",
      warnings: agencyProgress < 100 ? ["Company profile has missing required fields."] : [],
      lastUpdated: agency?.updated_at || agency?.created_at || null,
    },
    {
      key: "branding",
      title: "Branding and Website",
      description: "Logo, title, colours, typography and homepage content.",
      status: statusFrom(brandingProgress),
      progress: brandingProgress,
      actionLabel: "Edit Website Brand",
      workflow: "website",
      href: "/realtyos/app/setup?activity=branding",
      completionCriteria: "Website title, logo path, primary colour and hero heading are configured.",
      warnings: brandingProgress < 100 ? ["Branding is incomplete."] : [],
      lastUpdated: typeof website?.updated_at === "string" ? website.updated_at : null,
    },
    {
      key: "staff_users",
      title: "Admin and Staff Users",
      description: "Owner admin plus operational users for support, housing and finance.",
      status: statusFrom(staffProgress),
      progress: staffProgress,
      actionLabel: "Manage Staff",
      workflow: "system",
      href: "/realtyos/app/setup?activity=staff_users",
      completionCriteria: "At least one admin and two staff users exist.",
      warnings: staffProgress < 100 ? ["Add staff users for daily operations."] : [],
      lastUpdated: null,
    },
    {
      key: "pms_foundation",
      title: "PMS Data",
      description: "Properties, rooms/units and tenants loaded into the PMS.",
      status: statusFrom(pmsProgress),
      progress: pmsProgress,
      actionLabel: "Import PMS Data",
      workflow: "import",
      href: "/realtyos/app/setup?activity=pms_foundation",
      completionCriteria: "At least one property, room, tenant and occupancy record exists.",
      warnings: pmsProgress < 100 ? ["PMS data is not fully populated."] : [],
      lastUpdated: lastImport?.created_at || null,
    },
    {
      key: "crm_foundation",
      title: "CRM Foundation",
      description: "Councils, partners, referrers and lead pipeline records.",
      status: statusFrom(crmProgress),
      progress: crmProgress,
      actionLabel: "Import CRM Data",
      workflow: "import",
      href: "/realtyos/app/setup?activity=crm_foundation",
      completionCriteria: "At least one CRM partner and one referral/lead exists.",
      warnings: crmProgress < 100 ? ["CRM contacts or leads are missing."] : [],
      lastUpdated: lastImport?.created_at || null,
    },
    {
      key: "reporting_sources",
      title: "Overview and Reporting",
      description: "Operational source data available for dashboards and BI reports.",
      status: statusFrom(reportingProgress),
      progress: reportingProgress,
      actionLabel: "Load Reporting Data",
      workflow: "import",
      href: "/realtyos/app/setup?activity=reporting_sources",
      completionCriteria: "Property and ledger/source data are available for reporting.",
      warnings: reportingProgress < 100 ? ["Reporting source data is limited."] : [],
      lastUpdated: lastImport?.created_at || null,
    },
    {
      key: "documents_storage",
      title: "Documents and Storage",
      description: "Shared file root and at least one uploaded/registered document.",
      status: statusFrom(storageProgress),
      progress: storageProgress,
      actionLabel: "Open Shared Files",
      workflow: "storage",
      href: "/realtyos/app/setup?activity=documents_storage",
      completionCriteria: "Storage root is configured and a document exists.",
      warnings: storageProgress < 100 ? ["Upload a test document and confirm storage access."] : [],
      lastUpdated: null,
    },
    {
      key: "source_data_import",
      title: "Excel Source Data Import",
      description: "Upload, preview, map, validate and confirm source-data imports.",
      status: statusFrom(importProgress),
      progress: importProgress,
      actionLabel: "Open Import Wizard",
      workflow: "import",
      href: "/realtyos/app/setup?activity=source_data_import",
      completionCriteria: "At least one confirmed import has completed.",
      warnings: importProgress < 100 ? ["No confirmed import has completed yet."] : [],
      lastUpdated: lastImport?.created_at || null,
    },
    {
      key: "launch_readiness",
      title: "Final Review and Launch",
      description: "Core setup items complete and ready for operational handover.",
      status: statusFrom(launchProgress),
      progress: launchProgress,
      actionLabel: "Review Setup",
      workflow: "review",
      href: "/realtyos/app/setup?activity=launch_readiness",
      completionCriteria: "Company, brand, staff, PMS, CRM and storage tasks are complete.",
      warnings: launchProgress < 100 ? ["Complete the remaining setup tasks before go-live."] : [],
      lastUpdated: new Date().toISOString(),
    },
  ];

  const overallProgress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);

  return { overallProgress, tasks, updatedAt: new Date().toISOString() };
}
