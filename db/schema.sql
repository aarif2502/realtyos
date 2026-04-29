create extension if not exists pgcrypto;

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_number text,
  local_authority text,
  contact_email text,
  contact_phone text,
  shared_file_root text,
  currency_code text not null default 'GBP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table agencies add column if not exists currency_code text not null default 'GBP';
alter table agencies alter column shared_file_root set default '/mnt/storage';
alter table agencies add column if not exists trading_name text;
alter table agencies add column if not exists address text;
alter table agencies add column if not exists status text not null default 'active';
alter table agencies add column if not exists logo_path text;
alter table agencies add column if not exists branding jsonb not null default '{}'::jsonb;
create index if not exists agencies_status_idx on agencies(status);

create table if not exists website_settings (
  agency_id uuid primary key references agencies(id) on delete cascade,
  site_title text not null default 'Your Housing Organisation',
  site_tagline text not null default 'Supported accommodation services',
  hero_heading text not null default 'Homes, support and accountability for supported living.',
  hero_body text not null default 'Your Housing Organisation helps residents, landlords and local partners manage supported accommodation with clear records, responsive repairs and practical weekly support.',
  primary_color text not null default '#172033',
  secondary_color text not null default '#f4c542',
  accent_color text not null default '#b99024',
  logo_path text not null default '/RealtyOSLogo.svg',
  logo_width integer not null default 96,
  logo_radius integer not null default 4,
  body_font_family text not null default 'Inter, Arial, sans-serif',
  body_font_size integer not null default 16,
  heading_font_size integer not null default 56,
  contact_phone text,
  contact_address text,
  footer_note text,
  contact_email text not null default 'hello@example.com',
  updated_at timestamptz not null default now()
);

alter table website_settings add column if not exists logo_width integer not null default 96;
alter table website_settings add column if not exists logo_radius integer not null default 4;
alter table website_settings add column if not exists body_font_family text not null default 'Inter, Arial, sans-serif';
alter table website_settings add column if not exists body_font_size integer not null default 16;
alter table website_settings add column if not exists heading_font_size integer not null default 56;
alter table website_settings add column if not exists nav_font_size integer not null default 14;
alter table website_settings add column if not exists hero_body_font_size integer not null default 18;
alter table website_settings add column if not exists card_heading_font_size integer not null default 20;
alter table website_settings add column if not exists footer_font_size integer not null default 14;
alter table website_settings add column if not exists nav_text_color text not null default '#172033';
alter table website_settings add column if not exists hero_text_color text not null default '#172033';
alter table website_settings add column if not exists body_text_color text not null default '#526075';
alter table website_settings add column if not exists contact_phone text;
alter table website_settings add column if not exists contact_address text;
alter table website_settings add column if not exists footer_note text;
alter table website_settings add column if not exists hero_badge text not null default 'Supported housing with control, care and evidence';
alter table website_settings add column if not exists process_heading text not null default 'Every placement should have a clear story.';
alter table website_settings add column if not exists process_body text not null default 'A home, a support plan, a rent position, documents, risk checks and outcomes all connected in one accountable operating model.';
alter table website_settings add column if not exists platform_title text not null default 'Supported Housing Platform';
alter table website_settings add column if not exists platform_sidebar_brand text not null default 'Your Housing Organisation';
alter table website_settings add column if not exists platform_logo_path text not null default '/RealtyOSLogo.svg';
alter table website_settings add column if not exists platform_primary_color text not null default '#0f172a';
alter table website_settings add column if not exists platform_accent_color text not null default '#f4c542';
alter table website_settings add column if not exists platform_sidebar_label_overview text not null default 'Overview';
alter table website_settings add column if not exists platform_sidebar_label_reports text not null default 'BI Reports';

create table if not exists staff_users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('platform_admin', 'admin', 'manager', 'support_worker', 'housing_officer', 'finance', 'readonly')),
  password_hash text not null,
  active boolean not null default true,
  force_password_change boolean not null default false,
  password_updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table staff_users drop constraint if exists staff_users_role_check;
alter table staff_users add constraint staff_users_role_check check (role in ('platform_admin', 'admin', 'manager', 'support_worker', 'housing_officer', 'finance', 'readonly'));
create index if not exists staff_users_agency_idx on staff_users(agency_id);
alter table staff_users add column if not exists force_password_change boolean not null default false;
alter table staff_users add column if not exists password_updated_at timestamptz;

