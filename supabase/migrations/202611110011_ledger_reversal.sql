create unique index if not exists zyntra_ledger_one_reversal_per_original_idx
on public.zyntra_ledger_transactions(organization_id,external_reference)
where external_reference like 'reversal:%';

create or replace function public.zyntra_reverse_ledger_transaction(
  p_organization_id uuid,
  p_actor_id uuid,
  p_original_transaction_id uuid,
  p_idempotency_key text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_org_status text;
  v_role text;
  v_original_status text;
  v_original_reference text;
  v_original_description text;
  v_hash text;
  v_reversal_id uuid;
  v_existing_hash text;
  v_existing_id uuid;
  v_existing_reference text;
begin
  if p_organization_id is null or p_actor_id is null or p_original_transaction_id is null then
    raise exception 'Organization, actor and original transaction are required';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{12,128}$' then
    raise exception 'Invalid idempotency key';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 8 and 1000 then
    raise exception 'A reversal reason is required';
  end if;

  select status into v_org_status from public.zyntra_organizations where id=p_organization_id;
  if v_org_status is distinct from 'active' then raise exception 'Organization is not active'; end if;

  select role into v_role from public.zyntra_organization_members
  where organization_id=p_organization_id and user_id=p_actor_id;
  if v_role is null or v_role not in ('owner','admin','finance') then
    raise exception 'Insufficient organization role for ledger reversal';
  end if;

  select status,external_reference,description
  into v_original_status,v_original_reference,v_original_description
  from public.zyntra_ledger_transactions
  where id=p_original_transaction_id and organization_id=p_organization_id;

  if not found or v_original_status <> 'posted' then
    raise exception 'Original transaction is not a posted journal in this organization';
  end if;
  if coalesce(v_original_reference,'') like 'reversal:%' then
    raise exception 'A reversal journal cannot itself be reversed';
  end if;

  v_hash := encode(extensions.digest(convert_to(
    jsonb_build_object('operation','ledger_reversal','original_transaction_id',p_original_transaction_id,'reason',btrim(p_reason))::text,
    'UTF8'
  ),'sha256'),'hex');

  select id,request_hash,external_reference into v_existing_id,v_existing_hash,v_existing_reference
  from public.zyntra_ledger_transactions
  where organization_id=p_organization_id and idempotency_key=p_idempotency_key;

  if found then
    if v_existing_hash is distinct from v_hash or v_existing_reference is distinct from 'reversal:'||p_original_transaction_id::text then
      raise exception 'Idempotency key already used with different reversal details';
    end if;
    if (select status from public.zyntra_ledger_transactions where id=v_existing_id) <> 'posted' then
      raise exception 'Existing reversal request is not finalized';
    end if;
    return v_existing_id;
  end if;

  if exists (
    select 1 from public.zyntra_ledger_transactions
    where organization_id=p_organization_id and external_reference='reversal:'||p_original_transaction_id::text
  ) then
    raise exception 'Original transaction has already been reversed';
  end if;

  insert into public.zyntra_ledger_transactions(
    organization_id,external_reference,idempotency_key,description,status,created_by,request_hash
  ) values (
    p_organization_id,'reversal:'||p_original_transaction_id::text,p_idempotency_key,
    left('Reversal: '||btrim(p_reason),300),'draft',p_actor_id,v_hash
  )
  returning id into v_reversal_id;

  insert into public.zyntra_ledger_entries(
    transaction_id,account_id,asset_id,debit_atoms,credit_atoms
  )
  select v_reversal_id,account_id,asset_id,credit_atoms,debit_atoms
  from public.zyntra_ledger_entries
  where transaction_id=p_original_transaction_id;

  update public.zyntra_ledger_transactions set status='posted' where id=v_reversal_id;

  insert into public.zyntra_audit_events(
    organization_id,actor_user_id,actor_type,action,resource_type,resource_id,details
  ) values (
    p_organization_id,p_actor_id,'user','ledger.transaction.reversed',
    'ledger_transaction',v_reversal_id::text,
    jsonb_build_object('original_transaction_id',p_original_transaction_id,'reason',btrim(p_reason))
  );

  return v_reversal_id;
end;
$fn$;

revoke all on function public.zyntra_reverse_ledger_transaction(uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.zyntra_reverse_ledger_transaction(uuid,uuid,uuid,text,text) to service_role;

comment on function public.zyntra_reverse_ledger_transaction(uuid,uuid,uuid,text,text) is
  'Server-only reversal workflow. Creates a new opposite journal; never mutates the original posted journal.';
