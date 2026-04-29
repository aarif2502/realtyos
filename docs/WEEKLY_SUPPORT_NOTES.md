# Weekly Support Notes

Weekly support notes are recorded inside the authenticated platform and scoped to the active Managing Agent.

## What Staff Can Record

The Support Notes workspace supports:

- tenant selection
- optional property selection
- support worker/staff selection
- exact week start date
- optional period end date
- support note text
- outcomes
- next actions
- risk movement

Records include audit fields such as created date, created staff user where available, updated date and Managing Agent ownership.

## Permissions

The create workflow uses `/api/erp/supportNotes` and requires an authenticated staff role. The PDF export endpoint requires an authenticated role and filters by the current `agency_id` server-side.

Normal staff cannot export or view support notes from another Managing Agent by changing URLs or ids.

## Filtering And Export

Staff can filter by:

- tenant
- property
- staff worker
- from date
- to date

The export button downloads a PDF pack from:

```text
/api/support-notes/export
```

The PDF is generated server-side and includes only notes visible to the active Managing Agent context.

## Troubleshooting

- If a tenant is missing, check that the tenant belongs to the active Managing Agent.
- If a property is rejected, confirm the property belongs to the same Managing Agent.
- If export returns no rows, clear filters and confirm notes exist for the selected date range.
- If access is denied, confirm the user has a staff role allowed to view support notes.
