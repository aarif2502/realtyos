from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor

OUT = "UK Support Housing - Hybrid PMS CRM Compliance Technical Manual v4.docx"


def run_style(run, size=10, bold=False, color="334155"):
    run.font.name = "Aptos"
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)


def heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    for r in p.runs:
        run_style(r, 16 if level == 1 else 12, True, "172033")
    p.paragraph_format.space_before = Pt(8 if level == 1 else 5)
    p.paragraph_format.space_after = Pt(4)


def body(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.08
    r = p.add_run(text)
    run_style(r)


def bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(text)
    run_style(r)


def numbered(doc, text):
    p = doc.add_paragraph(style="List Number")
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    run_style(r)


def callout(doc, title, lines):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.18)
    p.paragraph_format.right_indent = Inches(0.18)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run(title + "\n")
    run_style(r, 10, True, "172033")
    for line in lines:
        r = p.add_run(f"• {line}\n")
        run_style(r, 9, False, "475569")


def compact_table(doc, headers, rows):
    for row in rows:
        title = str(row[0])
        detail = " | ".join(str(value) for value in row[1:])
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.18)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(f"{title}: ")
        run_style(r, 8.5, True, "172033")
        r = p.add_run(detail)
        run_style(r, 8.2, False, "475569")
    doc.add_paragraph()


doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.72)
section.bottom_margin = Inches(0.72)
section.left_margin = Inches(0.78)
section.right_margin = Inches(0.78)
doc.styles["Normal"].font.name = "Aptos"
doc.styles["Normal"].font.size = Pt(10)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title.add_run("UK Support Housing")
run_style(r, 28, True, "172033")

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run("Hybrid PMS + CRM + Compliance Platform\nTechnical, Operations and Support Manual")
run_style(r, 14, False, "475569")

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = meta.add_run("Production host: Oracle Cloud Ubuntu VM 140.238.100.41\nPublic site: www.uksupporthousing.co.uk | Application: /realtyos")
run_style(r, 10, False, "64748B")
doc.add_page_break()

heading(doc, "1. Executive Summary")
body(doc, "The system is now organised as a hybrid operating platform for supported housing. It combines a Property Management System, CRM, compliance layer, light finance/ERP layer and automation queue. PostgreSQL is the source of truth, and /mnt/storage is the shared file-server root for documents.")
callout(doc, "Core stack", [
    "PMS: tenants, properties, rooms, rent, contracts, maintenance and documents.",
    "CRM: local councils, referrers, charities, support providers, referrals and communication logs.",
    "Compliance: support plans, weekly check-ins, case notes, risk assessments and safeguarding evidence.",
    "Finance: rent reconciliation, housing benefit/universal credit, expenses and landlord payments.",
    "Automation: inspection, compliance, arrears, support visit and referral follow-up reminders.",
    "BI layer: dashboard-ready marts, drill-downs, trend/cohort analysis and predictive risk scores.",
])

heading(doc, "2. Live Infrastructure")
bullet(doc, "Public website: https://www.uksupporthousing.co.uk")
bullet(doc, "Application route: https://www.uksupporthousing.co.uk/realtyos")
bullet(doc, "Application service: systemd service named realtyos")
bullet(doc, "Runtime: Next.js on Node.js, served locally on port 3000 behind Nginx")
bullet(doc, "Database: PostgreSQL, configured through /home/ubuntu/realtyos/.env.local")
bullet(doc, "Document root: /mnt/storage")
bullet(doc, "Owner-admin account: aesha.akhtar@uksupporthousing.co.uk")

