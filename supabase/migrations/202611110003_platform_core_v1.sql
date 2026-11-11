-- ZYNTRA Platform Core v1
-- Provider-neutral financial domain. Server-only access until explicit, tested RLS policies are added.
-- No balances are treated as customer funds; this is an accounting journal only.
create extension if not exists pgcrypto;

create table if not exists public.zyntra_organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  slug text not null unique,
  status text not null default 'pending'
    check (status in ('pending','active','suspended','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zyntra_organization_members (
  organization_id uuid not null references public.zyntra_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','finance','operations','support','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.zyntra_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('fiat','crypto','stablecoin','security','commodity','points')),
  code text not null,
  network text,
  issuer text,
  decimals smallint not null check (decimals between 0 and 36),
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (asset_type, code, network)
);

create table if not exists public.zyntra_payment_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  provider_type text not null check (provider_type in ('fiat_psp','crypto_protocol','ramp','broker','market_data','fx')),
  enabled boolean not null default false,
  supported_countries text[] not null default '{}',
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.zyntra_payment_intents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.zyntra_organizations(id),
  customer_user_id uuid references auth.users(id) on delete set null,
  order_reference text,
  amount_atoms numeric(78,0) not null check (amount_atoms > 0),
  asset_id uuid not null references public.zyntra_assets(id),
  settlement_asset_id uuid references public.zyntra_assets(id),
  status text not null default 'created'
    check (status in ('created','requires_action','processing','authorized','succeeded','failed','cancelled','expired','refunded','partially_refunded')),
  idempotency_key text not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table if not exists public.zyntra_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.zyntra_payment_intents(id),
  provider_id uuid not null references public.zyntra_payment_providers(id),
  provider_reference text,
  status text not null default 'created'
    check (status in ('created','pending','requires_action','authorized','succeeded','failed','cancelled','unknown')),
  request_hash text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, provider_reference)
);

create table if not exists public.zyntra_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.zyntra_payment_providers(id),
  provider_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  signature_verified_at timestamptz,
  processing_status text not null default 'received'
    check (processing_status in ('received','verified','processed','ignored','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider_id, provider_event_id)
);

create table if not exists public.zyntra_ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.zyntra_organizations(id),
  account_code text not null,
  account_name text not null,
  account_type text not null
    check (account_type in ('asset','liability','equity','revenue','expense','clearing','memo')),
  asset_id uuid not null references public.zyntra_assets(id),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, account_code, asset_id)
);

create table if not exists public.zyntra_ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.zyntra_organizations(id),
  external_reference text,
  idempotency_key text not null,
  description text not null,
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  unique (organization_id, idempotency_key)
);

create table if not exists public.zyntra_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.zyntra_ledger_transactions(id),
  account_id uuid not null references public.zyntra_ledger_accounts(id),
  asset_id uuid not null references public.zyntra_assets(id),
  debit_atoms numeric(78,0) not null default 0 check (debit_atoms >= 0),
  credit_atoms numeric(78,0) not null default 0 check (credit_atoms >= 0),
  created_at timestamptz not null default now(),
  check ((debit_atoms > 0 and credit_atoms = 0) or (credit_atoms > 0 and debit_atoms = 0))
);

create table if not exists public.zyntra_fx_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.zyntra_organizations(id),
  base_asset_id uuid not null references public.zyntra_assets(id),
  quote_asset_id uuid not null references public.zyntra_assets(id),
  rate numeric(50,24) not null check (rate > 0),
  source text not null,
  spread_bps integer not null default 0 check (spread_bps between 0 and 100000),
  fee_atoms numeric(78,0) not null default 0 check (fee_atoms >= 0),
  quoted_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (base_asset_id <> quote_asset_id),
  check (expires_at > quoted_at)
);

create table if not exists public.zyntra_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.zyntra_organizations(id),
  provider_id uuid not null references public.zyntra_payment_providers(id),
  provider_batch_reference text,
  asset_id uuid not null references public.zyntra_assets(id),
  gross_atoms numeric(78,0) not null check (gross_atoms >= 0),
  fee_atoms numeric(78,0) not null default 0 check (fee_atoms >= 0),
  net_atoms numeric(78,0) not null check (net_atoms >= 0),
  expected_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  check (gross_atoms >= fee_atoms),
  check (net_atoms = gross_atoms - fee_atoms)
);

create table if not exists public.zyntra_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.zyntra_organizations(id),
  action_type text not null,
  resource_type text not null,
  resource_id uuid not null,
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired','cancelled')),
  reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (approved_by is null or approved_by <> requested_by)
);

create table if not exists public.zyntra_audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.zyntra_organizations(id),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('user','system','agent','provider')),
  action text not null,
  resource_type text not null,
  resource_id text,
  request_id text,
  ip_hash text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists zyntra_payment_intents_org_created_idx on public.zyntra_payment_intents (organization_id, created_at desc);
