# Data Export

## PMS Cycle Export

The PMS cycle export creates an `.xlsx` file using `New Tenant List Cycle 74.xlsx` as the template.

Steps:

1. Open Finance.
2. Create or select a Housing Association.
3. Enter a Cycle List Number.
4. Enter expected payment amount and due date if known.
5. Create Snapshot.
6. Download Excel from the snapshot history.

## Security

The export route loads the snapshot by `id` and active session `agency_id`. A user cannot export another Managing Agent's snapshot by changing the URL.

## Limitations

The export preserves the workbook sheets and column layout. It fills the template columns from stored snapshot rows. If the template changes, update `lib/pms-cycle-export.ts` header mapping.