create table if not exists staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff_users(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  selected_agency_id uuid references agencies(id) on delete set null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists staff_sessions_token_idx on staff_sessions(token_hash);
create index if not exists staff_sessions_staff_idx on staff_sessions(staff_id);
alter table staff_sessions add column if not exists selected_agency_id uuid references agencies(id) on delete set null;
create index if not exists staff_sessions_selected_agency_idx on staff_sessions(selected_agency_id);

create table if not exists landlords (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  portal_enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table landlords add column if not exists portal_enabled boolean not null default false;
alter table landlords add column if not exists notes text;

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  landlord_id uuid references landlords(id) on delete set null,
  address text not null,
  postcode text,
  local_authority text,
  total_rooms integer not null default 0,
  housing_officer_id uuid references staff_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table properties add column if not exists housing_association_id uuid;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  room_label text not null,
  weekly_rent numeric(10,2) not null default 0,
  status text not null default 'available' check (status in ('available', 'occupied', 'void', 'maintenance')),
  metadata jsonb not null default '{}'::jsonb,
  unique(property_id, room_label)
);

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  date_of_birth date,
  ni_number text,
  checkin_date date,
  checkout_date date,
  hb_claim_ref_number text,
  referral_agency text,
  age integer,
  gender text,
  religion text,
  ethnicity text,
  nationality text,
  disability text,
  sexual_orientation text,
  spoken_language text,
  risk_assessment text check (risk_assessment in ('LOW', 'MEDIUM', 'HIGH') or risk_assessment is null),
  length_of_stay text,
  record_status text,
  support_worker_id uuid references staff_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tenants add column if not exists template_record_status text;
alter table tenants add column if not exists payment_status text;
alter table tenants add column if not exists status_reason text;
alter table tenants add column if not exists source_import_log_id uuid;

create table if not exists occupancy_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  tenant_id uuid references tenants(id) on delete cascade,
  room_label text not null,
  checkin_date date,
  checkout_date date,
  record_status text not null default 'needs_review' check (record_status in ('active', 'vacant', 'pending', 'ending_soon', 'expired', 'needs_review', 'archived')),
  status_reason text,
  source_file text,
  source_row_number integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agency_id, property_id, room_label, tenant_id)
);

create table if not exists housing_benefit_claims (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  claim_ref_number text,
  period text,
  amount numeric(10,2) not null default 0,
  status text not null default 'evidence_required' check (status in ('evidence_required', 'submitted', 'paid', 'rejected')),
  submitted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists tenancy_contracts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  contract_number text not null,
  start_date date not null,
  end_date date,
  weekly_rent numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'active', 'expired', 'terminated')),
  document_path text,
  terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agency_id, contract_number)
);

create table if not exists payment_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  contract_id uuid references tenancy_contracts(id) on delete set null,
  entry_date date not null default current_date,
  period_start date,
  period_end date,
  type text not null check (type in ('rent_charge', 'housing_benefit', 'tenant_payment', 'adjustment', 'arrears')),
  description text not null,
  debit numeric(10,2) not null default 0,
  credit numeric(10,2) not null default 0,
  status text not null default 'posted' check (status in ('draft', 'posted', 'void')),
  reference text,
  created_at timestamptz not null default now()
);

create table if not exists housing_associations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  phone text,
  address text,
  payment_terms text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agency_id, name)
);

alter table properties drop constraint if exists properties_housing_association_id_fkey;
alter table properties add constraint properties_housing_association_id_fkey foreign key (housing_association_id) references housing_associations(id) on delete set null;
create index if not exists housing_associations_agency_idx on housing_associations(agency_id);
create index if not exists properties_housing_association_idx on properties(housing_association_id);

create table if not exists pms_cycle_snapshots (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  housing_association_id uuid references housing_associations(id) on delete set null,
  cycle_list_number text not null,
  snapshot_date timestamptz not null default now(),
  created_by_user_id uuid references staff_users(id) on delete set null,
  row_count integer not null default 0,
  property_count integer not null default 0,
  tenant_count integer not null default 0,
  total_expected_amount numeric(12,2) not null default 0,
  status text not null default 'created' check (status in ('created', 'exported', 'void')),
  template_name text not null default 'New Tenant List Cycle 74.xlsx',
  snapshot_rows jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agency_id, housing_association_id, cycle_list_number)
);

