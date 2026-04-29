# Landlord Payments

Phase 2 adds data structures for landlord payment rates and remittance-linked payment obligations. It does not initiate real payments.

## Schema

`db/serenity-cycle100-additive.sql` adds:

- `landlord_payment_rates`
- `landlord_payment_obligations`

## Landlord Payment Rates

Rates are property-scoped and Managing-Agent-scoped.

Important fields:

- `agency_id`
- `property_id`
- `landlord_id`
- `rate_amount`
- `rate_frequency`
- `effective_from`
- `effective_to`
- `status`

This supports examples such as a Kings Road monthly landlord rate of 200.00 as configurable data. The address is not hardcoded.

## Payment Obligations

Obligations are generated from confirmed remittance lines and active landlord rates.

Statuses:

- `pending`
- `completed`
- `missed`
- `partial`
- `disputed`
- `cancelled`

No row should be marked `completed` unless a real payment reference/evidence is recorded. If no payment provider integration exists, the UI should say `Record payment` or `Mark as paid`, not `Send payment`.

## Current UI

The Finance workspace includes:

- landlord rate setup by property, landlord, amount, frequency and effective dates
- remittance address search and received-amount breakdown
- landlord payment obligation list
- manual `Record Payment` workflow with amount, paid date, reference and notes

There is no live payout provider wired into this workflow. Recording a payment updates the platform audit state only; it does not send money.

## Kings Road Validation

Kings Road is handled as normal data:

1. configure the relevant Kings Road property with an active monthly landlord rate, for example 200.00
2. import or enter a remittance line for that address
3. search `Kings Road` in the Finance remittance section
4. verify the received amount, linked property, cycle, calculated payment due and status

The application does not hardcode Kings Road logic.

## Duplicate Prevention

The migration adds a unique partial index to prevent more than one active obligation for the same agency, remittance line and landlord. Cancelled obligations can be retained for audit.

## Future Calculation Rules

Central calculation should:

1. find the active rate for the property and period
2. calculate the due amount based on rate frequency
3. flag missing rates as `needs_review`
4. avoid duplicate obligations for the same remittance line
5. preserve inputs and outputs in metadata for audit

## Commands

Apply schema:

```bash
npm run db:migrate
```

Review Cycle 98 process model:

```bash
node scripts/analyze-cycle98-remittance.mjs
```
