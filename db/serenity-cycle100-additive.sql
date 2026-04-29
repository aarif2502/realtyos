create extension if not exists pgcrypto;

alter table tenants add column if not exists cycle_list_number text;
alter table tenants add column if not exists needs_review_reason text;
alter table tenants add column if not exists source_row_key text;
alter table tenants add column if not exists housing_association_id uuid;

alter table tenants drop constraint if exists tenants_housing_association_id_fkey;
alter table tenants add constraint tenants_housing_association_id_fkey
  foreign key (housing_association_id) references housing_associations(id) on delete set null;

alter table occupancy_records add column if not exists cycle_list_number text;
alter table occupancy_records add column if not exists hb_claim_ref_number text;
alter table occupancy_records add column if not exists needs_review_reason text;

alter table payment_ledger_entries add column if not exists cycle_list_number text;
alter table payment_ledger_entries add column if not exists source_import_log_id uuid;
alter table payment_ledger_entries add column if not exists housing_association_id uuid;

alter table payment_ledger_entries drop constraint if exists payment_ledger_entries_housing_association_id_fkey;
alter table payment_ledger_entries add constraint payment_ledger_entries_housing_association_id_fkey
  foreign key (housing_association_id) references housing_associations(id) on delete set null;

alter table import_logs add column if not exists cycle_list_number text;
alter table import_logs add column if not exists housing_association_id uuid;

alter table import_logs drop constraint if exists import_logs_housing_association_id_fkey;
alter table import_logs add constraint import_logs_housing_association_id_fkey
  foreign key (housing_association_id) references housing_associations(id) on delete set null;

create table if not exists council_tax_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  housing_association_id uuid references housing_associations(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  account_ref text not null,
  property_reference text,
  source_property_address text not null,
  normalized_property_address text,
  tax_year text not null,
  liability_start_date date,
  liability_end_date date,
  band text,
  annual_charge numeric(12,2) not null default 0,
  outstanding_debt numeric(12,2) not null default 0,
  six_month_deduction numeric(12,2) not null default 0,
  self_contained boolean,
  status text not null default 'needs_review' check (status in ('active', 'ended', 'missing_info', 'needs_review')),
  source_file text,
  source_import_log_id uuid references import_logs(id) on delete set null,
  needs_review_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, account_ref, tax_year)
);

create index if not exists council_tax_records_agency_idx on council_tax_records(agency_id);
create index if not exists council_tax_records_ha_idx on council_tax_records(housing_association_id);
create index if not exists council_tax_records_property_idx on council_tax_records(property_id);
create index if not exists council_tax_records_tax_year_idx on council_tax_records(agency_id, tax_year);
create index if not exists council_tax_records_status_idx on council_tax_records(agency_id, status);
create index if not exists council_tax_records_norm_addr_idx on council_tax_records(agency_id, normalized_property_address);

create table if not exists remittance_batches (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  housing_association_id uuid references housing_associations(id) on delete set null,
  cycle_list_number text not null,
  remittance_month text,
  remittance_period_start date,
  remittance_period_end date,
  source_file_name text not null,
  source_file_type text not null default 'xlsx',
  total_received_amount numeric(12,2) not null default 0,
  imported_by_user_id uuid references staff_users(id) on delete set null,
  status text not null default 'uploaded' check (status in ('uploaded', 'parsed', 'validated', 'imported', 'needs_review', 'failed', 'cancelled')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, housing_association_id, cycle_list_number, source_file_name)
);

create index if not exists remittance_batches_agency_cycle_idx on remittance_batches(agency_id, cycle_list_number);
create index if not exists remittance_batches_ha_idx on remittance_batches(housing_association_id);
create index if not exists remittance_batches_month_idx on remittance_batches(agency_id, remittance_month);
create index if not exists remittance_batches_status_idx on remittance_batches(agency_id, status);