heading(doc, "3. Database Areas")
body(doc, "The schema is split into business modules. Each module keeps its own records while linking back to the agency, staff, tenants, properties and landlords.")
bullet(doc, "Core: agencies, staff_users, staff_sessions, landlords, properties, rooms, tenants")
bullet(doc, "PMS finance/contracts: tenancy_contracts, payment_ledger_entries, housing_benefit_claims")
bullet(doc, "Document storage: documents with file metadata, storage_key and role permission arrays")
bullet(doc, "CRM: crm_partners, referrals, communication_logs")
bullet(doc, "Compliance: support_notes, support_plans, risk_assessments, incidents")
bullet(doc, "Automation and maintenance: automation_tasks, maintenance_jobs")
bullet(doc, "Light finance: expense_entries, landlord_payments")
bullet(doc, "Website admin: website_settings")

heading(doc, "4. Operational Workflow")
numbered(doc, "Referral comes in through CRM or HubSpot future webhook.")
numbered(doc, "Staff create a referral record and link it to a referrer, council or partner.")
numbered(doc, "Approved applicant becomes a tenant record in PMS.")
numbered(doc, "Move-in process creates room assignment, tenancy contract and rent ledger activity.")
numbered(doc, "Support plan, weekly check-ins, risk assessment and safeguarding notes are recorded in Compliance.")
numbered(doc, "Rent, HB/UC, expenses and landlord payments are managed in Finance.")
numbered(doc, "Automation tasks remind staff about inspections, compliance checks, arrears and support visits.")

heading(doc, "5. Role-Based Access")
body(doc, "All ERP APIs enforce authenticated staff sessions. Setup and staff creation are restricted to the owner-admin account. Operational APIs allow only relevant staff roles.")
bullet(doc, "Owner admins: aesha.akhtar@uksupporthousing.co.uk and admin@uksupporthousing.co.uk have complete Setup Panel and platform administration access.")
bullet(doc, "Admin: full platform access, setup, website admin and user creation.")
bullet(doc, "Manager: operational oversight across PMS, CRM, Compliance, Finance and reports.")
bullet(doc, "Housing Officer: tenant/property operations, contracts, CRM and compliance work.")
bullet(doc, "Support Worker: tenant support notes, support plans, risk records and visit reminders.")
bullet(doc, "Finance: ledger, housing benefit, expenses, landlord payments and finance documents.")
bullet(doc, "Readonly: limited read visibility where enabled.")

heading(doc, "6. Staff Operating Guide")
heading(doc, "PMS", 2)
bullet(doc, "Use Tenants for resident records and support needs.")
bullet(doc, "Use Properties for the portfolio, rooms and occupancy.")
bullet(doc, "Use Contracts for tenancy agreements and rent terms.")
bullet(doc, "Use Documents to upload, open, download and delete files according to permissions.")
heading(doc, "CRM", 2)
bullet(doc, "Use Referrals & Partners to add councils, referrers, charities and providers.")
bullet(doc, "Track each referral status from new to screening, approved, waitlist, rejected or converted.")
bullet(doc, "Use communication logs to capture calls, emails, meetings and follow-up dates.")
heading(doc, "Compliance", 2)
bullet(doc, "Create support plans with goals, needs summary, owner and review date.")
bullet(doc, "Record risk assessments with safeguarding concerns and mitigation plan.")
bullet(doc, "Use weekly support notes as case notes and audit evidence.")
heading(doc, "Finance", 2)
bullet(doc, "Post rent charges, housing benefit/universal credit, tenant payments and adjustments.")
bullet(doc, "Record expenses against properties or landlords.")
bullet(doc, "Track landlord payment batches and paid status.")
heading(doc, "Automation", 2)
bullet(doc, "Create reminders for inspections, compliance checks, rent arrears, support visits and referral follow-ups.")
bullet(doc, "Use due dates and assigned staff to keep work visible.")

heading(doc, "7. Document Storage and Permissions")
body(doc, "Uploaded documents are stored on /mnt/storage and indexed in PostgreSQL. The document record stores title, category, links to tenant/property/landlord, original filename, MIME type, storage key and permission arrays.")
bullet(doc, "Upload endpoint: POST /api/documents/upload")
bullet(doc, "Search/list endpoint: GET /api/storage")
bullet(doc, "Open endpoint: GET /api/storage/open?path=...")
bullet(doc, "Delete endpoint: DELETE /api/storage?path=...")
bullet(doc, "Open and delete operations check the read_roles or delete_roles stored against the document.")

