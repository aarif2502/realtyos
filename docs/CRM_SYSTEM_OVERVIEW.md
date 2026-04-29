# CRM System Overview

## A. System Summary

The CRM module manages supported-housing relationships and referral activity for the deployed housing organisation. It is used by authorised staff to manage councils, referrers, charities, health partners, support providers, applicant leads, communication history, and CRM follow-up tasks.

The current CRM entry point is:

- `/app/crm` - CRM Workspace landing page and dashboard.

Main CRM workflows:

- Add or maintain a partner/contact/account.
- Create a lead/referral for a prospective supported-housing tenant.
- Move the lead through the pipeline: New, Screening, Approved, Waitlist, Converted, Rejected.
- Log communication activity against a partner and/or referral.
- Create and maintain follow-up tasks.
- Search, filter, edit, and delete CRM records where the logged-in staff role permits it.

## B. Navigation and Routing

Primary route:

- `app/app/crm/page.tsx` renders `/app/crm`.

Navigation changes:

- The sidebar now exposes CRM as a direct `CRM Workspace` link.
- The old CRM submenu labels `Referrals & Partners` and `Reminders` are no longer shown in the CRM side menu.
- The underlying `/app/automation` route is preserved because automation tasks may still be used elsewhere.

Related routes:

- `/app/crm` - CRM command centre, pipeline, contacts, activities, tasks.
- `/api/erp` - authenticated snapshot endpoint used to load CRM data.
- `/api/erp/crmPartners` - create, update, delete CRM partner/account records.
- `/api/erp/referrals` - create, update, delete leads/referrals.
- `/api/erp/communicationLogs` - create, update, delete activity records.
- `/api/erp/automationTasks` - create, update, delete CRM follow-up tasks and wider automation tasks.

## C. Component Map

Important CRM UI files:

- `app/app/crm/page.tsx`
  - Purpose: Main CRM landing page/dashboard.
  - Inputs: Fetches `/api/erp`; posts/patches/deletes via `/api/erp/[collection]`.
  - Data source: `crmPartners`, `referrals`, `communicationLogs`, `automationTasks`, and `staff` from the ERP snapshot.
  - Child UI blocks: metric cards, CRM health panel, search/filter controls, pipeline board, partner cards, activity cards, task cards, quick-create/edit forms.

- `components/Sidebar.tsx`
  - Purpose: Main workspace navigation.
  - CRM change: CRM is now a direct link to `/app/crm`.
  - Hidden items: `Referrals & Partners`, `Reminders`.

- `components/Topbar.tsx`
  - Purpose: Top page title, global search, quick actions, profile menu.
  - CRM change: `/app/crm` displays `CRM Workspace`.

- `components/SectionCard.tsx`
  - Purpose: Shared framed section component used by CRM dashboard panels.

## D. Backend/API Map

Important API files:

- `app/api/erp/route.ts`
  - Method: `GET`.
  - Purpose: Returns the authorised ERP snapshot.
  - CRM response fields: `crmPartners`, `referrals`, `communicationLogs`, `automationTasks`, `staff`.
  - Permission check: `requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"])`.

- `app/api/erp/[collection]/route.ts`
  - Methods: `POST`, `PATCH`, `DELETE`.
  - Purpose: Generic authenticated collection endpoint.
  - CRM collections: `crmPartners`, `referrals`, `communicationLogs`, `automationTasks`.
  - Request body: JSON fields matching the repository input names, for example `organisationName`, `applicantName`, `supportNeeds`, `followUpDate`, `assignedTo`.
  - Response: Created/updated/deleted database record or `{ error: string }`.
  - Permission checks: Role-based `writeRoles` map inside this file.

Repository/service file:

- `lib/erp-repository.ts`
  - Purpose: Database persistence functions.
  - CRM functions:
    - `createCrmPartner`, `updateCrmPartner`, `deleteCrmPartner`
    - `createReferral`, `updateReferral`, `deleteReferral`
    - `createCommunicationLog`, `updateCommunicationLog`, `deleteCommunicationLog`
    - `createAutomationTask`, `updateAutomationTask`, `deleteAutomationTask`
    - `getErpSnapshot`

