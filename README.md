# ZYNTRA — Global Platform Workspace

ZYNTRA is being developed as a modular, global digital platform. This repository contains the public Launch Kit website and the first authenticated financial-platform foundation. It is **not yet a complete fintech, exchange, broker, wallet custodian, or globally available payment service**.

## Current verified state

- Public website: static HTML hosted through Vercel.
- Backend: Supabase Postgres and Edge Functions.
- Platform core: organizations, memberships, asset catalogue, provider registry, payment intents/attempts, provider-event inbox, double-entry ledger, FX quotes, settlements, approvals, and audit events.
- Organization console: authenticated signup/login, organization onboarding, organization selection, aggregate dashboard, and a tenant-scoped read-only activity view.
- Activity API: JWT required; verifies organization membership and returns up to 25 payment-intent, ledger, approval, and settlement records per section.
- Payment-intent API: JWT required; checks membership, active organization, enabled asset, approved/enabled provider route, merchant country, customer country, method, and amount limits. It stores the selected route ID on the internal intent; it does not charge a provider.
- Ledger posting/reversal APIs: JWT-protected, finance-role checks, balanced immutable journals, and separate reversal journals.
- Organization onboarding/review: legal-country-aware, pending by default, maker-checker approval and platform-admin claim.
- AI governance: four global catalog entries (Marketing, Support, R&D, Profit Analytics) are seeded but remain disabled, registry-only, internal-data-only, and without model credentials or tool grants; financial execution/signing tools are blocked.
- Asset catalogue: 23 seeded assets, all disabled.
- Provider catalogue: 6 provider records, all disabled.
- CI: contract tests and Deno checks passed for the merged activity and route-binding changes.

## Architecture principles

1. Hybrid and non-custodial by default.
2. Payment orchestration, crypto rails, FX, securities brokerage, and market data are separate domains.
3. No single provider or currency is treated as universal.
4. Money is stored as integer minor/base units, never floating-point.
5. Posted ledger journals are balanced per asset and immutable.
6. Platform tables remain server-only until tenant-aware authorization and RLS tests are ready.
7. AI agents may research, draft, classify, and recommend; they do not sign, transfer, pay out, or trade.

## Runtime endpoints

- `zyntra-order-intake`: public enquiry intake with origin/publishable-key checks, honeypot, and rate limiting. It does not accept or verify payments.
- `zyntra-create-payment-intent`: JWT-protected; creates an internal intent only after an approved route is selected and records that route ID.
- `zyntra-org-activity`: JWT-protected, tenant-scoped, read-only activity records (25 rows per section).
- `zyntra-post-ledger` / `zyntra-reverse-ledger`: JWT-protected internal accounting operations with finance-role checks.
- `zyntra-chargily-payments`: disabled; JWT required and responds with HTTP 410.

## Not enabled

- Customer deposits, withdrawals, pooled balances, or custody.
- Crypto signing or bridge execution.
- Card processing or merchant acquiring.
- FX execution or payouts.
- Live securities trading.
- AI-authorized financial actions.

## Release gates

Before any real financial product is enabled, require legal-entity and country eligibility, provider underwriting, compliance and safeguarding review, threat modeling, tenant isolation tests, webhook replay tests, ledger reconciliation, incident response, backup restoration, and a controlled production rollout.

## Links

- Repository: https://github.com/Johanne012/zyntra-flowbrief
- Website: https://zyntra-flowbrief.vercel.app
- Contact: zyntrabusinesszyntraal@gmail.com
- Scheduling: https://calendly.com/zyntrabusinesszyntraal/30min

**Status:** foundation in active development; no live financial services are represented as available.
