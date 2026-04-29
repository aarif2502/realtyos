# Housing Associations

## Purpose

Housing Associations represent partners that receive PMS cycle list exports and make payments to Managing Agents.

## Database

Table: `housing_associations`

Key fields:

- `agency_id`: Managing Agent scope
- `name`
- `contact_name`
- `contact_email`
- `phone`
- `address`
- `payment_terms`
- `status`
- `notes`

Properties can be linked with `properties.housing_association_id`.

## Workflow

1. Open Finance.
2. Create the Housing Association.
3. Link properties to the Housing Association when creating/editing property records.
4. Create a PMS Cycle Snapshot for that Housing Association.
5. Track the Housing Association payment by Cycle List Number.

## Security

Housing Associations are scoped by Managing Agent. Standard admins and staff only see records for their own Managing Agent. Platform admins see records for the selected Managing Agent context.
