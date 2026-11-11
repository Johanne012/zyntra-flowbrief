-- Order transition engine v1.
-- This migration is committed for review only; apply through the Supabase CLI release workflow.
create unique index if not exists zyntra_order_transition_request_uidx
  on public.zyntra_audit_events (resource_type, resource_id, request_id)
  where action = 'order.status_transition' and request_id is not null;

create or replace function public.zyntra_transition_order(
  p_order_id uuid,
  p_expected_status text,
  p_next_status text,
  p_actor_user_id uuid,
  p_reason text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_order public.zyntra_orders%rowtype;
  v_existing public.zyntra_audit_events%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if p_order_id is null or p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'Order and actor are required';
  end if;
  if p_expected_status is null or p_next_status is null then
    raise exception using errcode = '22023', message = 'Expected and next status are required';
  end if;
  if p_request_id is not null and (length(p_request_id) < 8 or length(p_request_id) > 128) then
    raise exception using errcode = '22023', message = 'Invalid request id';
  end if;
  if v_reason is not null and length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'Reason is too long';
  end if;
  if not exists (select 1 from auth.users where id = p_actor_user_id) then
    raise exception using errcode = '22023', message = 'Actor does not exist';
  end if;

  select * into v_order
  from public.zyntra_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;

  if p_request_id is not null then
    select * into v_existing
    from public.zyntra_audit_events
    where resource_type = 'order'
      and resource_id = p_order_id::text
      and action = 'order.status_transition'
      and request_id = p_request_id;

    if found then
      if v_existing.actor_user_id <> p_actor_user_id
         or v_existing.details->>'from_status' <> p_expected_status
         or v_existing.details->>'to_status' <> p_next_status then
        raise exception using errcode = '23505', message = 'Request id was already used for a different transition';
      end if;
      return jsonb_build_object(
        'ok', true,
        'idempotent_replay', true,
        'order_id', p_order_id,
        'order_status', v_existing.details->>'to_status',
        'event_id', v_existing.id
      );
    end if;
  end if;

  if v_order.order_status <> p_expected_status then
    raise exception using errcode = '40001', message = 'Order status changed; reload before retrying';
  end if;

  if not (
    (p_expected_status = 'received' and p_next_status in ('reviewing','cancelled'))
    or (p_expected_status = 'reviewing' and p_next_status in ('awaiting_payment','cancelled'))
    or (p_expected_status = 'awaiting_payment' and p_next_status = 'cancelled')
    or (p_expected_status = 'paid' and p_next_status = 'in_progress')
    or (p_expected_status = 'in_progress' and p_next_status = 'delivered')
  ) then
    raise exception using errcode = '23514', message = 'Order status transition is not allowed';
  end if;

  if p_next_status = 'cancelled' and v_reason is null then
    raise exception using errcode = '22023', message = 'Cancellation reason is required';
  end if;
  if p_next_status = 'delivered' and v_reason is null then
    raise exception using errcode = '22023', message = 'Delivery evidence reference is required';
  end if;

  update public.zyntra_orders
  set order_status = p_next_status,
      updated_at = now()
  where id = p_order_id;

  insert into public.zyntra_audit_events (
    actor_user_id, actor_type, action, resource_type, resource_id, request_id, details
  ) values (
    p_actor_user_id, 'user', 'order.status_transition', 'order', p_order_id::text, p_request_id,
    jsonb_strip_nulls(jsonb_build_object(
      'from_status', p_expected_status,
      'to_status', p_next_status,
      'reason', v_reason
    ))
  )
  returning * into v_existing;

  return jsonb_build_object(
    'ok', true,
    'idempotent_replay', false,
    'order_id', p_order_id,
    'order_status', p_next_status,
    'event_id', v_existing.id
  );
end;
$$;

revoke all on function public.zyntra_transition_order(uuid,text,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.zyntra_transition_order(uuid,text,text,uuid,text,text) to service_role;

comment on function public.zyntra_transition_order(uuid,text,text,uuid,text,text)
  is 'Atomic, optimistic-concurrency-checked order status transition with append-only audit event. Callable only by trusted server role.';