create index if not exists pms_cycle_snapshots_agency_idx on pms_cycle_snapshots(agency_id, cycle_list_number);
create index if not exists pms_cycle_snapshots_ha_idx on pms_cycle_snapshots(housing_association_id);

create table if not exists housing_association_payments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  housing_association_id uuid references housing_associations(id) on delete set null,
  snapshot_id uuid references pms_cycle_snapshots(id) on delete set null,
  cycle_list_number text not null,
  expected_amount numeric(12,2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'completed', 'missed', 'partial', 'disputed', 'cancelled')),
  due_date date,
  paid_date date,
  amount_paid numeric(12,2) not null default 0,
  payment_reference text,
  notes text,
  created_by_user_id uuid references staff_users(id) on delete set null,
  updated_by_user_id uuid references staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agency_id, housing_association_id, cycle_list_number)
);

create index if not exists housing_association_payments_agency_status_idx on housing_association_payments(agency_id, payment_status);
create index if not exists housing_association_payments_cycle_idx on housing_association_payments(cycle_list_number);

create table if not exists support_notes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  staff_id uuid references staff_users(id) on delete set null,
  week_start date not null,
  note text not null,
  outcomes text,
  next_actions text,
  risk_change text check (risk_change in ('none', 'increased', 'reduced') or risk_change is null),
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  landlord_id uuid references landlords(id) on delete cascade,
  category text not null,
  title text not null,
  file_path text not null,
  original_file_name text,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists property_certificates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  certificate_type text not null,
  certificate_name text not null,
  certificate_number text,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  status text not null default 'missing_info' check (status in ('valid', 'expiring_soon', 'expired', 'missing_info')),
  file_path text,
  storage_key text,
  original_file_name text,
  mime_type text,
  file_size bigint,
  notes text,
  created_by_user_id uuid references staff_users(id) on delete set null,
  updated_by_user_id uuid references staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_certificates_agency_status_idx on property_certificates(agency_id, status);
create index if not exists property_certificates_property_idx on property_certificates(property_id);
create index if not exists property_certificates_expiry_idx on property_certificates(expiry_date);

alter table documents add column if not exists original_file_name text;
alter table documents add column if not exists mime_type text;
alter table documents add column if not exists file_size bigint;
alter table documents add column if not exists storage_key text;
alter table documents add column if not exists visibility text not null default 'staff' check (visibility in ('staff', 'restricted'));
alter table documents add column if not exists read_roles text[] not null default array['admin','manager','support_worker','housing_officer','finance','readonly'];
alter table documents add column if not exists write_roles text[] not null default array['admin','manager'];
alter table documents add column if not exists delete_roles text[] not null default array['admin'];

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  category text not null,
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH')),
  status text not null default 'open' check (status in ('open', 'action_plan', 'closed')),
  summary text not null,
  owner_id uuid references staff_users(id) on delete set null,
  reported_at timestamptz not null default now()
);

create table if not exists crm_partners (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  type text not null check (type in ('local_council', 'referrer', 'support_provider', 'charity', 'health_partner', 'other')),
  organisation_name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  partner_id uuid references crm_partners(id) on delete set null,
  tenant_id uuid references tenants(id) on delete set null,
  applicant_name text not null,
  source text,
  status text not null default 'new' check (status in ('new', 'screening', 'approved', 'waitlist', 'rejected', 'converted')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  support_needs text,
  notes text,
  target_move_in date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists communication_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  partner_id uuid references crm_partners(id) on delete set null,
  tenant_id uuid references tenants(id) on delete set null,
  referral_id uuid references referrals(id) on delete set null,
  staff_id uuid references staff_users(id) on delete set null,
  channel text not null default 'email' check (channel in ('email', 'phone', 'meeting', 'letter', 'portal', 'other')),
  subject text not null,
  notes text,
  follow_up_date date,
  created_at timestamptz not null default now()
);

create table if not exists support_plans (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid references staff_users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'review_due', 'closed')),
  goals text,
  needs_summary text,
  review_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists risk_assessments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  assessor_id uuid references staff_users(id) on delete set null,
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  safeguarding_concerns text,
  mitigation_plan text,
  review_date date,
  created_at timestamptz not null default now()
);

