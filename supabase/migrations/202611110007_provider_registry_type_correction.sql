alter table public.zyntra_payment_providers
  drop constraint if exists zyntra_payment_providers_provider_type_check;

alter table public.zyntra_payment_providers
  add constraint zyntra_payment_providers_provider_type_check
  check (provider_type in ('payment_orchestrator','fiat_psp','crypto_protocol','ramp','broker','market_data','fx'));

update public.zyntra_payment_providers
set provider_type='payment_orchestrator'
where code='hyperswitch' and provider_type='fiat_psp';
