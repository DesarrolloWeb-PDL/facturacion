create extension if not exists pgcrypto;

create type fiscal_environment as enum ('testing', 'production');

create table users (
  id uuid primary key default gen_random_uuid(),
  email varchar(160) not null unique,
  password_hash varchar(255) not null,
  full_name varchar(160) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type voucher_status as enum (
  'draft',
  'pending_authorization',
  'authorizing',
  'authorized_cae',
  'authorized_caea',
  'rejected',
  'caea_pending_reporting',
  'reported',
  'cancelled_by_credit_note'
);

create type sync_status as enum ('pending', 'processing', 'done', 'error', 'dead_letter');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name varchar(160) not null,
  cuit bigint not null unique,
  ingresos_brutos varchar(32),
  activity_start_date date not null,
  iva_condition_code varchar(8) not null,
  tax_regime varchar(32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  user_id uuid not null references users(id),
  role_code varchar(32) not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  device_name varchar(120) not null,
  platform varchar(20) not null check (platform in ('windows', 'macos', 'linux', 'android', 'ios')),
  last_seen_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table points_of_sale (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  pos_number integer not null,
  description varchar(120),
  environment fiscal_environment not null,
  active boolean not null default true,
  unique (organization_id, pos_number, environment)
);

create table fiscal_certificates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  environment fiscal_environment not null,
  alias varchar(120) not null,
  storage_mode varchar(20) not null check (storage_mode in ('cloud_kms', 'local_os_keystore')),
  certificate_pem text not null,
  encrypted_private_key bytea,
  kms_key_id varchar(255),
  thumbprint varchar(128),
  subject_dn varchar(512),
  serial_number varchar(128),
  valid_from timestamptz,
  valid_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  document_type_code integer not null,
  document_number bigint not null,
  tax_name varchar(160) not null,
  iva_condition_code varchar(8) not null,
  email varchar(160),
  phone varchar(40),
  address_line varchar(255),
  city varchar(120),
  province varchar(120),
  postal_code varchar(20),
  country_code varchar(3) default 'ARG',
  arca_padron_status varchar(40),
  arca_padron_last_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, document_type_code, document_number)
);

create table customer_registry_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  source varchar(32) not null,
  raw_payload jsonb not null,
  checked_at timestamptz not null default now()
);

create table voucher_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  point_of_sale_id uuid not null references points_of_sale(id),
  voucher_type_code integer not null,
  environment fiscal_environment not null,
  last_authorized_number bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, point_of_sale_id, voucher_type_code, environment)
);

create table caea_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  point_of_sale_id uuid not null references points_of_sale(id),
  voucher_type_code integer not null,
  environment fiscal_environment not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  fortnight integer not null check (fortnight in (1, 2)),
  caea varchar(32) not null,
  valid_from date not null,
  valid_to date not null,
  due_report_date date,
  status varchar(20) not null check (status in ('granted', 'expired', 'reported', 'partially_reported')),
  unique (organization_id, point_of_sale_id, voucher_type_code, environment, year, month, fortnight)
);

create table caea_number_ranges (
  id uuid primary key default gen_random_uuid(),
  caea_period_id uuid not null references caea_periods(id),
  device_id uuid references devices(id),
  range_from bigint not null,
  range_to bigint not null,
  next_number bigint not null,
  status varchar(20) not null check (status in ('available', 'assigned', 'exhausted', 'cancelled')),
  unique (caea_period_id, range_from, range_to)
);

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  point_of_sale_id uuid not null references points_of_sale(id),
  customer_id uuid references customers(id),
  device_id uuid references devices(id),
  local_uuid uuid not null unique,
  environment fiscal_environment not null,
  status voucher_status not null,
  issue_date date not null,
  concept_code integer not null,
  voucher_type_code integer not null,
  currency_code varchar(3) not null default 'PES',
  currency_rate numeric(18, 6) not null default 1,
  fiscal_number bigint,
  from_number bigint,
  to_number bigint,
  cae varchar(20),
  cae_due_date date,
  caea varchar(20),
  due_date date,
  service_from date,
  service_to date,
  payment_due_date date,
  buyer_doc_type_code integer not null,
  buyer_doc_number bigint not null,
  buyer_name varchar(160) not null,
  buyer_iva_condition_code varchar(8),
  net_amount numeric(18, 2) not null default 0,
  exempt_amount numeric(18, 2) not null default 0,
  non_taxed_amount numeric(18, 2) not null default 0,
  vat_amount numeric(18, 2) not null default 0,
  tributes_amount numeric(18, 2) not null default 0,
  other_taxes_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null,
  arca_result varchar(16),
  arca_observations jsonb,
  arca_errors jsonb,
  payload_hash char(64) not null,
  pdf_hash char(64),
  qr_payload text,
  barcode_value varchar(128),
  authorized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, point_of_sale_id, voucher_type_code, environment, fiscal_number)
);

