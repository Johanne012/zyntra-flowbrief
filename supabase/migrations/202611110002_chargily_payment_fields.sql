-- Chargily Pay V1: server-side checkout and verified webhook state.
alter table public.zyntra_orders
  add column if not exists payment_provider text,
  add column if not exists payment_amount_dzd bigint,
  add column if not exists chargily_checkout_id text,
  add column if not exists checkout_request_started_at timestamptz;

alter table public.zyntra_orders
  add constraint zyntra_orders_payment_provider_check
  check (payment_provider is null or payment_provider in ('chargily'));

alter table public.zyntra_orders
  add constraint zyntra_orders_payment_amount_dzd_check
  check (payment_amount_dzd is null or payment_amount_dzd > 0);

create unique index if not exists zyntra_orders_chargily_checkout_id_uidx
  on public.zyntra_orders (chargily_checkout_id)
  where chargily_checkout_id is not null;

-- No grants or policies are added: customer/payment writes remain service-role only.
