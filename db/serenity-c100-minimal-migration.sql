-- Serenity Cycle 100 minimal additive migration
-- Safe for current RealtyOS schema using UUIDs.

alter table properties
  add column if not exists normalized_address text,
  add column if not exists record_status text,
  add column if not exists needs_review_reason text;

alter table tenants
  add column if not exists needs_review_reason text;

alter table occupancy_records
  add column if not exists cycle_list_number text;

alter table import_logs
  add column if not exists cycle_list_number text,
  add column if not exists source_type text,
  add column if not exists dry_run boolean not null default false;

alter table housing_association_payments
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists properties_agency_normalized_address_idx
  on properties(agency_id, normalized_address);

create index if not exists tenants_agency_claim_ref_idx
  on tenants(agency_id, hb_claim_ref_number);

create index if not exists occupancy_records_agency_cycle_idx
  on occupancy_records(agency_id, cycle_list_number);

create index if not exists import_logs_agency_cycle_idx
  on import_logs(agency_id, cycle_list_number);

create index if not exists pms_cycle_snapshots_agency_cycle_idx
  on pms_cycle_snapshots(agency_id, cycle_list_number);