heading(doc, "8. Website Admin")
body(doc, "The public website is database-driven through website_settings. The owner-admin can update title, tagline, hero heading, hero body, contact email, phone, address, colours, logo path, logo size, logo corner radius, font family and font sizes from the Setup Panel.")
bullet(doc, "Direct website code: app/page.tsx")
bullet(doc, "Website metadata/API persistence: lib/erp-repository.ts, updateWebsiteSettings")
bullet(doc, "Database table: website_settings")
bullet(doc, "Admin UI: app/app/setup/page.tsx, Website tab")

heading(doc, "9. Code Navigation")
body(doc, "The codebase follows the Next.js App Router structure. Each module has a page under app/app and database operations flow through app/api/erp/[collection]/route.ts into lib/erp-repository.ts.")
bullet(doc, "PMS pages: app/app/tenants, app/app/properties, app/app/contracts, app/app/maintenance, app/app/documents")
bullet(doc, "CRM page: app/app/crm/page.tsx")
bullet(doc, "Compliance page: app/app/compliance/page.tsx and app/app/support-notes/page.tsx")
bullet(doc, "Finance page: app/app/finance/page.tsx plus app/app/payments/page.tsx")
bullet(doc, "Reports pages: app/app/analytics, app/app/portfolio, app/app/vacancy-intelligence")
bullet(doc, "Admin/setup page: app/app/setup/page.tsx")
bullet(doc, "Navigation components: components/Sidebar.tsx and components/MobileNav.tsx")
bullet(doc, "Authentication/session enforcement: lib/auth.ts and app/api/auth/*")
bullet(doc, "Shared storage APIs: app/api/storage/route.ts, app/api/storage/open/route.ts, app/api/documents/upload/route.ts, app/api/documents/analyze/route.ts")
bullet(doc, "Database schema: db/schema.sql")
compact_table(doc, ["Path", "Meaning"], [
    ["app/page.tsx", "Public UK Support Housing website. Reads website_settings and renders branding/content."],
    ["app/admin/login", "Admin/staff login screen."],
    ["app/app/page.tsx", "Main staff dashboard and module launchpad."],
    ["app/app/setup/page.tsx", "Owner-admin setup panel, website admin, records editor and shared storage admin."],
    ["app/app/crm/page.tsx", "CRM partners, referrals and communication logs."],
    ["app/app/compliance/page.tsx", "Support plans and risk assessments."],
    ["app/app/finance/page.tsx", "Light ERP finance hub for ledger, expenses and landlord payments."],
    ["app/app/analytics/page.tsx", "Cube-style bespoke report builder and free rule-based AI insights."],
    ["app/app/documents/page.tsx", "Document upload, open, download, delete, analyse and folder browsing."],
    ["app/api/erp/[collection]/route.ts", "Main role-protected CRUD endpoint for ERP collections."],
    ["app/api/reports/bi/route.ts", "Lightweight BI/data warehouse API for dashboards, trends, drilldowns and predictions."],
    ["app/api/reports/cube/route.ts", "Report cube API for metric/dimension analysis."],
    ["app/api/ai/insights/route.ts", "Free rule-based insights API inspired by workflow automation tools."],
    ["app/api/storage/route.ts", "Shared filesystem listing, folder creation, rename and delete."],
    ["app/api/documents/analyze/route.ts", "Document metadata and text preview/summary endpoint."],
    ["lib/auth.ts", "Signed session cookies, server-side role checks and owner-admin enforcement."],
    ["lib/erp-repository.ts", "Database repository for setup, snapshots and business record creation/update."],
    ["lib/reporting.ts", "Cube aggregation and rule-based insight logic."],
    ["db/schema.sql", "PostgreSQL schema and migration source."],
    ["components/Sidebar.tsx", "Desktop module-panel navigation."],
    ["components/MobileNav.tsx", "Mobile module navigation."],
    ["Dockerfile / docker-compose.yml", "Portable container deployment."],
    ["PORTABLE_SETUP.md", "Step-by-step setup on new hardware."],
])

