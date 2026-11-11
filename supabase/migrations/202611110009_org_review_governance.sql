-- Add an explicit maker-checker onboarding approval trail and server-only review RPC.
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

  select count(*) into v_owned_count
  from public.zyntra_organization_members m
  join public.zyntra_organizations o on o.id=m.organization_id
  where m.user_id=p_actor_id and m.role='owner' and o.status in ('pending','active');

  if v_owned_count >= 3 then
    raise exception 'Organization creation limit reached';
  end if;

  insert into public.zyntra_organizations(legal_name, display_name, slug, status, created_by)
  values (btrim(p_legal_name), btrim(p_display_name), p_slug, 'pending', p_actor_id)
  returning id into v_organization_id;

  insert into public.zyntra_organization_members(organization_id, user_id, role)
  values (v_organization_id, p_actor_id, 'owner');

  insert into public.zyntra_approvals(
    organization_id, action_type, resource_type, resource_id, requested_by, status, reason
  ) values (
    v_organization_id, 'organization_activation', 'organization', v_organization_id,
    p_actor_id, 'pending', 'Initial organization onboarding review'
  );

  insert into public.zyntra_audit_events(
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id, details
  ) values (
    v_organization_id, p_actor_id, 'user', 'organization.created',
    'organization', v_organization_id::text, jsonb_build_object('initial_status','pending','approval_required',true)
  );

  return v_organization_id;
end;
$fn$;

create or replace function public.zyntra_review_organization(
  p_organization_id uuid,
  p_actor_id uuid,
  p_decision text,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_requester uuid;
  v_status text;
  v_new_status text;
  v_approval_id uuid;
begin
  if p_actor_id is null then raise exception 'Authenticated platform administrator required'; end if;
  if p_decision is null or p_decision not in ('approve','reject') then raise exception 'Invalid review decision'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 8 then raise exception 'A review reason is required'; end if;

  select status into v_status from public.zyntra_organizations where id=p_organization_id for update;
  if not found then raise exception 'Organization not found'; end if;
  if v_status <> 'pending' then raise exception 'Only pending organizations can be approved or rejected'; end if;

  select id, requested_by into v_approval_id, v_requester
  from public.zyntra_approvals
  where organization_id=p_organization_id and action_type='organization_activation' and status='pending'
  order by created_at desc limit 1 for update;

  if v_approval_id is null then raise exception 'Pending organization approval not found'; end if;
  if v_requester = p_actor_id then raise exception 'Requester cannot approve their own organization'; end if;

  v_new_status := case p_decision when 'approve' then 'active' else 'closed' end;

  update public.zyntra_organizations set status=v_new_status, updated_at=now() where id=p_organization_id;
  update public.zyntra_approvals
  set status=case p_decision when 'approve' then 'approved' else 'rejected' end,
      approved_by=p_actor_id, reason=btrim(p_reason), decided_at=now()
  where id=v_approval_id;

  insert into public.zyntra_audit_events(
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id, details
  ) values (
    p_organization_id, p_actor_id, 'user', 'organization.'||p_decision,
    'organization', p_organization_id::text,
    jsonb_build_object('previous_status',v_status,'new_status',v_new_status,'reason',btrim(p_reason))
  );

  return v_new_status;
end;
$fn$;

revoke all on function public.zyntra_create_organization(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.zyntra_review_organization(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.zyntra_create_organization(uuid,text,text,text) to service_role;
grant execute on function public.zyntra_review_organization(uuid,uuid,text,text) to service_role;
