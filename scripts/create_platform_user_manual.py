from __future__ import annotations

from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SHOTS = DOCS / "manual-assets" / "screenshots"
DOCX_OUT = DOCS / "Platform_User_Manual.docx"
MD_OUT = DOCS / "Platform_User_Manual.md"
XLSX_OUT = DOCS / "Data_Import_Template.xlsx"

ACCENT = RGBColor(191, 154, 45)
PRIMARY = RGBColor(15, 23, 42)
MUTED = RGBColor(71, 85, 105)
LIGHT = "F8FAFC"
GOLD_LIGHT = "FFF7DB"
BLUE_LIGHT = "EFF6FF"
GREEN_LIGHT = "ECFDF5"
RED_LIGHT = "FEF2F2"


def set_cell_shading(cell, fill: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_text(cell, text: str, bold=False):
    cell.text = ""
    p = cell.paragraphs[0]
    run = p.add_run(text)
    run.font.name = "Aptos"
    run.font.size = Pt(9)
    run.font.bold = bold
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def add_run_paragraph(doc, text: str, style=None, bold_prefix: str | None = None):
    p = doc.add_paragraph(style=style)
    if bold_prefix and text.startswith(bold_prefix):
        r = p.add_run(bold_prefix)
        r.bold = True
        p.add_run(text[len(bold_prefix):])
    else:
        p.add_run(text)
    return p


def add_note(doc, title: str, text: str, kind="note"):
    fill = {"note": BLUE_LIGHT, "tip": GREEN_LIGHT, "warning": GOLD_LIGHT, "risk": RED_LIGHT}.get(kind, BLUE_LIGHT)
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    p = cell.paragraphs[0]
    r = p.add_run(title)
    r.bold = True
    r.font.color.rgb = PRIMARY
    p.add_run(f" {text}")
    for paragraph in cell.paragraphs:
        paragraph.paragraph_format.space_after = Pt(3)
    doc.add_paragraph()


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    for i, header in enumerate(headers):
      set_cell_shading(hdr[i], "E2E8F0")
      set_cell_text(hdr[i], header, bold=True)
    for row in rows:
      cells = table.add_row().cells
      for i, value in enumerate(row):
        set_cell_text(cells[i], str(value))
    if widths:
      for row in table.rows:
        for i, width in enumerate(widths):
          row.cells[i].width = Cm(width)
    doc.add_paragraph()
    return table


def add_figure(doc, filename: str, caption: str):
    path = SHOTS / filename
    if not path.exists():
        add_note(doc, "Screenshot pending.", f"{filename} was not available during generation.", "warning")
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(str(path), width=Inches(6.35))
    cap = doc.add_paragraph(caption)
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.style = "Caption"


def add_steps(doc, steps):
    for index, step in enumerate(steps, start=1):
        p = doc.add_paragraph()
        r = p.add_run(f"{index}. ")
        r.bold = True
        p.add_run(step)
    doc.add_paragraph()


def add_bullets(doc, items):
    for item in items:
        doc.add_paragraph(item, style="List Bullet")
    doc.add_paragraph()


def heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    for run in p.runs:
        run.font.color.rgb = PRIMARY if level == 1 else ACCENT
    return p


def build_markdown():
    md = f"""# Platform User Manual

**Platform:** UK Support Housing / Supported Housing ERP  
**Version/date:** {date.today().isoformat()}  
**Audience:** administrators, staff, implementation teams, and client onboarding teams

## Purpose
This manual explains how to access, configure, mobilize, and operate the platform. It covers the public website, admin workspace, Setup Panel, PMS, CRM, Compliance, Finance, Documents, Overview, Reports, settings, and Excel data import.

## Main Modules
- Public website and Sign in journey
- Admin workspace and Overview
- Setup Panel with dynamic setup checklist
- Company profile, branding, staff/user setup, shared files, and data import
- PMS: properties, tenants, rooms/units, maintenance, support notes, documents
- CRM: partners, referrals, activities, tasks and follow-ups
- Compliance: safeguarding, risk, support evidence and audit trail
- Finance & Contracts: contracts, payments, HB/UC, rent ledger and arrears
- Reports: BI dashboards, slicing and data export
- Settings and permissions

## Setup Journey
1. Sign in as an owner-admin.
2. Open Admin > Setup Panel.
3. Review the dynamic checklist tiles.
4. Open each dedicated setup activity page.
5. Complete required fields, save, and return to the checklist.
6. Import or create source data.
7. Review Overview and Reports.
8. Test user permissions and go-live workflows.

## Screenshots
Screenshots are stored in `docs/manual-assets/screenshots/` and embedded in the Word document.

## Data Import
The Excel import workflow supports `.xlsx` files, workbook preview, column mapping, row validation, confirmation before database writes, duplicate handling, and import logs.

## Troubleshooting Summary
- Login issues: confirm the user account exists and has the correct role.
- Setup tile not complete: refresh setup status and confirm required data exists.
- Import rejected: check file type and workbook headers.
- Report missing data: confirm imported source records and refresh reports.
"""
    MD_OUT.write_text(md, encoding="utf-8")


def build_import_template():
    wb = Workbook()
    default = wb.active
    wb.remove(default)
    sheets = {
        "CRM Partners": [
            ["organisation_name", "partner_type", "contact_name", "email", "phone", "status", "notes"],
            ["Example Council", "council", "Safe Demo Contact", "contact@example.org", "02000000000", "active", "Generic sample only"],
        ],
        "Referrals": [
            ["applicant_name", "referral_source", "referral_status", "priority", "received_date", "notes"],
            ["Demo Applicant", "Example Council", "new", "medium", "2026-04-27", "Generic sample only"],
        ],
        "Properties": [
            ["address", "postcode", "local_authority", "landlord_name", "room_count", "weekly_rent"],
            ["1 Example Street", "EX1 1AA", "Example Borough", "Demo Landlord", 4, 175],
        ],
        "Tenants": [
            ["first_name", "last_name", "email", "phone", "property_address", "room_label", "move_in_date", "status"],
            ["Demo", "Tenant", "tenant@example.org", "07000000000", "1 Example Street", "Room 1", "2026-04-27", "active"],
        ],
        "Finance Ledger": [
            ["tenant_name", "property_address", "transaction_date", "payment_type", "amount", "status", "reference"],
            ["Demo Tenant", "1 Example Street", "2026-04-27", "housing_benefit", 175, "expected", "HB-DEMO-001"],
        ],
    }
    for name, rows in sheets.items():
        ws = wb.create_sheet(name)
        for row in rows:
            ws.append(row)
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="0F172A")
        table = Table(displayName=name.replace(" ", ""), ref=f"A1:{chr(64 + len(rows[0]))}{len(rows)}")
        style = TableStyleInfo(name="TableStyleMedium2", showFirstColumn=False, showLastColumn=False, showRowStripes=True, showColumnStripes=False)
        table.tableStyleInfo = style
        ws.add_table(table)
        for col in ws.columns:
            width = max(len(str(cell.value or "")) for cell in col) + 3
            ws.column_dimensions[col[0].column_letter].width = min(width, 34)
    wb.save(XLSX_OUT)