create index if not exists zyntra_payment_intents_status_idx on public.zyntra_payment_intents (status, expires_at);
create index if not exists zyntra_payment_attempts_intent_idx on public.zyntra_payment_attempts (payment_intent_id, created_at desc);
create index if not exists zyntra_provider_events_unprocessed_idx on public.zyntra_provider_events (received_at) where processing_status in ('received','verified','failed');
create index if not exists zyntra_ledger_transactions_org_created_idx on public.zyntra_ledger_transactions (organization_id, created_at desc);
create index if not exists zyntra_ledger_entries_transaction_idx on public.zyntra_ledger_entries (transaction_id);
create index if not exists zyntra_ledger_entries_account_idx on public.zyntra_ledger_entries (account_id, created_at);
create index if not exists zyntra_audit_events_org_time_idx on public.zyntra_audit_events (organization_id, occurred_at desc);
create index if not exists zyntra_fx_quotes_pair_expiry_idx on public.zyntra_fx_quotes (base_asset_id, quote_asset_id, expires_at desc);

-- A posted journal is immutable. Corrections must be new reversing transactions.
create or replace function public.zyntra_guard_posted_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.zyntra_ledger_transactions
  where id = coalesce(new.transaction_id, old.transaction_id);

  if v_status in ('posted','reversed') then
    raise exception 'Posted ledger entries are immutable; create a reversing transaction';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists zyntra_ledger_entries_immutable on public.zyntra_ledger_entries;
create trigger zyntra_ledger_entries_immutable
before update or delete on public.zyntra_ledger_entries
for each row execute function public.zyntra_guard_posted_ledger_mutation();

create or replace function public.zyntra_validate_posted_ledger()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_transaction_id uuid;
  v_status text;
begin
  v_transaction_id := coalesce(new.transaction_id, old.transaction_id);
  select status into v_status
  from public.zyntra_ledger_transactions
  where id = v_transaction_id;

  if v_status = 'posted' then
    if (select count(*) from public.zyntra_ledger_entries where transaction_id = v_transaction_id) < 2 then
      raise exception 'A posted ledger transaction requires at least two entries';
    end if;

    if exists (
      select asset_id
      from public.zyntra_ledger_entries
      where transaction_id = v_transaction_id
      group by asset_id
      having sum(debit_atoms) <> sum(credit_atoms)
    ) then
      raise exception 'Ledger transaction is not balanced per asset';
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists zyntra_ledger_balance_check on public.zyntra_ledger_entries;
create constraint trigger zyntra_ledger_balance_check
after insert or update or delete on public.zyntra_ledger_entries
deferrable initially deferred
for each row execute function public.zyntra_validate_posted_ledger();

create or replace function public.zyntra_validate_posted_transaction()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'posted' and old.status <> 'posted' then
    if (select count(*) from public.zyntra_ledger_entries where transaction_id = new.id) < 2 then
      raise exception 'A posted ledger transaction requires at least two entries';
    end if;
    if exists (
      select asset_id
      from public.zyntra_ledger_entries
      where transaction_id = new.id
      group by asset_id
      having sum(debit_atoms) <> sum(credit_atoms)
    ) then
      raise exception 'Ledger transaction is not balanced per asset';
    end if;
    new.posted_at := coalesce(new.posted_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists zyntra_ledger_transaction_post_check on public.zyntra_ledger_transactions;
create trigger zyntra_ledger_transaction_post_check
before update of status on public.zyntra_ledger_transactions
for each row execute function public.zyntra_validate_posted_transaction();

-- All platform tables are server-only in v1. No anon/authenticated grants or client policies.
do $$
declare
  t text;
begin
  foreach t in array array[
    'zyntra_organizations','zyntra_organization_members','zyntra_assets',
    'zyntra_payment_providers','zyntra_payment_intents','zyntra_payment_attempts',
    'zyntra_provider_events','zyntra_ledger_accounts','zyntra_ledger_transactions',
    'zyntra_ledger_entries','zyntra_fx_quotes','zyntra_settlements',
    'zyntra_approvals','zyntra_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end;
$$;

revoke all on function public.zyntra_guard_posted_ledger_mutation() from public, anon, authenticated;
revoke all on function public.zyntra_validate_posted_ledger() from public, anon, authenticated;
revoke all on function public.zyntra_validate_posted_transaction() from public, anon, authenticated;

grant usage on schema public to service_role;
grant usage, select on sequence public.zyntra_audit_events_id_seq to service_role;

comment on table public.zyntra_ledger_transactions is 'Internal accounting journal; not evidence of custody or customer asset backing.';
comment on table public.zyntra_payment_intents is 'Provider-neutral payment request; all status changes are server-authoritative.';
comment on table public.zyntra_provider_events is 'Idempotent provider webhook inbox; payloads stored as hashes, not raw secrets.';
comment on table public.zyntra_audit_events is 'Append-only audit trail. Restrict all writes to trusted server processes.';
