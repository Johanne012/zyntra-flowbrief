alter table public.zyntra_payment_intents
  add column if not exists provider_route_id uuid
  references public.zyntra_provider_routes(id);

create index if not exists zyntra_payment_intents_provider_route_idx
  on public.zyntra_payment_intents (provider_route_id);

comment on column public.zyntra_payment_intents.provider_route_id is
  'Approved provider route selected when the intent was created; does not mean a provider charge was attempted.';