heading(doc, "10. Database Layer and Metadata")
body(doc, "The database is PostgreSQL. The application reads DATABASE_URL from /home/ubuntu/realtyos/.env.local on the server. Migrations are applied by running npm run db:migrate, which executes db/schema.sql.")
bullet(doc, "Inspect tables: psql \"$DATABASE_URL\" -c \"\\dt\"")
bullet(doc, "Describe a table: psql \"$DATABASE_URL\" -c \"\\d+ tenants\"")
bullet(doc, "Count records: psql \"$DATABASE_URL\" -c \"select count(*) from tenants;\"")
bullet(doc, "Core metadata is held in agencies, website_settings, staff_users and documents.")
bullet(doc, "Document permission metadata is held in documents.read_roles, documents.write_roles and documents.delete_roles.")
bullet(doc, "CRM metadata is held in crm_partners, referrals and communication_logs.")
bullet(doc, "Compliance metadata is held in support_plans, risk_assessments, support_notes and incidents.")
bullet(doc, "Finance metadata is held in payment_ledger_entries, housing_benefit_claims, expense_entries and landlord_payments.")
compact_table(doc, ["Table", "Purpose", "Important Columns"], [
    ["agencies", "Organisation profile and shared settings", "id, name, contact_email, shared_file_root, currency_code"],
    ["staff_users", "Staff login accounts and roles", "id, agency_id, full_name, email, role, password_hash, active"],
    ["staff_sessions", "Server-side session records", "staff_id, token_hash, expires_at, revoked_at"],
    ["website_settings", "Public website content and styling", "site_title, hero_heading, logo_path, logo_width, font sizes, contact fields"],
    ["landlords", "Owner/landlord accounts", "name, email, phone, address, portal_enabled"],
    ["properties", "Property portfolio", "landlord_id, address, postcode, local_authority, total_rooms, metadata"],
    ["rooms", "Units/rooms and occupancy", "property_id, room_label, weekly_rent, status"],
    ["tenants", "Resident profile and support metadata", "property_id, room_id, name fields, NI, HB ref, risk_assessment, support_worker_id"],
    ["tenancy_contracts", "Tenancy/rent contracts", "tenant_id, property_id, room_id, contract_number, start/end, weekly_rent, status"],
    ["payment_ledger_entries", "Rent/HB/UC ledger", "tenant_id, property_id, type, debit, credit, entry_date, status"],
    ["housing_benefit_claims", "HB/UC claim tracking", "tenant_id, claim_ref_number, period, amount, status"],
    ["documents", "Document registry and permissions", "storage_key, file_path, read_roles, write_roles, delete_roles"],
    ["crm_partners", "Councils/referrers/providers", "type, organisation_name, contact_name, email, phone"],
    ["referrals", "Referral pipeline", "partner_id, applicant_name, status, priority, support_needs, target_move_in"],
    ["communication_logs", "CRM/case communications", "partner_id, tenant_id, referral_id, channel, subject, follow_up_date"],
    ["support_notes", "Weekly case notes", "tenant_id, staff_id, week_start, note, outcomes, next_actions, risk_change"],
    ["support_plans", "Tenant support plans", "tenant_id, owner_id, status, goals, needs_summary, review_date"],
    ["risk_assessments", "Safeguarding/risk evidence", "tenant_id, assessor_id, risk_level, safeguarding_concerns, mitigation_plan"],
    ["incidents", "Operational incidents", "tenant_id, property_id, severity, status, summary, owner_id"],
    ["automation_tasks", "Reminder/task queue", "tenant_id, property_id, assigned_to, type, title, due_date, status"],
    ["maintenance_jobs", "Repairs/maintenance", "property_id, tenant_id, title, priority, status, cost"],
    ["expense_entries", "Operating costs", "property_id, landlord_id, category, amount, expense_date, status"],
    ["landlord_payments", "Owner payment tracking", "landlord_id, property_id, period_start/end, amount, status, paid_at"],
])

