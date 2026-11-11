-- Seed only a disabled catalog. No provider or asset is activated for real payments by default.
insert into public.zyntra_assets(asset_type,code,network,decimals,is_active,metadata)
values
 ('fiat','USD',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','EUR',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','GBP',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','JPY',null,0,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','CHF',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','CAD',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','AUD',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','SGD',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','AED',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','SAR',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','BRL',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','MXN',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','ZAR',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','INR',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','TRY',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('fiat','DZD',null,2,false,'{"standard":"ISO-4217"}'::jsonb),
 ('crypto','BTC','bitcoin:mainnet',8,false,'{"unit":"satoshi"}'::jsonb),
 ('crypto','ETH','eip155:1',18,false,'{"unit":"wei"}'::jsonb),
 ('stablecoin','USDC','eip155:1',6,false,'{"issuer":"Circle","unit":"base"}'::jsonb),
 ('stablecoin','USDC','eip155:8453',6,false,'{"issuer":"Circle","unit":"base"}'::jsonb),
 ('stablecoin','USDC','solana:mainnet',6,false,'{"issuer":"Circle","unit":"base"}'::jsonb),
 ('stablecoin','USDT','eip155:1',6,false,'{"issuer":"Tether","unit":"base"}'::jsonb),
 ('stablecoin','USDT','tron:mainnet',6,false,'{"issuer":"Tether","unit":"base"}'::jsonb);

insert into public.zyntra_payment_providers(code,display_name,provider_type,enabled,capabilities)
values
 ('hyperswitch','Hyperswitch','fiat_psp',false,'{"role":"payment-orchestration","self_hostable":true}'::jsonb),
 ('request_network','Request Network','crypto_protocol',false,'{"role":"non-custodial-invoice-protocol"}'::jsonb),
 ('bridge','Bridge','ramp',false,'{"role":"fiat-stablecoin-rails","commercial_provider":true}'::jsonb),
 ('interactive_brokers','Interactive Brokers','broker',false,'{"role":"securities-broker","requires_eligibility_review":true}'::jsonb),
 ('coingecko','CoinGecko','market_data',false,'{"role":"crypto-market-data"}'::jsonb),
 ('ecb_reference','ECB reference rates','fx',false,'{"role":"reference-fx-only","not_executable_quote":true}'::jsonb)
on conflict (code) do nothing;