Authentication files:

- `lib/auth.ts`
  - Purpose: Signed staff session cookie, session lookup, role checks.
  - Key functions: `getStaffSession`, `requireStaffSession`, `requireOwnerAdmin`.

Database connection:

- `lib/db.ts`
  - Purpose: PostgreSQL connection helper using `DATABASE_URL`.
  - Do not print or commit live database credentials.

## E. Database Map

CRM-related tables are defined in `db/schema.sql`.

### `crm_partners`

Purpose: Organisations and contacts such as local councils, referrers, charities, health partners, and support providers.

Important fields:

- `id` - UUID primary key.
- `agency_id` - owning agency.
- `type` - `local_council`, `referrer`, `support_provider`, `charity`, `health_partner`, `other`.
- `organisation_name` - account/organisation name.
- `contact_name`, `email`, `phone` - primary contact details.
- `notes` - relationship notes.
- `created_at`, `updated_at` - audit timestamps.

Indexes:

- `crm_partners_agency_idx` on `agency_id`.

### `referrals`

Purpose: CRM lead/referral pipeline for prospective tenants.

Important fields:

- `id` - UUID primary key.
- `agency_id` - owning agency.
- `partner_id` - optional link to `crm_partners`.
- `tenant_id` - optional link after conversion into PMS.
- `applicant_name` - lead/applicant.
- `source` - source detail.
- `status` - `new`, `screening`, `approved`, `waitlist`, `rejected`, `converted`.
- `priority` - `low`, `normal`, `urgent`.
- `support_needs`, `notes`, `target_move_in`.
- `created_at`, `updated_at`.

Indexes:

- `referrals_agency_idx` on `agency_id`.

### `communication_logs`

Purpose: CRM communication history and follow-up evidence.

Important fields:

- `id` - UUID primary key.
- `agency_id` - owning agency.
- `partner_id` - optional CRM partner.
- `tenant_id` - optional PMS tenant.
- `referral_id` - optional CRM referral.
- `staff_id` - optional staff owner.
- `channel` - `email`, `phone`, `meeting`, `letter`, `portal`, `other`.
- `subject`, `notes`, `follow_up_date`.
- `created_at`.

Indexes:

- `communication_logs_agency_idx` on `agency_id`.

### `automation_tasks`

Purpose: Tasks and reminders, including CRM follow-ups.

Important fields:

- `id` - UUID primary key.
- `agency_id` - owning agency.
- `tenant_id`, `property_id`, `assigned_to`.
- `type` - includes `referral_follow_up` and `general`.
- `title`, `due_date`.
- `status` - `open`, `in_progress`, `done`, `cancelled`.
- `created_at`, `completed_at`.

Indexes:

- `automation_tasks_agency_idx` on `agency_id`.

## F. Permissions Map

CRM data is not public. All CRM APIs require a valid staff session.

Read access:

- `admin`
- `manager`
- `support_worker`
- `housing_officer`
- `finance`
- `readonly`

Write access from `app/api/erp/[collection]/route.ts`:

- `crmPartners`
  - Create/edit: `admin`, `manager`, `housing_officer`
  - Delete: `admin`
- `referrals`
  - Create/edit: `admin`, `manager`, `housing_officer`, `support_worker`
  - Delete: `admin`
- `communicationLogs`
  - Create/edit: `admin`, `manager`, `housing_officer`, `support_worker`
  - Delete: `admin`
- `automationTasks`
  - Create/edit: `admin`, `manager`, `housing_officer`, `support_worker`, `finance`
  - Delete: `admin`

To safely adjust permissions:

1. Edit the `writeRoles` map in `app/api/erp/[collection]/route.ts`.
2. Keep destructive actions restricted to senior roles unless there is a clear operational reason.
3. Rebuild and test create/edit/delete from a role with and without permission.

## G. Data Flow

CRM dashboard load:

