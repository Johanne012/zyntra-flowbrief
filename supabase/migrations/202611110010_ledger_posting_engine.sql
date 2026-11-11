alter table public.zyntra_ledger_transactions
  add column if not exists request_hash text;

update public.zyntra_ledger_transactions set request_hash=encode(extensions.digest(convert_to(id::text,'UTF8'),'sha256'),'hex') where request_hash is null;
alter table public.zyntra_ledger_transactions alter column request_hash set not null;

alter table public.zyntra_ledger_transactions
  add constraint zyntra_ledger_transactions_request_hash_check
  check (request_hash is null or request_hash ~ '^[0-9a-f]{64}$');

create or replace function public.zyntra_post_ledger_transaction(
  p_organization_id uuid,
  p_actor_id uuid,
  p_idempotency_key text,
  p_description text,
  p_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_org_status text;
  v_role text;
  v_hash text;
  v_transaction_id uuid;
  v_existing_hash text;
  v_entry record;
  v_debit numeric(78,0);
  v_credit numeric(78,0);
  v_count integer;
begin
  if p_organization_id is null or p_actor_id is null then
    raise exception 'Organization and authenticated actor are required';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{12,128}$' then
    raise exception 'Invalid idempotency key';
  end if;
  if p_description is null or char_length(btrim(p_description)) not between 2 and 300 then
    raise exception 'Invalid transaction description';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Ledger entries must be a JSON array';
  end if;

  v_count := jsonb_array_length(p_entries);
  if v_count < 2 or v_count > 100 then
    raise exception 'A ledger transaction requires between 2 and 100 entries';
  end if;

  select status into v_org_status
  from public.zyntra_organizations
  where id=p_organization_id;
  if v_org_status is distinct from 'active' then
    raise exception 'Organization is not active';
  end if;

  select role into v_role
  from public.zyntra_organization_members
  where organization_id=p_organization_id and user_id=p_actor_id;
  if v_role is null or v_role not in ('owner','admin','finance') then
    raise exception 'Insufficient organization role for ledger posting';
  end if;

  v_hash := encode(extensions.digest(convert_to(
    jsonb_build_object('description',btrim(p_description),'entries',p_entries)::text,
    'UTF8'
  ),'sha256'),'hex');

  insert into public.zyntra_ledger_transactions(
    organization_id,external_reference,idempotency_key,description,status,created_by,request_hash
  ) values (
    p_organization_id,null,p_idempotency_key,btrim(p_description),'draft',p_actor_id,v_hash
  )
  on conflict (organization_id,idempotency_key) do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    select id,request_hash into v_transaction_id,v_existing_hash
    from public.zyntra_ledger_transactions
    where organization_id=p_organization_id and idempotency_key=p_idempotency_key;
    if v_existing_hash is distinct from v_hash then
      raise exception 'Idempotency key already used with different ledger entries';
    end if;
    return v_transaction_id;
  end if;

  for v_entry in
    select * from jsonb_to_recordset(p_entries)
      as x(account_id uuid,asset_id uuid,debit_atoms text,credit_atoms text)
  loop
    if v_entry.account_id is null or v_entry.asset_id is null then
      raise exception 'Every ledger entry requires account and asset identifiers';
    end if;
    if v_entry.debit_atoms is null or v_entry.debit_atoms !~ '^[0-9]{1,78}$'
       or v_entry.credit_atoms is null or v_entry.credit_atoms !~ '^[0-9]{1,78}$' then
      raise exception 'Ledger amounts must be integer strings with at most 78 digits';
    end if;

    v_debit := v_entry.debit_atoms::numeric(78,0);
    v_credit := v_entry.credit_atoms::numeric(78,0);
    if not ((v_debit > 0 and v_credit = 0) or (v_credit > 0 and v_debit = 0)) then
      raise exception 'Each ledger entry must contain either a debit or a credit';
    end if;

    insert into public.zyntra_ledger_entries(
      transaction_id,account_id,asset_id,debit_atoms,credit_atoms
    ) values (
      v_transaction_id,v_entry.account_id,v_entry.asset_id,v_debit,v_credit
    );
  end loop;

  update public.zyntra_ledger_transactions
  set status='posted'
  where id=v_transaction_id;

  insert into public.zyntra_audit_events(
    organization_id,actor_user_id,actor_type,action,resource_type,resource_id,details
  ) values (
    p_organization_id,p_actor_id,'user','ledger.transaction.posted',
    'ledger_transaction',v_transaction_id::text,
    jsonb_build_object('entry_count',v_count,'request_hash',v_hash)
  );

  return v_transaction_id;
end;
$fn$;

revoke all on function public.zyntra_post_ledger_transaction(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.zyntra_post_ledger_transaction(uuid,uuid,text,text,jsonb) to service_role;

comment on function public.zyntra_post_ledger_transaction(uuid,uuid,text,text,jsonb) is
  'Server-only ledger posting API. Enforces tenant role, per-asset balance, account ownership, immutable posting and idempotency.';
