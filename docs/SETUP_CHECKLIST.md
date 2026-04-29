# Dynamic Setup Checklist

## Overview

The Setup Panel checklist is calculated from live platform state instead of static checkboxes. Each tile represents a real setup activity and opens a focused activity screen so the admin is not dropped into a settings block at the bottom of the page.

Route:

- `/realtyos/app/setup`

Status API:

- `GET /realtyos/api/setup/status`

Status service:

- `lib/setup-status.ts`

## Statuses

Each task can return:

- `not_started`
- `in_progress`
- `needs_attention`
- `completed`
- `optional`

Completion is calculated from database/configuration state. For example:

- Company Profile checks `agencies`.
- Branding checks `website_settings`.
- Staff Users checks `staff_users`.
- PMS Data checks `properties`, `rooms`, and `tenants`.
- CRM Foundation checks `crm_partners` and `referrals`.
- Reporting checks source records such as properties and ledger entries.
- Documents checks shared file root and `documents`.
- Import checks `import_logs`.

All setup checks run inside the current Managing Agent context. A staff admin assigned to Serenity Housing sees Serenity Housing setup state; a UK Support Housing admin sees UK Support Housing setup state.

## Task Registry

Tasks are defined in `lib/setup-status.ts`.

Each task includes:

- `key`
- `title`
- `description`
- `status`
- `progress`
- `actionLabel`
- `workflow`
- `href`
- `completionCriteria`
- `warnings`
- `lastUpdated`

## Tile Navigation

Checklist tiles no longer switch the lower tabbed area in place. Clicking a tile updates the Setup Panel URL with an `activity` query and renders a dedicated activity view:

- Activity URL pattern: `/realtyos/app/setup?activity=<task_key>`
- Back action: returns to `/realtyos/app/setup`
- Invalid activity key: shows a helpful fallback with a Back to Setup Panel action

The focused activity screen shows:

- setup activity title and explanation
- current status badge
- task progress
- completion requirement
- warnings from the setup status engine
- the relevant form, upload workflow, storage tool, or review panel
- Back to Setup Panel and refresh controls

## Adding A New Setup Task

1. Add any required schema/table support.
2. Extend the query/count logic in `lib/setup-status.ts`.
3. Add a `SetupTask` entry with progress, warnings, `workflow`, and an `href` using `/realtyos/app/setup?activity=<task_key>`.
4. Add or route to the matching focused activity workflow in `app/app/setup/page.tsx`.
5. Document the route and completion criteria here.

## Workflow Map

- Company Profile: `/realtyos/app/setup?activity=company_profile`
- Branding and Website: `/realtyos/app/setup?activity=branding`
- Staff Users: `/realtyos/app/setup?activity=staff_users`
- PMS Data: `/realtyos/app/setup?activity=pms_foundation`
- CRM Foundation: `/realtyos/app/setup?activity=crm_foundation`
- Overview and Reporting: `/realtyos/app/setup?activity=reporting_sources`
- Documents and Storage: `/realtyos/app/setup?activity=documents_storage`
- Excel Import: `/realtyos/app/setup?activity=source_data_import`
- Final Review: `/realtyos/app/setup?activity=launch_readiness`

Internal workflow tabs still exist for direct admin navigation, but checklist tiles use focused activity mode.

## Troubleshooting

- Tile does not open: confirm the task key from `/realtyos/api/setup/status` exists in `app/app/setup/page.tsx`.
- Tile opens the wrong workflow: check the task `workflow` value in `lib/setup-status.ts`.
- Tile status does not update: confirm the relevant database records exist and then refresh `/realtyos/api/setup/status`.
- Activity route shows fallback: the `activity` query key is invalid or no longer defined in the setup task registry.

## Security

The setup page, setup status API, and import tooling require owner-admin access. Non-owner staff cannot access setup status or import tooling.

## PMS Fresh Start and Tenant Cycle Import

The PMS Data activity now contains a safe fresh-start/reset panel and a dedicated importer for `New Tenant List Cycle 74.xlsx`.

The reset panel shows current counts for:

- properties
- rooms
- tenants
- occupancy records

The reset requires the exact confirmation phrase `DELETE PMS DATA` and a final browser confirmation.

The tenant-cycle importer validates the `template` sheet, previews parsed rows, stores row warnings/errors, calculates `Record Status`, and only imports after owner-admin confirmation.
