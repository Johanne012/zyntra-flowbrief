alter table public.zyntra_provider_routes
  add column if not exists priority smallint not null default 100
  check (priority between 0 and 10000);

create index if not exists zyntra_provider_routes_priority_idx
  on public.zyntra_provider_routes (organization_id, asset_id, merchant_country_code, enabled, approval_status, priority, created_at);
