# Cycle List Payments

## Purpose

Cycle List Payments track Housing Association payments to Managing Agents by Cycle List Number.

## Database

Table: `housing_association_payments`

Key fields:

- `agency_id`
- `housing_association_id`
- `snapshot_id`
- `cycle_list_number`
- `expected_amount`
- `payment_status`
- `due_date`
- `paid_date`
- `amount_paid`
- `payment_reference`
- `notes`

## Status Rules

Central helper: `lib/payment-status.ts`

- `pending`: payment expected and not overdue.
- `completed`: amount paid is at least expected amount.
- `partial`: some payment has been received but less than expected.
- `missed`: due date passed and payment is not complete.
- `disputed`: manually controlled.
- `cancelled`: manually controlled.

## Workflow

1. Create PMS Cycle Snapshot in Finance.
2. A payment record is created/updated for the same Cycle List Number.
3. Finance updates amount paid, paid date, reference and notes.
4. Status recalculates unless manually set to disputed/cancelled.

## Reporting

BI finance output includes pending, missed and completed cycle payment counts plus raw cycle payment rows for dashboard/reporting use.