create table if not exists remittance_line_items (
  id uuid primary key default gen_random_uuid(),
  remittance_batch_id uuid not null references remittance_batches(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  housing_association_id uuid references housing_associations(id) on delete set null,
  cycle_list_number text not null,
  tenant_id uuid references tenants(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  landlord_id uuid references landlords(id) on delete set null,
  raw_tenant_name text,
  raw_property_address text not null,
  normalized_property_address text,
  reference_number text,
  payment_period_start date,
  payment_period_end date,
  number_of_days integer,
  expected_amount numeric(12,2) not null default 0,
  gross_amount numeric(12,2) not null default 0,
  adjustment_amount numeric(12,2) not null default 0,
  admin_charge numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,
  match_status text not null default 'needs_review' check (match_status in ('matched', 'ambiguous', 'unmatched', 'needs_review')),
  match_confidence numeric(5,2),
  needs_review_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, cycle_list_number, reference_number, raw_property_address, payment_period_start, payment_period_end)
);

create index if not exists remittance_line_items_agency_cycle_idx on remittance_line_items(agency_id, cycle_list_number);
create index if not exists remittance_line_items_ha_idx on remittance_line_items(housing_association_id);
create index if not exists remittance_line_items_property_idx on remittance_line_items(property_id);
create index if not exists remittance_line_items_tenant_idx on remittance_line_items(tenant_id);
create index if not exists remittance_line_items_landlord_idx on remittance_line_items(landlord_id);
create index if not exists remittance_line_items_match_idx on remittance_line_items(agency_id, match_status);
create index if not exists remittance_line_items_norm_addr_idx on remittance_line_items(agency_id, normalized_property_address);
create index if not exists remittance_line_items_period_idx on remittance_line_items(agency_id, payment_period_start);

create table if not exists landlord_payment_rates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  landlord_id uuid references landlords(id) on delete set null,
  rate_amount numeric(12,2) not null default 0,
  rate_frequency text not null default 'monthly' check (rate_frequency in ('monthly', 'weekly', 'per_cycle', 'custom')),
  effective_from date not null default current_date,
  effective_to date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landlord_payment_rates_agency_idx on landlord_payment_rates(agency_id);
create index if not exists landlord_payment_rates_property_idx on landlord_payment_rates(property_id);
create index if not exists landlord_payment_rates_landlord_idx on landlord_payment_rates(landlord_id);
create index if not exists landlord_payment_rates_status_idx on landlord_payment_rates(agency_id, status);
create unique index if not exists landlord_payment_rates_active_uidx
  on landlord_payment_rates(agency_id, property_id, coalesce(landlord_id, '00000000-0000-0000-0000-000000000000'::uuid), effective_from)
  where status = 'active';

create table if not exists landlord_payment_obligations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  remittance_batch_id uuid references remittance_batches(id) on delete set null,
  remittance_line_item_id uuid references remittance_line_items(id) on delete set null,
  cycle_list_number text not null,
  property_id uuid references properties(id) on delete set null,
  landlord_id uuid references landlords(id) on delete set null,
  received_amount numeric(12,2) not null default 0,
  landlord_rate_amount numeric(12,2) not null default 0,
  calculated_payment_due numeric(12,2) not null default 0,
  due_date date,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'completed', 'missed', 'partial', 'disputed', 'cancelled')),
  amount_paid numeric(12,2) not null default 0,
  paid_date date,
  payment_reference text,
  payment_method text,
  approved_by_user_id uuid references staff_users(id) on delete set null,
  paid_by_user_id uuid references staff_users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landlord_payment_obligations_agency_cycle_idx on landlord_payment_obligations(agency_id, cycle_list_number);
create index if not exists landlord_payment_obligations_property_idx on landlord_payment_obligations(property_id);
create index if not exists landlord_payment_obligations_landlord_idx on landlord_payment_obligations(landlord_id);
create index if not exists landlord_payment_obligations_status_idx on landlord_payment_obligations(agency_id, payment_status);
create unique index if not exists landlord_payment_obligations_active_uidx
  on landlord_payment_obligations(agency_id, remittance_line_item_id, coalesce(landlord_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where payment_status <> 'cancelled' and remittance_line_item_id is not null;

create index if not exists tenants_agency_cycle_idx on tenants(agency_id, cycle_list_number);
create index if not exists tenants_housing_association_idx on tenants(housing_association_id);
create index if not exists tenants_source_row_key_idx on tenants(agency_id, source_row_key);
create index if not exists occupancy_records_agency_cycle_idx on occupancy_records(agency_id, cycle_list_number);
create index if not exists occupancy_records_claim_idx on occupancy_records(agency_id, hb_claim_ref_number);
create index if not exists ledger_agency_cycle_idx on payment_ledger_entries(agency_id, cycle_list_number);
create index if not exists ledger_housing_association_idx on payment_ledger_entries(housing_association_id);
create index if not exists import_logs_cycle_idx on import_logs(agency_id, cycle_list_number);
create index if not exists import_logs_housing_association_idx on import_logs(housing_association_id);

alter table support_notes add column if not exists property_id uuid;
alter table support_notes add column if not exists period_end date;
alter table support_notes add column if not exists created_by_user_id uuid;
alter table support_notes add column if not exists updated_at timestamptz not null default now();
alter table support_notes add column if not exists updated_by_user_id uuid;
alter table support_notes add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table support_notes drop constraint if exists support_notes_property_id_fkey;
alter table support_notes add constraint support_notes_property_id_fkey
  foreign key (property_id) references properties(id) on delete set null;
alter table support_notes drop constraint if exists support_notes_created_by_user_id_fkey;
alter table support_notes add constraint support_notes_created_by_user_id_fkey
  foreign key (created_by_user_id) references staff_users(id) on delete set null;
alter table support_notes drop constraint if exists support_notes_updated_by_user_id_fkey;
alter table support_notes add constraint support_notes_updated_by_user_id_fkey
  foreign key (updated_by_user_id) references staff_users(id) on delete set null;

create index if not exists support_notes_agency_date_idx on support_notes(agency_id, week_start);
create index if not exists support_notes_property_idx on support_notes(property_id);
create index if not exists support_notes_staff_idx on support_notes(staff_id);
