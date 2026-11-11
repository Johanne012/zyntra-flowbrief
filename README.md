# ZYNTRA — Global Platform Workspace

ZYNTRA is being developed as a modular, global digital platform. This repository currently contains the legacy Launch Kit marketing site plus the first server-side platform foundation. It is **not yet a complete fintech, exchange, broker, wallet custodian or globally available payment service**.

## Current verified state

- Public website: static HTML hosted through Vercel.
- Backend: Supabase Postgres and Edge Functions.
- Platform core schema: organizations, memberships, asset catalog, provider registry, payment intents, payment attempts, provider event inbox, double-entry ledger, FX quotes, settlements, approvals and audit events.
- Public enquiry form: writes order/enquiry records through a rate-limited server-side Edge Function.
- Payment-intent API: authenticated JWT required; creates an internal intent only.
- Regional Chargily checkout: disabled pending eligibility and end-to-end validation.
- Asset catalogue: 23 seeded assets, all disabled.
- Provider catalogue: 6 provider records, all disabled.
- No organizations, customer funds, active payment routes, custody, wallet signing or securities trading are configured.

## Architecture principles

1. Hybrid and non-custodial by default.
2. Payment orchestration, crypto rails, FX, securities brokerage and market data are separate domains.
3. No single provider or currency is treated as universal.
4. Money is stored as integer minor/base units, never floating-point.
5. Posted ledger journals are balanced per asset and immutable.
6. All platform tables are server-only until tenant-aware authorization and RLS tests are ready.
7. AI agents may research, draft, classify and recommend; they do not sign, transfer, pay out or trade.

## Repository layout

- `index.html`, `order.html`, `about.html`, `contact.html`, `how.html`: public Launch Kit pages.
- `supabase/migrations/`: versioned platform schema changes.
- `supabase/functions/`: server-side Edge Functions.
- `platform/`: architecture and operational notes.
- `docs/`: audits and operating runbooks.
- `tests/`: CI contract tests.

## Runtime endpoints

- `zyntra-order-intake`: public enquiry intake, with origin/publishable-key checks, honeypot and rate limiting. It does not accept or verify payments.
- `zyntra-create-payment-intent`: JWT-protected; checks organization membership and enabled asset before creating an internal payment intent. It does not charge or settle.
- `zyntra-chargily-payments`: disabled; JWT required and responds with HTTP 410.

## Not enabled

- Customer deposits, withdrawals, pooled balances or custody.
- Crypto signing or bridge execution.
- Card processing or merchant acquiring.
- FX execution or payouts.
- Live securities trading.
- AI-authorized financial actions.

## Release gates

Before any real financial product is enabled, require legal-entity and country eligibility, provider underwriting, compliance and safeguarding review, threat modeling, tenant isolation tests, webhook replay tests, ledger reconciliation, incident response, backup restoration and controlled production rollout.

## Links

- Repository: https://github.com/Johanne012/zyntra-flowbrief
- Website: https://zyntra-flowbrief.vercel.app
- Contact: zyntrabusinesszyntraal@gmail.com
- Scheduling: https://calendly.com/zyntrabusinesszyntraal/30min

**Status:** foundation in active development; no live financial services are represented as available.
