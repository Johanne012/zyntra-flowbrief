-- ZYNTRA platform core index hardening.
create index if not exists zyntra_approvals_approved_by_idx on public.zyntra_approvals(approved_by);
create index if not exists zyntra_approvals_organization_idx on public.zyntra_approvals(organization_id);
create index if not exists zyntra_approvals_requested_by_idx on public.zyntra_approvals(requested_by);
create index if not exists zyntra_audit_events_actor_idx on public.zyntra_audit_events(actor_user_id);
create index if not exists zyntra_fx_quotes_organization_idx on public.zyntra_fx_quotes(organization_id);
create index if not exists zyntra_fx_quotes_quote_asset_idx on public.zyntra_fx_quotes(quote_asset_id);
create index if not exists zyntra_ledger_accounts_asset_idx on public.zyntra_ledger_accounts(asset_id);
create index if not exists zyntra_ledger_entries_asset_idx on public.zyntra_ledger_entries(asset_id);
create index if not exists zyntra_ledger_transactions_created_by_idx on public.zyntra_ledger_transactions(created_by);
create index if not exists zyntra_organization_members_user_idx on public.zyntra_organization_members(user_id);
create index if not exists zyntra_organizations_created_by_idx on public.zyntra_organizations(created_by);
create index if not exists zyntra_payment_intents_asset_idx on public.zyntra_payment_intents(asset_id);
create index if not exists zyntra_payment_intents_customer_idx on public.zyntra_payment_intents(customer_user_id);
create index if not exists zyntra_payment_intents_settlement_asset_idx on public.zyntra_payment_intents(settlement_asset_id);
create index if not exists zyntra_settlements_asset_idx on public.zyntra_settlements(asset_id);
create index if not exists zyntra_settlements_organization_idx on public.zyntra_settlements(organization_id);
create index if not exists zyntra_settlements_provider_idx on public.zyntra_settlements(provider_id);

revoke references, trigger, update, delete, truncate on public.zyntra_audit_events from service_role;
grant select, insert on public.zyntra_audit_events to service_role;