create table if not exists automation_tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  assigned_to uuid references staff_users(id) on delete set null,
  type text not null check (type in ('inspection', 'compliance_check', 'rent_arrears', 'support_visit', 'referral_follow_up', 'general')),
  title text not null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists maintenance_jobs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  tenant_id uuid references tenants(id) on delete set null,
  title text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  status text not null default 'reported' check (status in ('reported', 'assigned', 'in_progress', 'complete', 'cancelled')),
  cost numeric(10,2) not null default 0,
  notes text,
  reported_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists expense_entries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  landlord_id uuid references landlords(id) on delete set null,
  category text not null,
  description text not null,
  amount numeric(10,2) not null default 0,
  expense_date date not null default current_date,
  status text not null default 'recorded' check (status in ('recorded', 'approved', 'paid')),
  created_at timestamptz not null default now()
);

create table if not exists landlord_payments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  landlord_id uuid not null references landlords(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  period_start date,
  period_end date,
  amount numeric(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid')),
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists import_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  uploaded_by uuid references staff_users(id) on delete set null,
  filename text not null,
  target_modules text[] not null default array[]::text[],
  sheet_count integer not null default 0,
  rows_parsed integer not null default 0,
  rows_imported integer not null default 0,
  rows_skipped integer not null default 0,
  validation_errors integer not null default 0,
  status text not null default 'uploaded' check (status in ('uploaded', 'parsed', 'validated', 'imported', 'failed', 'cancelled')),
  mapping jsonb not null default '{}'::jsonb,
  preview jsonb not null default '{}'::jsonb,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table import_logs add column if not exists action_type text not null default 'import';

create table if not exists import_row_errors (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  import_log_id uuid references import_logs(id) on delete cascade,
  row_number integer,
  severity text not null default 'error' check (severity in ('error', 'warning')),
  field_name text,
  message text not null,
  row_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists pms_reset_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  reset_by uuid references staff_users(id) on delete set null,
  properties_deleted integer not null default 0,
  rooms_deleted integer not null default 0,
  tenants_deleted integer not null default 0,
  occupancy_records_deleted integer not null default 0,
  confirmation_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists tenants_agency_idx on tenants(agency_id);
create index if not exists tenants_record_status_idx on tenants(agency_id, record_status);
create index if not exists tenants_ni_idx on tenants(agency_id, ni_number);
create index if not exists properties_agency_idx on properties(agency_id);
create unique index if not exists properties_agency_address_uidx on properties(agency_id, address);
create index if not exists rooms_agency_property_idx on rooms(agency_id, property_id);
create index if not exists occupancy_records_agency_status_idx on occupancy_records(agency_id, record_status);
create index if not exists occupancy_records_property_room_idx on occupancy_records(property_id, room_label);
create index if not exists support_notes_tenant_week_idx on support_notes(tenant_id, week_start);
create index if not exists documents_agency_idx on documents(agency_id);
create index if not exists contracts_agency_idx on tenancy_contracts(agency_id);
create index if not exists ledger_agency_idx on payment_ledger_entries(agency_id);
create index if not exists crm_partners_agency_idx on crm_partners(agency_id);
create index if not exists referrals_agency_idx on referrals(agency_id);
create index if not exists communication_logs_agency_idx on communication_logs(agency_id);
create index if not exists support_plans_agency_idx on support_plans(agency_id);
create index if not exists risk_assessments_agency_idx on risk_assessments(agency_id);
create index if not exists automation_tasks_agency_idx on automation_tasks(agency_id);
create index if not exists maintenance_jobs_agency_idx on maintenance_jobs(agency_id);
create index if not exists expense_entries_agency_idx on expense_entries(agency_id);
create index if not exists landlord_payments_agency_idx on landlord_payments(agency_id);
create index if not exists import_logs_agency_idx on import_logs(agency_id);
create index if not exists import_logs_status_idx on import_logs(agency_id, status);
create index if not exists import_row_errors_log_idx on import_row_errors(import_log_id);
create index if not exists pms_reset_logs_agency_idx on pms_reset_logs(agency_id, created_at desc);

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
