# ZYNTRA — Verified Status

**Last verified:** 2026-11-11  
**Status:** Backend foundation and authenticated organization console are in active development. A preview deployment is READY; production release of the latest console changes is not yet verified.

## Runtime verified

| Component | Verified state |
|---|---|
| Supabase project | ACTIVE_HEALTHY |
| Platform schema | Applied |
| Provider-neutral ledger | Balanced posting smoke test passed; posted journals immutable |
| Order intake Edge Function | ACTIVE v3 |
| Payment intent Edge Function | ACTIVE v4, JWT verification enabled; approved route required and selected route ID persisted |
| Organization onboarding API | ACTIVE v3, JWT + CORS allowlist |
| Organization dashboard API | ACTIVE v2, JWT + membership check |
| Organization listing API | ACTIVE v1, JWT + membership check |
| Organization review API | ACTIVE v1, platform-admin claim required |
| Ledger posting API | ACTIVE v1, JWT + finance role |
| Ledger reversal API | ACTIVE v1, JWT + finance role |
| Organization activity API | ACTIVE v1, JWT + tenant membership, read-only, 25 rows per section |
| Chargily adapter | ACTIVE v2 but disabled; returns HTTP 410 |
| Asset catalogue | 23 records, 0 active |
| Provider catalogue | 6 records, 0 enabled |
| Organizations | 0 |
| Provider routes | 0 |
| Auth users | 0 |
| Ledger transactions | 0 |
| AI agents | 0 |
| CI | Contract suite and Deno checks passed for the merged activity and route-binding changes |
| Vercel preview | READY for the organization activity console branch |
| Production release | Latest console/financial changes not yet verified on production |

## What is not running

- No live payment acceptance, provider-side charge, or settlement.
- No active fiat, crypto, FX, or broker route.
- No customer balances, custody, signing service, or withdrawals.
- No live securities orders.
- No complete public customer portal or production-grade staff/admin suite.
- No verified global licensing, underwriting, or market eligibility.
- No autonomous AI agent with authority to move funds or trade.

## Recent changes

1. Added provider-neutral financial schema, immutable double-entry ledger, and idempotent posting/reversal APIs.
2. Added country-aware organization onboarding, maker-checker review, and disabled-by-default provider-route governance.
3. Added AI agent registry and tool-grant governance; agents remain disabled and financial execution tools are blocked.
4. Added authenticated, tenant-scoped read-only organization activity API and console tables for payment intents, ledger transactions, approvals, and settlement records.
5. Added foreign-key indexes identified by Supabase performance advisors.
6. Bound each new payment intent to its selected approved provider route; fixed numeric-text idempotency retry handling.
7. Kept all assets/providers/routes disabled; no live financial activity was enabled.

## Highest-priority remaining work

1. Finish staff onboarding, role management, and tenant-aware operational console.
2. Add provider-specific signed webhook adapters, replay protection, deterministic state transitions, and reconciliation.
3. Add integration tests for tenant isolation, payment lifecycle, duplicate events, ledger posting/reversal, and settlement matching.
4. Establish one canonical Vercel project/domain and verify the production deployment of the merged console.
5. Select a first eligible regulated payment partner and complete underwriting, legal, compliance, and safeguarding reviews before activation.
6. Add operational alerting, backups/restore tests, incident response, and audit retention.

## Operating rule

A deployed function is not proof that its full business workflow is validated. A selected provider route is not proof of a provider-side payment attempt. A database ledger is not proof of customer funds. A preview deployment is not a production release. Never mark a feature as live without end-to-end evidence.