1. `app/app/crm/page.tsx` calls `GET /api/erp`.
2. `app/api/erp/route.ts` verifies the staff session.
3. `getErpSnapshot()` in `lib/erp-repository.ts` queries PostgreSQL.
4. The UI receives `crmPartners`, `referrals`, `communicationLogs`, `automationTasks`, and `staff`.
5. The page renders metrics, filters, pipeline cards, contacts, activities, and tasks.

Create/edit/delete flow:

1. Staff submits a CRM form or clicks a record action.
2. `app/app/crm/page.tsx` calls `/api/erp/[collection]`.
3. `app/api/erp/[collection]/route.ts` checks the logged-in role against `writeRoles`.
4. `lib/erp-repository.ts` performs the PostgreSQL query.
5. The UI refreshes from `/api/erp` so the dashboard reflects the database state.

## H. Manual Edit and Troubleshooting Guide

Editing CRM labels/navigation:

- Sidebar CRM label: `components/Sidebar.tsx`.
- Topbar title: `components/Topbar.tsx`.
- CRM tab labels: `app/app/crm/page.tsx`.

Editing dashboard cards:

- Metric calculations are in `app/app/crm/page.tsx` near the `openReferrals`, `urgentReferrals`, `approvedReferrals`, `followUps`, and `overdueTasks` variables.
- Visual card components are defined at the bottom of `app/app/crm/page.tsx`.

Adding new CRM fields:

1. Add the column safely in `db/schema.sql` using `alter table ... add column if not exists`.
2. Update the matching repository function in `lib/erp-repository.ts`.
3. Add the field to the CRM form in `app/app/crm/page.tsx`.
4. Update this document.
5. Run migration, lint, and build.

Debugging database connection problems:

- Confirm `DATABASE_URL` exists in the runtime environment.
- Check `lib/db.ts` for connection behavior.
- Run `npm run db:migrate`.
- Check server logs with `systemctl status realtyos` and `journalctl -u realtyos`.

Debugging missing CRM data:

- Confirm the user is logged in as staff.
- Check `GET /api/erp` in the browser network tab.
- Confirm the relevant table has rows for the current `agency_id`.
- Verify `getErpSnapshot()` includes the collection.

Debugging permission errors:

- A `401` means no valid staff session.
- A `403` means the staff role is authenticated but not allowed for that operation.
- Check `writeRoles` in `app/api/erp/[collection]/route.ts`.
- Check `staff_users.role` in PostgreSQL.

Debugging failed create/edit/delete:

- Check the browser network response body for `{ error: string }`.
- Confirm required fields are present.
- Confirm enum values match `db/schema.sql` checks.
- Confirm the API collection name is supported by `creators`, `updateAdminCollection`, and `deleteAdminCollection`.

Rebuilding and redeploying safely:

- Run lint and build locally first.
- Deploy only changed source files.
- Run lint and build on the server.
- Restart the `realtyos` service.
- Smoke-test `/realtyos/app/crm` and `/realtyos/api/erp`.

## I. Commands and Operations

Install dependencies:

```bash
npm install
```

Run local development server:

```bash
npm run dev
```

Run database migrations:

```bash
npm run db:migrate
```

Bootstrap admin, if needed on a fresh install:

```bash
npm run db:bootstrap-admin
```

Run lint:

```bash
npm run lint
```

Build production:

```bash
npm run build
```

Start production locally:

```bash
npm run start
```

Server deployment notes visible from this repository:

- App runs as a Next.js application.
- PostgreSQL is accessed through `DATABASE_URL`.
- Production service is managed by the `realtyos` systemd service on the Ubuntu host.
- Public app route is under `/realtyos`.

## J. Change Log

2026-04-27:

- CRM sidebar entry changed to a direct `CRM Workspace` link.
- Removed visible CRM submenu items `Referrals & Partners` and `Reminders`.
- Rebuilt `/app/crm` as a real-data CRM command centre.
- Added metrics, pipeline board, contact/account directory, activity history, task/follow-up management, search, filters, empty states, edit forms, and delete confirmations.
- Added backend update/delete support for `automationTasks`.
- Preserved existing database records and schema.