heading(doc, "11. Technical Runbook")
bullet(doc, "Check service: systemctl status realtyos")
bullet(doc, "Restart service: sudo systemctl restart realtyos")
bullet(doc, "View logs: journalctl -u realtyos -n 100 --no-pager")
bullet(doc, "Run migration: cd /home/ubuntu/realtyos && set -a && . ./.env.local && set +a && npm run db:migrate")
bullet(doc, "Build app: npm run build")
bullet(doc, "Confirm storage: ls -ld /mnt/storage")
bullet(doc, "Confirm database tables: use psql with DATABASE_URL and inspect information_schema.tables")

heading(doc, "12. Backup and Recovery")
body(doc, "Backups must include PostgreSQL, /mnt/storage, source code and environment configuration. A database-only backup is incomplete because the physical document files live outside the database.")
bullet(doc, "PostgreSQL: run pg_dump against DATABASE_URL to a dated backup file.")
bullet(doc, "Storage: use rsync or tar to back up /mnt/storage.")
bullet(doc, "Environment: back up /home/ubuntu/realtyos/.env.local securely.")
bullet(doc, "Restore order: restore database, restore storage, restore environment, build app, restart realtyos.")
bullet(doc, "Test recovery regularly by restoring to a non-production machine.")

heading(doc, "13. Module Operations Manual")
heading(doc, "PMS Operations", 2)
bullet(doc, "Create/update tenants from the Tenants page or Setup Panel Records tab.")
bullet(doc, "Create/update properties, rooms and occupancy from Properties or Setup Panel Records.")
bullet(doc, "Upload tenancy agreements, property compliance files and landlord documents from Documents.")
bullet(doc, "Use Maintenance for property repair tracking and operational costs.")
heading(doc, "CRM Operations", 2)
bullet(doc, "Create partner organisations first, then create referrals linked to those partners.")
bullet(doc, "Use referral status to move applicants through new, screening, approved, waitlist, rejected and converted.")
bullet(doc, "Log phone calls, emails, meetings and follow-up dates in Communication Logs.")
heading(doc, "Compliance Operations", 2)
bullet(doc, "Create support plans per tenant with needs summary, goals, plan owner and review date.")
bullet(doc, "Create risk assessments with safeguarding concerns and mitigation plans.")
bullet(doc, "Use weekly support notes for case evidence and council audit trail.")
heading(doc, "Finance Operations", 2)
bullet(doc, "Post rent charges as debits and HB/UC or tenant payments as credits.")
bullet(doc, "Record expenses against properties or landlords.")
bullet(doc, "Track landlord payment status from draft to approved to paid.")
heading(doc, "Reports Operations", 2)
bullet(doc, "Use Analytics for the BI dashboard layer: Portfolio Performance, Tenant & Support Outcomes, Financial & Arrears, and Operational Efficiency.")
bullet(doc, "Use the slicing selector to compare property, region, landlord, support worker, referral source and payment-type views.")
bullet(doc, "Use drill-down to move from region to property to tenant-level evidence.")
bullet(doc, "Use Monthly PDF to print/export management dashboard packs.")
bullet(doc, "Use CSV export when a council, investor, accountant or analyst needs raw report rows.")
bullet(doc, "Council reports should draw from tenants, support_notes, support_plans, risk_assessments, incidents and documents.")
bullet(doc, "Investor/portfolio reports should draw from properties, rooms, payment_ledger_entries, expenses, maintenance_jobs and landlord_payments.")

