# ZYNTRA Platform Core v1

This directory is the beginning of the platform backend, separate from the existing Launch Kit marketing site.

## Decisions
- Hybrid / non-custodial by default.
- Payment providers, crypto rails, FX, securities brokers and market-data vendors are independent adapters.
- Fiat amounts use integer minor units; crypto uses integer base units. The database column `amount_atoms` is an integer decimal and never IEEE-754 floating point.
- Ledger entries are balanced per asset. Posted journals are immutable; corrections are reversals.
- Provider webhooks are deduplicated by provider/event id and must be authenticated before business state changes.
- Every table is RLS-enabled and server-only in v1. Do not add browser policies until an authorization matrix and RLS tests exist.
- An accounting ledger is not custody, stored value, a bank account, or proof that assets are held.

## Migration
`supabase/migrations/202611110003_platform_core_v1.sql`

## Tables
Organizations/memberships, assets, provider registry, payment intents/attempts, provider event inbox, ledger accounts/transactions/entries, FX quotes, settlements, approvals and audit events.

## Security posture
- No client role grants.
- Only trusted server functions using server-side credentials may access the core.
- Never put service-role keys in browser/mobile bundles.
- Do not give AI agents credentials that can post ledger entries, issue payouts, sign transactions or trade securities.
- Ledger postings must be deterministic and balanced per asset. This v1 migration adds database-side guardrails; production posting APIs still need independent authorization and idempotency tests.

## Not in v1
Custody, deposits/withdrawals, live crypto signing, broker execution, customer balances, KYC/AML decisions, payment acceptance or legal eligibility. These require separate provider, compliance, operational and legal gates.