create table voucher_items (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references vouchers(id) on delete cascade,
  line_number integer not null,
  sku varchar(64),
  description varchar(255) not null,
  quantity numeric(18, 6) not null,
  unit_measure_code integer,
  unit_price numeric(18, 6) not null,
  discount_amount numeric(18, 2) not null default 0,
  net_amount numeric(18, 2) not null,
  vat_rate numeric(5, 2) not null default 0,
  vat_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null,
  unique (voucher_id, line_number)
);

create table voucher_vat_totals (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references vouchers(id) on delete cascade,
  vat_code integer not null,
  tax_base_amount numeric(18, 2) not null,
  vat_amount numeric(18, 2) not null,
  unique (voucher_id, vat_code)
);

create table voucher_tributes (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references vouchers(id) on delete cascade,
  tribute_code integer not null,
  description varchar(120) not null,
  tax_base_amount numeric(18, 2) not null,
  aliquot numeric(10, 4) not null,
  tribute_amount numeric(18, 2) not null
);

create table voucher_associations (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references vouchers(id) on delete cascade,
  associated_voucher_id uuid references vouchers(id),
  associated_voucher_type_code integer not null,
  associated_point_of_sale integer not null,
  associated_number bigint not null,
  association_kind varchar(20) not null check (association_kind in ('credit_note', 'debit_note', 'adjustment'))
);

create table ws_request_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  voucher_id uuid references vouchers(id),
  service_name varchar(32) not null,
  operation_name varchar(64) not null,
  environment fiscal_environment not null,
  correlation_id uuid not null,
  request_payload xml,
  response_payload xml,
  request_hash char(64),
  response_hash char(64),
  http_status integer,
  arca_result varchar(16),
  error_code varchar(64),
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table sync_outbox (
  id uuid primary key default gen_random_uuid(),
  aggregate_type varchar(32) not null,
  aggregate_id uuid not null,
  event_type varchar(64) not null,
  payload jsonb not null,
  status sync_status not null default 'pending',
  attempts integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table sync_inbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  device_id uuid references devices(id),
  event_type varchar(64) not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  applied_at timestamptz
);

create table voucher_authorization_claims (
  organization_id uuid not null references organizations(id),
  voucher_local_id varchar(120) not null,
  workflow_status varchar(32) not null check (workflow_status in ('draft', 'pending_authorization', 'authorizing', 'authorized', 'rejected')),
  device_id uuid not null references devices(id),
  user_id uuid references users(id),
  claimed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  primary key (organization_id, voucher_local_id)
);

create table audit_log (
  id bigserial primary key,
  organization_id uuid references organizations(id),
  actor_type varchar(20) not null check (actor_type in ('user', 'system', 'device', 'arca')),
  actor_id varchar(128),
  entity_type varchar(40) not null,
  entity_id uuid,
  action varchar(64) not null,
  previous_data jsonb,
  new_data jsonb,
  ip_address inet,
  device_id uuid references devices(id),
  created_at timestamptz not null default now()
);

create or replace function block_authorized_voucher_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('authorized_cae', 'authorized_caea', 'reported', 'cancelled_by_credit_note') then
    raise exception 'Authorized fiscal vouchers are immutable';
  end if;
  return new;
end;
$$;

create trigger trg_block_authorized_voucher_update
before update on vouchers
for each row
when (old.status in ('authorized_cae', 'authorized_caea', 'reported', 'cancelled_by_credit_note'))
execute function block_authorized_voucher_mutation();