heading(doc, "14. BI/Data Warehouse Layer")
body(doc, "The BI layer is intentionally lightweight. It does not duplicate the whole operational database. Instead, it builds dashboard-ready marts from the single PostgreSQL source of truth whenever reports are requested.")
bullet(doc, "Portfolio Performance: occupancy rate, revenue per property, arrears percentage and average void period. Slices include property, region and landlord.")
bullet(doc, "Tenant & Support Outcomes: support sessions per tenant, outcome improvements, risk levels, failed tenancies. Slices include support worker, referral source and tenant type.")
bullet(doc, "Financial & Arrears: rent due vs collected, arrears aging, HB/UC delays. Slices include tenant, property and payment type.")
bullet(doc, "Operational Efficiency: time to fill voids, maintenance response, staff workload and cost per tenant.")
bullet(doc, "Advanced queries supported include arrears by property/referral source, support sessions vs outcomes, and ROI vs issues by landlord/property.")
bullet(doc, "Time analysis includes monthly rent trends and monthly support/outcome trends. Cohort analysis uses tenant joined month.")
bullet(doc, "Predictive analytics are currently rule-based and auditable: arrears risk, placement failure risk and occupancy forecast.")
bullet(doc, "Alerts are generated for arrears spikes, void rooms, high-risk tenants, active referrals and open maintenance.")
bullet(doc, "Refresh is live on page/API request today. For hourly/daily scheduled refresh, add a cron job or worker to materialise report snapshots later.")

heading(doc, "15. Dummy's Guide to BI Reports")
body(doc, "BI Reports is for asking questions of the data. Overview is the story board for quick management understanding; BI Reports is the analysis workshop where staff choose a fact, a measure and a dimension.")
callout(doc, "Plain English definitions", [
    "Fact: the subject area being analysed, such as rent ledger, rooms, referrals or support notes.",
    "Measure: the number being calculated, such as arrears value, support session count or occupancy percentage.",
    "Dimension: the way the result is grouped, such as property, month, local authority, risk level or status.",
    "Slice and dice: change the dimension to see the same measure from another angle.",
    "Drill down: start at region, open property, then review linked tenant-level detail.",
])
heading(doc, "How to Generate a Report", 2)
numbered(doc, "Open Reports / BI Reports from the left menu.")
numbered(doc, "Choose a report template if you want a quick start, for example Council outcomes, Investor portfolio or Finance arrears.")
numbered(doc, "Choose the Fact/subject. Example: Arrears uses the rent ledger; Support uses support notes.")
numbered(doc, "Check the Measure label. This tells you exactly what number the report is calculating.")
numbered(doc, "Choose the Dimension. Example: property shows results by property; month shows trends over time.")
numbered(doc, "Choose a chart type: bar, line, area, donut or table.")
numbered(doc, "Use Export CSV if you need the raw rows for Excel, councils, investors or accountants.")
numbered(doc, "Use Print/PDF to create a management pack from the current screen.")
heading(doc, "How to Create Story Boards", 2)
body(doc, "Story boards live on the Overview page. They are designed for managers who need the business picture quickly, not for detailed analysis. The story tabs combine KPIs, charts and narrative prompts.")
bullet(doc, "Portfolio story: occupancy, rooms, revenue, arrears and property pressure.")
bullet(doc, "Support story: support sessions, outcomes, high-risk residents and missed evidence.")
bullet(doc, "Finance story: rent due, rent collected, HB/UC delays and arrears.")
bullet(doc, "Risk story: safeguarding, incidents, high-risk tenants and placement failure warnings.")
bullet(doc, "When a staff member needs detail, they should move from Overview to BI Reports.")
heading(doc, "Suggested BI Questions for Staff", 2)
bullet(doc, "Which properties have the highest arrears?")
bullet(doc, "Which local authority areas have the most referrals?")
bullet(doc, "How many support sessions were logged this month?")
bullet(doc, "Which tenants have high risk and low support evidence?")
bullet(doc, "Which properties have good rent performance but high maintenance issues?")
bullet(doc, "Are HB/UC delays getting worse month by month?")