def build_docx():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.6)
    section.left_margin = Cm(1.65)
    section.right_margin = Cm(1.65)

    styles = doc.styles
    styles["Normal"].font.name = "Aptos"
    styles["Normal"].font.size = Pt(10)
    styles["Normal"].paragraph_format.space_after = Pt(6)
    for style_name, size in [("Heading 1", 20), ("Heading 2", 15), ("Heading 3", 12)]:
        styles[style_name].font.name = "Aptos Display"
        styles[style_name].font.size = Pt(size)
        styles[style_name].font.bold = True
    styles["Caption"].font.name = "Aptos"
    styles["Caption"].font.size = Pt(8)
    styles["Caption"].font.italic = True
    styles["Caption"].font.color.rgb = MUTED

    # Cover
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(120)
    r = p.add_run("Platform User Manual")
    r.font.name = "Aptos Display"
    r.font.size = Pt(32)
    r.font.bold = True
    r.font.color.rgb = PRIMARY
    p2 = doc.add_paragraph("Supported Housing ERP")
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.runs[0].font.size = Pt(18)
    p2.runs[0].font.color.rgb = ACCENT
    p3 = doc.add_paragraph(f"Version date: {date.today().strftime('%d %B %Y')}")
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4 = doc.add_paragraph("Audience: administrators, staff, implementation teams, and client onboarding teams")
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_note(doc, "Document control.", "Use this manual for staff training, implementation handover, and first-time setup. Screenshots are from the live UI with private record areas redacted where needed.", "note")
    doc.add_page_break()

    heading(doc, "Contents", 1)
    contents = [
        "1. Document Purpose",
        "2. Platform Overview",
        "3. Getting Started",
        "4. User Roles and Permissions",
        "5. Setup Panel Guide",
        "6. Company Profile Setup",
        "7. Branding Setup",
        "8. Staff and User Setup",
        "9. CRM Module Guide",
        "10. PMS Module Guide",
        "11. Overview Dashboard Guide",
        "12. Reporting Module Guide",
        "13. Excel Data Import Guide",
        "14. Settings and Configuration",
        "15. Website Management",
        "16. Mobilizing the Platform",
        "17. Common Workflows",
        "18. Troubleshooting",
        "19. Best Practices",
        "20. Glossary and Appendix",
    ]
    add_bullets(doc, contents)
    doc.add_page_break()

    heading(doc, "1. Document Purpose", 1)
    doc.add_paragraph("This manual explains how to set up, configure, mobilize, and operate the Supported Housing ERP platform. It is written for non-technical administrators and operational staff, while also giving implementation teams enough detail to support onboarding.")
    add_bullets(doc, [
        "Administrators will learn how to configure company, brand, staff, files, and setup checklist activities.",
        "Staff will learn how to use the PMS, CRM, documents, finance, compliance, overview, and reports areas.",
        "Implementation teams will learn the recommended sequence for launching a new company or client.",
    ])

    heading(doc, "2. Platform Overview", 1)
    doc.add_paragraph("The platform combines a public website, secure admin workspace, property management, CRM, compliance evidence, light finance, documents, reports, and setup tooling. It is intended to help supported housing teams keep records, activities, documents, rent data, and reporting evidence connected.")
    add_figure(doc, "01-public-home.png", "Figure 2.1: Public website homepage and sign-in entry point.")
    add_table(doc, ["Module", "Purpose", "Typical users"], [
        ["Public website", "Company-facing landing page and Sign in journey.", "Visitors, staff, clients"],
        ["Overview", "Management dashboards and operational storyboards.", "Admin, managers"],
        ["Setup Panel", "Owner-admin command centre for onboarding and configuration.", "Owner-admin"],
        ["PMS", "Properties, rooms, tenants, documents, maintenance and support records.", "Housing staff, managers"],
        ["CRM", "Councils, referrers, partners, referrals, activities and tasks.", "Admin, support, business development"],
        ["Compliance", "Support evidence, safeguarding, risks, plans and audit trail.", "Support workers, managers"],
        ["Finance & Contracts", "Contracts, rent ledger, payments, HB/UC and arrears visibility.", "Finance, admin"],
        ["Reports", "BI dashboards, slicing, exports and management reporting.", "Managers, admin"],
        ["Documents", "Shared file storage and document management.", "Admin, staff"],
    ], widths=[4, 8, 4])

    heading(doc, "3. Getting Started", 1)
    add_figure(doc, "02-login.png", "Figure 3.1: Admin login page.")
    add_steps(doc, [
        "Open the public website or direct admin login route.",
        "Select Sign in or open the Admin sign in page.",
        "Enter the staff/admin email address and password provided by the implementation lead.",
        "After login, review the sidebar and top search/quick action controls.",
        "Use the Overview page first to understand the current operating position.",
    ])
    add_note(doc, "Browser guidance.", "Use a modern browser such as Chrome, Edge, Safari, or Firefox. Desktop is recommended for setup and Excel import; tablet/mobile can be used for simple review tasks.", "tip")

    heading(doc, "4. User Roles and Permissions", 1)
    add_table(doc, ["Role", "Typical access", "Guidance"], [
        ["Owner-admin", "Full platform and Setup Panel access.", "Limit to trusted implementation or senior admin users."],
        ["Admin", "Operational administration across records and modules.", "Use for day-to-day system managers."],
        ["Manager", "Operational oversight, reports and staff activity.", "Use for service managers."],
        ["Support worker", "Tenant support notes, visits, compliance evidence and assigned work.", "Avoid giving setup access unless required."],
        ["Housing officer", "Properties, tenants, rooms, maintenance and related documents.", "Useful for PMS operations."],
        ["Finance", "Contracts, payments, ledger and arrears workflows.", "Restrict sensitive setup changes."],
        ["Read only", "Review-only access where configured.", "Useful for audits or external review."],
    ], widths=[3, 7, 6])
    add_note(doc, "Security rule.", "Setup and Excel import tools are owner-admin protected. Do not share administrator accounts; create named staff users instead.", "warning")

    heading(doc, "5. Setup Panel Guide", 1)
    doc.add_paragraph("The Setup Panel is the owner-admin onboarding command centre. The checklist is dynamic: tile status is calculated from real platform state such as company profile records, website settings, staff users, PMS records, CRM records, document storage, and import logs.")
    add_figure(doc, "04-setup-checklist.png", "Figure 5.1: Setup Panel showing dynamic checklist tiles.")
    add_table(doc, ["Status", "Meaning", "Action"], [
        ["Not started", "Required records or settings are missing.", "Open the tile and complete required fields."],
        ["In progress", "Some requirements exist but setup is incomplete.", "Review warnings and add missing data."],
        ["Needs attention", "The tile has warnings or incomplete criteria.", "Follow the guidance in the activity screen."],
        ["Completed", "The completion criteria are satisfied by live state.", "No immediate action required."],
        ["Optional/skipped", "A non-critical task may be left for later if supported.", "Review before go-live."],
    ], widths=[3, 7, 6])
    add_steps(doc, [
        "Open Admin > Setup Panel.",
        "Review the overall progress bar and each tile status.",
        "Click a tile to open its dedicated setup activity screen.",
        "Complete required actions, save, and select Back to Setup Panel.",
        "Refresh status if the tile does not update immediately.",
    ])

    heading(doc, "6. Company Profile Setup", 1)
    add_figure(doc, "05-setup-company-profile.png", "Figure 6.1: Focused Company Profile setup activity.")
    doc.add_paragraph("Company Profile holds the key agency information used across the platform, including agency name, registration/reference details, contact email, currency and shared file root.")
    add_steps(doc, [
        "Open Setup Panel and select Company Profile.",
        "Enter the agency/company name and operational contact details.",
        "Choose the currency used for rent, contracts and finance reporting.",
        "Confirm the shared file root path configured by the implementation team.",
        "Save progress and return to the Setup Panel.",
    ])
    add_note(doc, "Completion criteria.", "The tile completes when agency name, contact email, currency and shared file root are populated.", "note")

    heading(doc, "7. Branding Setup", 1)
    add_figure(doc, "06-setup-branding.png", "Figure 7.1: Branding and Website setup activity.")
    doc.add_paragraph("Branding controls the public website and platform identity settings available through the Website/Admin configuration screens.")
    add_steps(doc, [
        "Open Setup Panel and select Branding and Website.",
        "Update the site title, tagline, logo path, logo size and logo radius.",
        "Set the primary, secondary and accent colours.",
        "Review font settings by section where available.",
        "Save changes and check the public website.",
    ])
    add_note(doc, "Design best practice.", "Use one clear primary colour, one supporting colour and one accent. Avoid changing too many visual settings at once; test readability after each brand update.", "tip")

    heading(doc, "8. Staff and User Setup", 1)
    doc.add_paragraph("Staff users are managed from the Setup Panel System activity and record editing tools. Create individual accounts for each person; do not use shared logins.")
    add_steps(doc, [
        "Open Setup Panel and select Admin and Staff Users.",
        "Enter the staff member's name, email, role and temporary password.",
        "Choose the least-privileged role that matches their duties.",
        "Create the login and ask the staff member to sign in.",
        "Review access and remove or update users who no longer need access.",
    ])
    add_table(doc, ["Task", "Recommended owner", "Notes"], [
        ["Create owner-admin", "Implementation lead", "Only trusted senior/admin users."],
        ["Create operational staff", "Admin", "Use named accounts and role-specific access."],
        ["Review permissions", "Manager/Admin", "Review monthly or during staff changes."],
        ["Deactivate/remove access", "Admin", "Perform immediately when staff leave."],
    ], widths=[5, 5, 6])

    heading(doc, "9. CRM Module Guide", 1)
    add_figure(doc, "08-crm-workspace.png", "Figure 9.1: CRM Workspace landing page.")
    doc.add_paragraph("The CRM module manages relationship and referral work: councils, referral partners, support providers, referral pipeline records, communications, activities and follow-up tasks.")
    add_steps(doc, [
        "Open CRM Workspace from the sidebar.",
        "Use the search box and filters to find partners, referrals, activities or tasks.",
        "Use Quick Create actions to add a partner, referral, activity or task.",
        "Review the pipeline cards and recent CRM activity.",
        "Edit or delete records only when authorised and after checking impact.",
    ])
    add_table(doc, ["CRM concept", "What it means in this platform"], [
        ["Partner/account", "Council, referrer, charity, support provider or external organisation."],
        ["Referral/lead", "Potential tenant or case referred into the service."],
        ["Activity/log", "Communication, call, email, visit, meeting or compliance check."],
        ["Task/follow-up", "Next action assigned to staff with a due date/status."],
        ["Pipeline", "Referral status journey from new to approved, converted or closed."],
    ], widths=[5, 11])

    heading(doc, "10. PMS Module Guide", 1)
    add_figure(doc, "09-pms-properties.png", "Figure 10.1: PMS properties list.")
    doc.add_paragraph("The PMS module covers supported housing operational records: properties, rooms/units, tenants, maintenance, support notes, documents and occupancy information.")
    add_steps(doc, [
        "Open PMS > Properties to review the property portfolio.",
        "Use Add Property to create a new property record where available.",
        "Open a property to review rooms/units, contracts, payments, maintenance and documents.",
        "Use PMS > Tenants to review or maintain tenant records.",
        "Use PMS > Documents for tenancy agreements, compliance documents and uploaded evidence.",
    ])
    add_note(doc, "Data quality.", "Use consistent property addresses, room labels and tenant names. Reporting and imports depend on consistent source records.", "tip")

    heading(doc, "11. Overview Dashboard Guide", 1)
    add_figure(doc, "03-overview.png", "Figure 11.1: Overview dashboard with operational storyboards.")
    doc.add_paragraph("Overview is the management landing page. It combines operational dashboards, storyboards and quick indicators across PMS, CRM, compliance and finance data.")
    add_bullets(doc, [
        "Use Overview for quick daily management checks.",
        "Metrics are based on current platform data and imported source records.",
        "If values are missing, confirm the underlying PMS/CRM/ledger records exist.",
        "Use Reports for deeper slicing, export and BI-style analysis.",
    ])

    heading(doc, "12. Reporting Module Guide", 1)
    add_figure(doc, "11-reports-bi.png", "Figure 12.1: BI reports and management dashboards.")
    doc.add_paragraph("Reports provide a BI-style layer for management analysis. It includes portfolio performance, support outcomes, financial/arrears and operational efficiency views where source data exists.")
    add_steps(doc, [
        "Open Reports > Analytics.",
        "Choose a dashboard tab such as Portfolio Performance, Tenant & Support Outcomes, Financial & Arrears or Operational Efficiency.",
        "Use the slicing/drop-down controls to change the dimension.",
        "Review charts and KPI cards.",
        "Use export controls such as CSV/PDF where available.",
    ])
    add_note(doc, "Missing data.", "Reports are only as good as the source records. If a chart looks empty, check PMS records, CRM records, payment ledger entries and import logs.", "warning")

    heading(doc, "13. Excel Data Import Guide", 1)
    add_figure(doc, "07-setup-data-import.png", "Figure 13.1: Excel source data import workflow.")
    doc.add_paragraph("The Excel import workflow helps an owner-admin upload source data, preview workbook sheets, map columns, validate rows, and confirm import before writing to PostgreSQL.")
    add_steps(doc, [
        "Prepare a `.xlsx` workbook using clear sheet names and headers.",
        "Open Setup Panel > Excel Source Data Import.",
        "Choose the workbook file and upload.",
        "Review detected sheets and suggested targets.",
        "Map spreadsheet columns to platform fields.",
        "Validate rows and correct any errors.",
        "Confirm import only when the preview and validation results are acceptable.",
        "Review import logs and verify records in CRM, PMS, Overview and Reports.",
    ])
    add_table(doc, ["Sheet/category", "Suggested sheet names", "Common headers"], [
        ["CRM", "Contacts, Customers, Clients, Leads, Accounts, CRM Partners", "organisation_name, contact_name, email, phone, status, notes"],
        ["PMS", "Properties, Units, Tenants, Rooms, Maintenance", "address, postcode, tenant, room_label, local_authority, weekly_rent"],
        ["Finance/Reporting", "Transactions, Ledger, Revenue, Payments, Metrics", "date, amount, payment_type, status, tenant_name, property_address"],
    ], widths=[4, 5, 7])
    add_note(doc, "Import safety.", "The importer does not silently write uploaded rows. It requires preview, mapping, validation and owner-admin confirmation.", "warning")

    heading(doc, "14. Settings and Configuration", 1)
    add_figure(doc, "12-settings.png", "Figure 14.1: Settings page.")
    doc.add_paragraph("Settings expose operational configuration and role/access information. Some sensitive values, such as database and service credentials, must remain server-side and are not shown in the browser.")
    add_bullets(doc, [
        "Use setup activities for company and brand settings.",
        "Use Settings for operational guidance and role/access reference.",
        "Do not place secrets, keys or database passwords in visible website content.",
        "Ask the technical administrator to update server environment values.",
    ])

    heading(doc, "15. Website Management", 1)
    doc.add_paragraph("The public website is managed through Website/Admin settings. Admins can update site title, logo, colours, hero content, contact details and brand presentation where fields are exposed.")
    add_steps(doc, [
        "Open Setup Panel > Branding and Website.",
        "Update public-facing identity and content fields.",
        "Save changes.",
        "Open the public homepage and review the result.",
        "Check mobile and desktop readability before launch.",
    ])

    heading(doc, "16. Mobilizing the Platform for a New Business", 1)
    add_table(doc, ["#", "Launch activity", "Owner", "Done"], [
        [1, "Deploy or access the platform.", "Implementation", ""],
        [2, "Create first owner-admin.", "Implementation", ""],
        [3, "Complete company profile.", "Owner-admin", ""],
        [4, "Configure branding and public website.", "Owner-admin", ""],
        [5, "Set up users and roles.", "Admin", ""],
        [6, "Configure CRM partners/referral process.", "Admin/CRM lead", ""],
        [7, "Configure PMS properties, rooms and tenant records.", "Housing lead", ""],
        [8, "Upload/import source data.", "Owner-admin", ""],
        [9, "Review Overview dashboard.", "Manager", ""],
        [10, "Configure and test reports.", "Manager", ""],
        [11, "Review permissions.", "Owner-admin", ""],
        [12, "Test website and sign-in journey.", "Implementation", ""],
        [13, "Run final launch readiness review.", "Owner-admin", ""],
    ], widths=[1.2, 7, 4, 2])

    heading(doc, "17. Common Workflows", 1)
    heading(doc, "17.1 Set up a new company", 2)
    add_steps(doc, ["Sign in as owner-admin.", "Open Setup Panel.", "Complete Company Profile.", "Complete Branding and Website.", "Create staff users.", "Import or create CRM/PMS data.", "Review reports and launch readiness."])
    heading(doc, "17.2 Add a CRM record", 2)
    add_steps(doc, ["Open CRM Workspace.", "Select the relevant quick action.", "Enter required fields.", "Save the record.", "Confirm it appears in search and activity history."])
    heading(doc, "17.3 Add PMS records", 2)
    add_steps(doc, ["Open PMS > Properties or PMS > Tenants.", "Use add/edit controls.", "Enter required metadata.", "Link related records where available.", "Review Overview/Reports after source data is available."])
    heading(doc, "17.4 Fix import validation errors", 2)
    add_steps(doc, ["Read the validation panel.", "Correct missing required fields or invalid formats in Excel.", "Upload again or adjust mapping.", "Validate again.", "Confirm import only when errors are resolved."])

    heading(doc, "18. Troubleshooting Guide", 1)
    add_table(doc, ["Issue", "Likely cause", "What to do"], [
        ["Cannot log in", "Wrong credentials, user missing or inactive.", "Ask an admin to confirm the staff record and reset credentials."],
        ["Cannot access Setup Panel", "User is not owner-admin.", "Sign in as owner-admin or request setup permission review."],
        ["Setup tile will not complete", "Required data missing or status not refreshed.", "Open tile, review completion criteria, save missing data and refresh."],
        ["Upload rejected", "Wrong file type or oversized file.", "Use `.xlsx` and keep file within the configured upload limit."],
        ["Headers not detected", "Merged cells or unclear header row.", "Use one header row with simple column names."],
        ["Import validation failed", "Required field missing or value format invalid.", "Correct the workbook or mapping and validate again."],
        ["Data imported but not visible", "Wrong target mapping or report cache/source mismatch.", "Check import logs, relevant module records and refresh reports."],
        ["Branding not updating", "Saved values not reviewed on public route.", "Refresh page and confirm values in Website Admin."],
        ["Report not updating", "Source records missing or not imported.", "Check PMS/CRM/ledger records and import logs."],
    ], widths=[4, 6, 6])

    heading(doc, "19. Best Practices", 1)
    add_bullets(doc, [
        "Keep company settings accurate and review them before launch.",
        "Use named staff accounts and limit owner-admin access.",
        "Use clear naming conventions for properties, tenants, partners and documents.",
        "Validate imported data before confirming database writes.",
        "Review reports after every major import.",
        "Keep regular database and file-storage backups.",
        "Avoid uploading unnecessary sensitive documents.",
        "Test key workflows using a small safe sample before full rollout.",
    ])

    heading(doc, "20. Glossary", 1)
    add_table(doc, ["Term", "Meaning"], [
        ["Owner-admin", "The administrator account allowed to access setup and import tooling."],
        ["PMS", "Property Management System: properties, rooms, tenants, maintenance and documents."],
        ["CRM", "Customer/relationship management: councils, referrers, partners, referrals and activities."],
        ["HB/UC", "Housing Benefit / Universal Credit rent-related payment context."],
        ["Setup tile", "A dynamic checklist item calculated from live setup data."],
        ["Import log", "Audit record of a workbook upload, mapping, validation and import result."],
        ["BI", "Business intelligence reporting and slicing/dicing of operational data."],
    ], widths=[4, 12])

    heading(doc, "21. Appendix", 1)
    heading(doc, "21.1 Setup checklist summary", 2)
    add_bullets(doc, ["Company Profile", "Branding and Website", "Admin and Staff Users", "PMS Data", "CRM Foundation", "Overview and Reporting", "Documents and Storage", "Excel Source Data Import", "Final Review and Launch"])
    heading(doc, "21.2 Recommended Excel column names", 2)
    add_bullets(doc, ["CRM: organisation_name, partner_type, contact_name, email, phone, status, notes", "Referrals: applicant_name, referral_source, referral_status, priority, received_date, notes", "Properties: address, postcode, local_authority, landlord_name, room_count, weekly_rent", "Tenants: first_name, last_name, email, phone, property_address, room_label, move_in_date, status", "Finance Ledger: tenant_name, property_address, transaction_date, payment_type, amount, status, reference"])
    add_note(doc, "Support handover.", "Keep this manual with the deployment notes, configuration guide, backup guide, and security checklist for each client/company rollout.", "note")

    # Footer
    for section in doc.sections:
      footer = section.footer.paragraphs[0]
      footer.text = "Supported Housing ERP User Manual"
      footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
      for run in footer.runs:
        run.font.size = Pt(8)
        run.font.color.rgb = MUTED

    doc.save(DOCX_OUT)


if __name__ == "__main__":
    DOCS.mkdir(exist_ok=True)
    build_markdown()
    build_import_template()
    build_docx()
    print(DOCX_OUT)
    print(MD_OUT)
    print(XLSX_OUT)
