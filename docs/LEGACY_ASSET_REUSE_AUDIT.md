# ZYNTRA Legacy Asset Reuse Audit

**Review date:** 2026-11-11  
**Purpose:** Identify reusable assets from earlier ZYNTRA/NexusAI work without importing incompatible or unsafe runtime behavior into the current platform.

## Executive decision

Keep `Johanne012/zyntra-flowbrief` + the existing Supabase project as the canonical implementation baseline for now. Do not replace it with `nexusai-commerce` or create a parallel financial backend. Reuse selected product concepts and UX patterns only after they are reimplemented against the current contracts.

This is a source-level audit, not a claim that every Vercel deployment or prior conversation has been exhaustively inspected.

## Verified inventory

### GitHub
- `Johanne012/zyntra-flowbrief`: current repository; `main` at `d4e92d17ba52f2f5d2f062084556443722807bef`. Contains static launch-site assets, Supabase Edge Functions, migrations, platform docs and contract tests.
- `Johanne012/nexusai-commerce`: separate Next.js 14 / Prisma application; `main` at `ad3d333c13d0dc7771d4ad7331d03663c14757e8`. Contains product-generation UI, marketplace pages, payment adapters, XRP/XRPL escrow experiments, NextAuth and a Prisma schema configured for SQLite.

### Supabase
- One accessible project was returned: `ZYNTRA business`, ref `ijbmdftluptwnglryaqx`, ACTIVE_HEALTHY, Postgres 17 in `eu-central-1`.
- Current repo documentation and database inventory establish this as the active platform backend. Do not point legacy Prisma code at it without a deliberate schema/auth migration and contract review.

### Vercel
- 28 projects were returned for the ZYNTRA team.
- Confirmed relevant names include `zyntra-flowbrief`, `zyntra-flowbrief-v2`, `zyntra-tools`, `zyntra-marketplace`, `zyntra-one-marketplace`, `zyntra-storage`, `crypto-portfolio`, `zyntra-launch-kit`, and `nexusai-commerce`.
- Latest deployment snapshots inspected: `zyntra-flowbrief` and `zyntra-flowbrief-v2` READY; `zyntra-one-marketplace` READY; `zyntra-marketplace` ERROR; `nexusai-commerce` ERROR; `zyntra-tools` READY; `zyntra-storage` reports live=false despite a READY historical deployment; `crypto-portfolio` reports live=false despite a READY historical deployment; `zyntra-launch-kit` READY.
- A READY deployment is not proof of current product correctness, data safety, or canonical ownership. SSO protection differs by project. Do not promote, alias, delete, or change project protection during this audit.

## Reuse decisions

| Legacy asset | Decision | Rationale / required work |
|---|---|---|
| Arabic RTL Next.js visual patterns and product navigation | Candidate for selective UX port | Rebuild in the current frontend shell and design tokens; do not transplant auth/data coupling. |
| Product-generation taxonomy (ebook, marketing copy, code, product description, report, service package, prompt pack, API template) | Reuse as a product/catalog concept | Map to ZYNTRA's governed product/service catalog; generation must be model-backed, metered, moderated and persisted through approved APIs. |
| Four quality tiers and multilingual UX | Reuse as product requirements | Define measurable output limits, pricing, languages, and entitlement rules; no fixed mock generation. |
| Marketplace / job / escrow concept | Reuse as a future domain concept only | Model as offers, work orders, milestones, disputes and settlement intents. Do not import legacy escrow state machine or claim custody. |
| Demo payment adapter | Reuse only as a local test fixture after correction | Current legacy demo verifier returns `completed` with `amountReceived: 0`; that is unsafe if it can touch order fulfillment. Must be impossible to use in production. |
| XRP/XRPL payment adapter | Do not import into production | Legacy code accepts a transaction hash and checks success/destination/tag/amount, but requires a full review of finality, issued-currency handling, amount precision, replay/idempotency, confirmation depth, address/tag collision and reconciliation. The tag is a deterministic hash, not a guaranteed unique allocation. |
| XRPL escrow implementation | Do not import | Separate chain-specific custody/escrow and legal/security model; incompatible with current non-custodial-by-default and provider-route governance until separately designed and reviewed. |
| NextAuth + Prisma/SQLite identity/data model | Do not import | Current platform uses Supabase Auth/Postgres, tenant memberships, app-metadata authorization and audited server-side functions. A second identity/data source would fragment security and records. |
| Legacy Prisma schema | Reference only | Uses floating-point monetary fields and SQLite; current platform requires integer minor/base units and balanced immutable ledger journals. |
| Legacy marketing claims such as “fully automatic”, “real escrow”, or “ready for real payments” | Reject | Not supported by verified runtime evidence and conflict with the current truth-in-status policy. |

## Current-platform constraints that legacy work must satisfy

1. Supabase Postgres is the platform system of record; no second production database.
2. Financial amounts use integer minor/base units and explicit asset/network identity; never floating point.
3. Payment intents are not payment execution. Only approved, enabled provider routes may be selected.
4. Ledger posting/reversal remains server-side, balanced, immutable and role-gated.
5. Tenant isolation and authorization use verified server-side claims and membership checks; never user-editable metadata.
6. AI agents may research, draft, classify and recommend. No signing, custody, payment, payout or trading tools.
7. No public promise of deposits, withdrawals, pooled balances, brokerage or globally available payments until legal, partner and operational release gates pass.
8. Legacy UI must call the current APIs; it must not write directly to platform tables.

## Immediate implementation sequence

1. Finish a route/page inventory of the current public site and authenticated console; identify the intended canonical Vercel project and its Git connection without changing aliases or domains.
2. Extract only high-value RTL components and marketplace/product UX concepts into an isolated feature branch with no financial wiring.
3. Define product catalog and AI generation contracts against current organization, entitlement, usage-metering and audit models.
4. Keep escrow as a separate future bounded context; first design non-custodial milestones and dispute governance without moving assets.
5. Add contract tests for any ported UI/API and verify tenant isolation, no direct table grants, idempotency and production-disabled behavior.
6. Review all remaining Vercel projects and deployments for repository linkage, framework/root directory, domain assignment, environment-variable names (never values), deployment status and whether the project contains unique source worth preserving.

## Not done / explicit limitations

- No legacy project, repository, deployment, database, domain, environment variable, or integration was deleted, overwritten, promoted, or reconfigured.
- No payment provider was enabled and no funds or blockchain transactions were initiated.
- The full source tree and deployment history of all 28 Vercel projects have not yet been inspected.
- Prior ChatGPT conversations were not available as complete transcripts; only retrieved summaries and user-provided excerpts were considered.
- The old `nexusai-commerce` code was sampled at README, package, homepage, marketplace, payment adapters, escrow, generator, environment validation and Prisma schema. It was not run locally or penetration-tested.
