-- Server-only organization onboarding and dashboard RPCs.
create or replace function public.zyntra_create_organization(
  p_actor_id uuid,
  p_legal_name text,
  p_display_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_organization_id uuid;
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

  insert into public.zyntra_organizations(legal_name, display_name, slug, status, created_by)
  values (btrim(p_legal_name), btrim(p_display_name), p_slug, 'pending', p_actor_id)
  returning id into v_organization_id;

  insert into public.zyntra_organization_members(organization_id, user_id, role)
  values (v_organization_id, p_actor_id, 'owner');

  insert into public.zyntra_audit_events(
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id, details
  ) values (
    v_organization_id, p_actor_id, 'user', 'organization.created',
    'organization', v_organization_id::text, jsonb_build_object('initial_status','pending')
  );

  return v_organization_id;
end;
$fn$;

create or replace function public.zyntra_get_org_dashboard(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_org record;
  v_result jsonb;
begin
  select id, legal_name, display_name, slug, status, created_at
  into v_org
  from public.zyntra_organizations
  where id = p_organization_id;

  if not found then return null; end if;

  select jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_org.id,
      'legal_name', v_org.legal_name,
      'display_name', v_org.display_name,
      'slug', v_org.slug,
      'status', v_org.status,
      'created_at', v_org.created_at
    ),
    'payment_intents', jsonb_build_object(
      'total', (select count(*) from public.zyntra_payment_intents where organization_id = p_organization_id),
      'created', (select count(*) from public.zyntra_payment_intents where organization_id = p_organization_id and status = 'created'),
      'processing', (select count(*) from public.zyntra_payment_intents where organization_id = p_organization_id and status in ('requires_action','processing','authorized')),
      'succeeded', (select count(*) from public.zyntra_payment_intents where organization_id = p_organization_id and status = 'succeeded'),
      'failed', (select count(*) from public.zyntra_payment_intents where organization_id = p_organization_id and status = 'failed')
    ),
    'ledger_transactions', (select count(*) from public.zyntra_ledger_transactions where organization_id = p_organization_id),
    'pending_approvals', (select count(*) from public.zyntra_approvals where organization_id = p_organization_id and status = 'pending'),
    'settlements', (select count(*) from public.zyntra_settlements where organization_id = p_organization_id),
    'available_assets', (select count(*) from public.zyntra_assets where is_active = true),
    'enabled_providers', (select count(*) from public.zyntra_payment_providers where enabled = true)
  ) into v_result;

  return v_result;
end;
$fn$;

revoke all on function public.zyntra_create_organization(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.zyntra_get_org_dashboard(uuid) from public, anon, authenticated;
grant execute on function public.zyntra_create_organization(uuid,text,text,text) to service_role;
grant execute on function public.zyntra_get_org_dashboard(uuid) to service_role;

comment on function public.zyntra_create_organization(uuid,text,text,text) is
  'Server-only onboarding RPC. Caller must validate the actor JWT before passing actor id. New organizations begin pending.';
comment on function public.zyntra_get_org_dashboard(uuid) is
  'Server-only dashboard aggregate. Caller must validate organization membership before invocation.';
