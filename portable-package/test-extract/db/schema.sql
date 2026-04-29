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

create table if not exists website_settings (
  agency_id uuid primary key references agencies(id) on delete cascade,
  site_title text not null default 'UK Support Housing',
  site_tagline text not null default 'Supported accommodation services',
  hero_heading text not null default 'Homes, support and accountability for supported living.',
  hero_body text not null default 'UK Support Housing helps residents, landlords and local partners manage supported accommodation with clear records, responsive repairs and practical weekly support.',
  primary_color text not null default '#172033',
  secondary_color text not null default '#f4c542',
  accent_color text not null default '#b99024',
  logo_path text not null default '/HomeSupport_logo.jpeg',
  logo_width integer not null default 96,
  logo_radius integer not null default 4,
  body_font_family text not null default 'Inter, Arial, sans-serif',
  body_font_size integer not null default 16,
  heading_font_size integer not null default 56,
  contact_phone text,
  contact_address text,
  footer_note text,
  contact_email text not null default 'info@uksupporthousing.co.uk',
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

create table if not exists staff_users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'manager', 'support_worker', 'housing_officer', 'finance', 'readonly')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff_users(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists staff_sessions_token_idx on staff_sessions(token_hash);
create index if not exists staff_sessions_staff_idx on staff_sessions(staff_id);

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

create index if not exists tenants_agency_idx on tenants(agency_id);
create index if not exists properties_agency_idx on properties(agency_id);
create unique index if not exists properties_agency_address_uidx on properties(agency_id, address);
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
