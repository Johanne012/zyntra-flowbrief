# ZYNTRA — Verified Status

**Last verified:** 2026-11-11  
**Status:** Foundation deployed to Supabase; public website remains a separate static Launch Kit product.

## What is running

| Component | Verified state |
|---|---|
| Supabase project | ACTIVE_HEALTHY |
| Platform schema | Applied |
| Provider-neutral ledger | Tables, constraints and indexes applied |
| Ledger smoke test | Balanced posting accepted; posted-entry mutation rejected |
| Order intake Edge Function | ACTIVE v3 |
| Payment intent Edge Function | ACTIVE v1, JWT verification enabled |
| Chargily Edge Function | ACTIVE v2 but disabled; JWT verification enabled, returns 410 |
| Asset catalogue | 23 records, 0 active |
| Provider catalogue | 6 records, 0 enabled |
| Organizations | 0 |
| Console source | Merged; deployment pending Vercel build quota |
| Organization onboarding API | ACTIVE v1, JWT + CORS allowlist |
| Organization dashboard API | ACTIVE v2, JWT + membership check |
| Organization listing API | ACTIVE v1, JWT + CORS allowlist |
| Vercel preview | v2 preview build succeeded |
| Primary Vercel project | Deployment blocked by project verification/branch rules |

## What is not running

- No live payment acceptance or settlement.
- No active crypto, fiat, FX or broker route.
- No customer balances or custody.
- No signing service or withdrawals.
- No live securities orders.
- No complete customer/admin portal.
- No verified global licensing or market eligibility.
- No autonomous AI agent with authority to move funds or trade.
- No verified production release of the latest application changes.

## Recent changes

1. Added provider-neutral platform schema and security guardrails.
2. Added immutable posted-ledger controls and per-asset balancing.
3. Added a disabled global asset/provider catalogue.
4. Deployed a JWT-protected payment-intent creation endpoint.
5. Replaced the public order page with a backend-connected enquiry form.
6. Removed the hard-coded BTC payment address and direct-payment instructions.
7. Disabled the unverified DZD-only Chargily checkout adapter.
8. Removed unsubstantiated pilot scarcity, testimonial and delivery claims from the public homepage.

## Highest-priority remaining work

1. Build authenticated staff onboarding, organization management and tenant-aware admin views.
2. Add a server-side order inbox and notification delivery with verified email domain.
3. Add provider capability and country eligibility registry before activating any asset or provider.
4. Implement signed webhook inbox, reconciliation, refunds and deterministic state transitions.
5. Add complete integration/security tests and a reproducible local Supabase migration environment.
6. Select one canonical Vercel project and resolve deployment verification rules.
7. Complete legal/compliance review before enabling any regulated financial feature.

## Operating rule

A deployed function is not proof that its full business workflow is validated. A database ledger is not proof of customer funds. A preview deployment is not a production release. Never mark a feature as live without end-to-end evidence.
