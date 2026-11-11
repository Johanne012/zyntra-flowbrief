alter table public.zyntra_organizations
  add column if not exists incorporation_country text,
  add column if not exists operating_countries text[] not null default '{}';

alter table public.zyntra_organizations
  add constraint zyntra_organizations_incorporation_country_check
  check (incorporation_country is null or incorporation_country ~ '^[A-Z]{2}$');

alter table public.zyntra_organizations
  add constraint zyntra_active_org_requires_country_check
  check (status <> 'active' or incorporation_country is not null);

alter table public.zyntra_payment_intents
  add column if not exists requested_method text,
  add column if not exists customer_country_code text;

alter table public.zyntra_payment_intents
  add constraint zyntra_payment_intents_requested_method_check
  check (requested_method is null or requested_method ~ '^[a-z0-9_-]{2,64}$');

alter table public.zyntra_payment_intents
  add constraint zyntra_payment_intents_customer_country_check
  check (customer_country_code is null or customer_country_code ~ '^[A-Z]{2}$');

create table if not exists public.zyntra_provider_routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.zyntra_organizations(id),
  provider_id uuid not null references public.zyntra_payment_providers(id),
  asset_id uuid not null references public.zyntra_assets(id),
  merchant_country_code text not null check (merchant_country_code ~ '^[A-Z]{2}$'),
  customer_country_code text check (customer_country_code is null or customer_country_code ~ '^[A-Z]{2}$'),
  payment_method text not null check (payment_method ~ '^[a-z0-9_-]{2,64}$'),
  settlement_asset_id uuid references public.zyntra_assets(id),
  min_amount_atoms numeric(78,0) not null default 1 check (min_amount_atoms > 0),
  max_amount_atoms numeric(78,0),
  enabled boolean not null default false,
  approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','rejected','disabled')),
  provider_account_reference text,
  contract_reference text,
  last_verified_at timestamptz,
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_amount_atoms is null or max_amount_atoms >= min_amount_atoms),
  check (not enabled or (approval_status='approved' and last_verified_at is not null and provider_account_reference is not null))
);

alter table public.zyntra_provider_routes
  drop constraint if exists zyntra_provider_routes_organization_id_provider_id_asset_id_merchant_country_code_customer_country_code_payment_method_key;
create unique index if not exists zyntra_provider_routes_unique_route_idx
  on public.zyntra_provider_routes(
    organization_id,provider_id,asset_id,merchant_country_code,
    (coalesce(customer_country_code,'*')),payment_method
  );

create or replace function public.zyntra_validate_provider_route_country()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $fn$
declare
  v_country text;
begin
  select incorporation_country into v_country
  from public.zyntra_organizations where id=new.organization_id;
  if v_country is null or v_country <> new.merchant_country_code then
    raise exception 'Provider route merchant country must match organization incorporation country';
  end if;
  return new;
end;
$fn$;

create trigger zyntra_provider_route_country_check
before insert or update on public.zyntra_provider_routes
for each row execute function public.zyntra_validate_provider_route_country();

revoke all on function public.zyntra_validate_provider_route_country() from public,anon,authenticated;

alter table public.zyntra_payment_attempts
  add column if not exists provider_route_id uuid references public.zyntra_provider_routes(id);

create index if not exists zyntra_provider_routes_org_asset_country_idx
  on public.zyntra_provider_routes(organization_id,asset_id,merchant_country_code,enabled,approval_status);
create index if not exists zyntra_provider_routes_provider_idx
  on public.zyntra_provider_routes(provider_id);
create index if not exists zyntra_payment_attempts_route_idx
  on public.zyntra_payment_attempts(provider_route_id);

alter table public.zyntra_provider_routes enable row level security;
revoke all on table public.zyntra_provider_routes from anon, authenticated;
grant all on table public.zyntra_provider_routes to service_role;

-- Replace the previous organization-creation RPC so every new organization records its legal country.
drop function if exists public.zyntra_create_organization(uuid,text,text,text);

create function public.zyntra_create_organization(
  p_actor_id uuid,
  p_legal_name text,
  p_display_name text,
  p_slug text,
  p_incorporation_country text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_organization_id uuid;
  v_owned_count integer;
begin
  if p_actor_id is null then raise exception 'Authenticated actor is required'; end if;
  if p_legal_name is null or char_length(btrim(p_legal_name)) not between 2 and 180 then
    raise exception 'Invalid legal name';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 2 and 100 then
    raise exception 'Invalid display name';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,47}$' then
    raise exception 'Invalid organization slug';
  end if;
  if p_incorporation_country is null or p_incorporation_country !~ '^[A-Z]{2}$' then
    raise exception 'A valid legal incorporation country code is required';
  end if;

  select count(*) into v_owned_count
  from public.zyntra_organization_members m
  join public.zyntra_organizations o on o.id=m.organization_id
  where m.user_id=p_actor_id and m.role='owner' and o.status in ('pending','active');

  if v_owned_count >= 3 then raise exception 'Organization creation limit reached'; end if;

  insert into public.zyntra_organizations(legal_name,display_name,slug,status,created_by,incorporation_country)
  values (btrim(p_legal_name),btrim(p_display_name),p_slug,'pending',p_actor_id,p_incorporation_country)
  returning id into v_organization_id;

  insert into public.zyntra_organization_members(organization_id,user_id,role)
  values (v_organization_id,p_actor_id,'owner');

  insert into public.zyntra_approvals(
    organization_id,action_type,resource_type,resource_id,requested_by,status,reason
  ) values (
    v_organization_id,'organization_activation','organization',v_organization_id,
    p_actor_id,'pending','Initial organization onboarding review'
  );

  insert into public.zyntra_audit_events(
    organization_id,actor_user_id,actor_type,action,resource_type,resource_id,details
  ) values (
    v_organization_id,p_actor_id,'user','organization.created','organization',v_organization_id::text,
    jsonb_build_object('initial_status','pending','incorporation_country',p_incorporation_country,'approval_required',true)
  );

  return v_organization_id;
end;
$fn$;

revoke all on function public.zyntra_create_organization(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.zyntra_create_organization(uuid,text,text,text,text) to service_role;