heading(doc, "16. CRM Guide for Staff")
body(doc, "The CRM module manages relationships and referrals before a person becomes a tenant. It should be used by housing officers, managers and support staff to keep councils, charities, referrers and providers coordinated.")
heading(doc, "CRM Screens", 2)
bullet(doc, "Pipeline: Kanban-style referral stages from New to Screening, Approved, Waitlist, Converted or Rejected.")
bullet(doc, "Partners: directory for councils, social workers, charities, support providers and health partners.")
bullet(doc, "Activities: call, email, meeting and follow-up history.")
bullet(doc, "Create Records: forms for adding partners, new referrals and communication logs.")
heading(doc, "How CRM Helps Staff", 2)
bullet(doc, "Prevents referrals being lost in email inboxes.")
bullet(doc, "Shows which applicants are urgent, approved or waiting for a room.")
bullet(doc, "Stores every conversation so another staff member can pick up the case.")
bullet(doc, "Creates a clear audit trail for councils and referrers.")
bullet(doc, "Helps managers see referral demand, bottlenecks and follow-up workload.")
heading(doc, "Recommended CRM Workflow", 2)
numbered(doc, "Add the partner organisation first, for example a local council, charity or social worker team.")
numbered(doc, "Create the referral and link it to that partner.")
numbered(doc, "Set priority and target move-in date.")
numbered(doc, "Record support needs and known risks.")
numbered(doc, "Move the referral through New, Screening, Approved, Waitlist, Converted or Rejected.")
numbered(doc, "Log every call, email and meeting with a follow-up date.")
numbered(doc, "When the applicant moves in, create the tenant record in PMS and mark the referral Converted.")

heading(doc, "17. Website and ERP Customisation")
body(doc, "Setup now contains both Public Website Editor and Supported Housing ERP Platform Customizer. The public website controls affect www.uksupporthousing.co.uk. The platform customizer affects the internal /realtyos staff shell.")
bullet(doc, "Public website controls: logo, title, tagline, contact details, hero badge, hero heading, hero body, process heading, process body, colours, fonts and sizing.")
bullet(doc, "Website assets: owner-admins can upload image assets and use the generated /uploads/... path in logo fields.")
bullet(doc, "ERP platform controls: platform title, sidebar brand, internal logo path, primary colour, accent colour, Overview menu label and BI Reports menu label.")
bullet(doc, "Use the public editor for marketing/content changes and the ERP customizer for staff workspace branding.")
bullet(doc, "Changes are stored in website_settings and loaded dynamically by the website, sidebar and topbar.")

heading(doc, "18. BI API Reference")
bullet(doc, "GET /api/reports/bi returns dashboards, trends, predictive scores, drilldown hierarchy, external summaries and alerts.")
bullet(doc, "GET /api/reports/cube?metric=arrears&dimension=property returns metric/dimension cube rows.")
bullet(doc, "GET /api/ai/insights returns free rule-based workflow insights from PostgreSQL.")
bullet(doc, "All report APIs require authenticated staff sessions. Role-based views can restrict rows for support workers and readonly users.")

heading(doc, "16. Current Readiness")
body(doc, "The platform is ready as an internal MVP for staff-controlled data entry, onboarding, compliance evidence, document storage and finance tracking. It should not be treated as final go-live until data migration, staff user testing, backup rehearsal and password rotation are completed.")
callout(doc, "Before go-live", [
    "Rotate the temporary owner-admin password.",
    "Create named staff logins and verify role access.",
    "Import and validate all tenants, properties, rooms, rent rates and landlord assignments.",
    "Run a backup and restore rehearsal for PostgreSQL and /mnt/storage.",
    "Perform user acceptance testing with admin, manager, support worker and finance users.",
    "Add HubSpot webhook integration for automatic draft referrals.",
])

doc.save(OUT)
print(OUT)
