# ZYNTRA Global Platform — Architecture & Security Audit
**Audit date:** 2026-11-11  
**Scope:** Current public repository default branch, open order/payment pull requests, connected Supabase project, Vercel project inventory, and existing Notion operating documents.  
**Status:** Initial evidence-based audit; not a penetration test, legal opinion, custody audit, or production certification.

## Executive decision

ZYNTRA should evolve from the current static Launch Kit website into a modular global platform. The existing repository is a small static HTML sales site, not yet a multi-tenant fintech or marketplace platform. Keep the Launch Kit as one revenue product, but do not mistake it for the platform core.

Adopt a hybrid, non-custodial-by-default model:
- ZYNTRA coordinates regulated payment providers and brokers; it does not represent itself as a bank, custodian, exchange, broker, or money transmitter.
- Customer-controlled wallets remain the default for digital assets.
- Fiat acceptance, stablecoin settlement, FX, securities brokerage, and market data are separate provider domains behind a common integration layer.
- ZYNTRA's internal ledger is an accounting record, not proof that customer assets are held or backed.
- No live custody, pooled client balances, fiat deposits/withdrawals, or securities execution until legal entity eligibility, provider approval, safeguarding, compliance, and operational controls are independently established.

## Verified current-state inventory

### GitHub
- Repository: `Johanne012/zyntra-flowbrief` (public), default branch `main`.
- Default-branch README describes ZYNTRA Launch Kit and claims a Grok-led autonomous growth system. The actual default branch contains a static HTML site and no demonstrated platform backend or agent runtime.
- Open PR #3 adds Supabase order intake. It is not merged into `main`.
- Open PR #4 adds a DZD-only Chargily checkout and is based on the PR #3 branch, not `main`. It is not merged.
- PR #3's runbook explicitly says browser-to-database end-to-end verification remains outstanding and the primary Vercel project had an error for that branch.
- PR #4's runbook says no test merchant secret/webhook E2E validation was completed. Treat payment processing as unverified and non-live.

### Supabase
- Project `ijbmdftluptwnglryaqx` is ACTIVE_HEALTHY, Postgres 17, region `eu-central-1`.
- The visible public business schema currently contains `public.zyntra_orders`, with RLS enabled and no anon/authenticated policies. That is compatible with a server-only order intake design if grants and Edge Function authorization remain correct.
- Existing migration history includes order intake, rate limiting, and Chargily-specific payment fields.
- Chargily-specific columns constrain provider to `chargily` and amounts to `payment_amount_dzd`; this is not a global payment model.
- Security advisor reported INFO-level `rls_enabled_no_policy` for the order table and private rate-limit table. Do not add public policies just to silence this finding. Confirm grants, function privilege boundaries, and intended server-only access.
- Performance advisor reports two unused indexes. Do not remove them until query patterns and production traffic justify it.

### Vercel
- Multiple ZYNTRA-named projects and unrelated experiments exist in the connected team. Project sprawl creates a risk of deploying the wrong app or promoting the wrong preview.
- The audit did not establish one canonical production project with verified branch protection and a fully passing end-to-end release gate.

### Notion
- Command Center and Ops Playbook describe Launch Kit fulfilment workflows using external tools.
- AUTO PULSE describes scheduled processes, but its last edit is old relative to this audit. Do not treat all documented automations or integrations as currently operational without execution evidence.
- Current sales workflow still includes manual payment confirmation and manual fulfillment steps.

## Findings and required action

| Severity | Finding | Required action |
|---|---|---|
| Critical | Main branch is a static Launch Kit site, not the promised global platform | Build platform core in a dedicated app/repository architecture; retain Launch Kit as a product module |
| High | Main-branch marketing contains scarcity/proof/turnaround statements that may not be substantiated (including a testimonial explicitly marked as a demo) | Remove fictional proof and unverified scarcity; make delivery timing conditional on agreed scope and payment |
| High | A public BTC address is displayed in the sales flow without a clearly documented reconciliation, chain-monitoring, or refund process | Disable direct-pay instructions until treasury ownership, invoice matching, confirmations, screening, refund policy, and reconciliation are implemented |
| High | PR #4 is tied to a single local provider and DZD-specific schema | Keep only as an optional local adapter; replace provider-specific core columns with provider-neutral payment intents and provider event records |
| High | PR #4 webhook and checkout flow have not been end-to-end validated | Verify exact Chargily API/webhook contract, replay handling, amount/currency/status matching, race conditions, retry behavior, and duplicate delivery before any acceptance |
| High | Payment checkout amount approval is currently described as manual database editing | Replace with authenticated staff workflow, maker-checker approval, audit trail, and immutable approved quote |
| High | No authenticated admin/customer portal is evidenced | Add role-based admin, customer order tracking, support and audit history |
| High | No evidence of complete legal/compliance operating model | Use country-specific legal review and provider eligibility gates before launch in each market |
| Medium | Brand palette in the site does not match the approved ZYNTRA palette | Standardize tokens: primary #0D3B66, secondary #06D6A0, accent #7D7D7D; retain semantic success/warning/error colors |
| Medium | Vercel projects and deployment history are fragmented | Designate one canonical production project and enforce protected main, preview checks, approvals and rollback |
| Medium | Notion pages contain stale or aspirational status claims | Mark every item as verified / planned / blocked / retired, with last checked timestamp and evidence |
| Medium | No demonstrated observability, incident response, or disaster recovery for a financial platform | Add immutable audit logs, alerts, backups, restore tests, incident runbooks and service health checks |

## Global target architecture

### 1. Experience layer
- Responsive web application, then mobile apps.
- Public marketing/product pages separated from authenticated application routes.
- Accessibility-first components, keyboard navigation, readable contrast, localization and right-to-left support.
- Shared design tokens and component library.

### 2. Identity and access
- Supabase Auth or an equivalent replaceable identity provider.
- MFA/passkeys for staff and privileged users.
- Server-side role and permission checks; never trust browser metadata for authorization.
- Tenant isolation, session revocation, device/session inventory, short-lived privileged access.
- Maker-checker approvals for sensitive staff operations.

### 3. Core domain services
- User, organization and tenant service.
- Product/catalog and order management.
- Provider-neutral payment orchestration.
- Double-entry accounting ledger with immutable journal entries.
- Reconciliation and settlement.
- Risk/compliance case management.
- Notifications and customer support.
- Audit/event log and reporting.
- Feature flags and policy configuration.

### 4. Money movement boundaries
- Fiat payment orchestration: Hyperswitch can be evaluated as a self-hostable open-source orchestration layer; provider contracts, merchant underwriting, settlement accounts and geographic availability remain external requirements.
- Crypto invoices/transfers: Request Network or direct wallet-connect integrations can be evaluated for non-custodial flows. Stablecoin and chain support must be verified per route.
- Fiat/stablecoin ramps and payouts: commercial providers such as Bridge are optional adapters, subject to entity, geography and compliance approval.
- Securities: a separately licensed broker integration; begin with market data and paper trading. Do not route securities orders through a payment gateway.
- FX: quote/rate service plus explicit spread, timestamp, source and settlement currency.
- Never promise universal global coverage. Use a capability matrix per country, currency, payment rail, asset and provider.

### 5. Provider-neutral financial data model
Use integer minor units for fiat and exact decimal/base-unit representation for digital assets. Avoid floating-point money.

Suggested entities:
- `assets`: asset_id, asset_type, code, network, decimals, issuer, metadata.
- `payment_intents`: id, tenant_id, customer_id, order_id, amount_minor, asset_id, presentment_currency, settlement_asset_id, status, expires_at, idempotency_key.
- `payment_attempts`: id, intent_id, provider_id, provider_reference, request_hash, status, failure_code, created_at.
- `provider_events`: provider_id, event_id, signature_verified_at, payload_hash, received_at, processed_at, processing_status; unique provider/event ID.
- `ledger_accounts`: account_id, tenant_id, account_code, account_type, asset_id.
- `ledger_transactions`: transaction_id, external_reference, idempotency_key, status, created_at.
- `ledger_entries`: transaction_id, account_id, debit_amount, credit_amount, asset_id; enforce balanced entries per asset.
- `fx_quotes`: base_asset, quote_asset, rate, source, quoted_at, expires_at, spread, fee.
- `settlements`: provider_id, batch_reference, gross, fees, net, asset_id, expected_at, reconciled_at.
- `risk_cases`, `approvals`, `audit_events`, `webhook_deliveries`.

Every state transition must be explicit and server-authoritative. Webhooks are untrusted until signature verification, provider reference lookup, amount/currency matching, replay prevention and state-machine validation succeed.

### 6. Security controls informed by exchange incidents
- Separate transaction request generation from independent transaction-policy validation and signing.
- Non-custodial first; if custody is ever introduced, use a qualified custodian or independently reviewed MPC/multisig architecture with segregated roles.
- For any future signer: allowlisted destinations, per-asset/per-chain limits, velocity limits, time delays for new destinations, maker-checker approval, isolated signing environment and independent policy enforcement at the signer.
- Explicitly review smart-account/delegation operations (including EIP-7702 where applicable), token approvals, contract calls, bridge routes and permission changes—not only transfer value.
- Keep hot-wallet exposure minimal; do not auto-replenish a compromised hot wallet.
- Independent on-chain monitoring and ledger reconciliation; automatic fail-closed pause for abnormal outflows.
- Phishing-resistant MFA, endpoint hardening, short-lived credentials, secret rotation, dependency pinning, signed builds and software supply-chain controls.
- Immutable security logs stored outside the production account's administrative boundary.
- Tested incident response, emergency contacts, restore drills and customer communications.
- AI agents must never hold signing keys, secrets, unrestricted database credentials, or unilateral authority to move money.

### 7. AI operating model
Use multiple specialized, bounded agents rather than one omnipotent agent:
- Research/market intelligence.
- Customer support and knowledge retrieval.
- Marketing/content production.
- Product QA and test generation.
- Fraud/risk triage (recommendations only, human review for adverse decisions).
- Finance reconciliation assistant (read-only suggestions, no journal posting without deterministic rules).
- Operations orchestrator with task queue and approval gates.

Every agent needs a scoped tool allowlist, least-privilege credentials, per-action budgets, structured logs, evaluation tests, prompt-injection defenses, human escalation, and a kill switch. Agents may draft and recommend; they must not bypass policy engines or authorize financial actions.

## Release gates (non-negotiable)
1. Legal entity and beneficial ownership, target markets, product classification, provider eligibility and required licences reviewed by qualified counsel.
2. Threat model, data classification, privacy notices, retention/deletion policy and incident response approved.
3. RLS, grants, privileged functions, storage, views and secrets independently reviewed; no service key in client code.
4. Unit, integration, webhook replay, race-condition, abuse, authorization and end-to-end tests pass.
5. Ledger invariants and reconciliation tests pass under duplicate, delayed, partial and out-of-order events.
6. Backup restoration and rollback rehearsed.
7. Provider test-mode acceptance and signed webhook verification completed.
8. Production rollout staged with limits, monitoring and a documented rollback switch.

## Immediate execution order
1. Freeze any unverified live-payment promotion and do not merge PR #4 as a global payment core.
2. Review PR #3 security and run its browser-to-database end-to-end test before merge.
3. Remove misleading social proof/scarcity and align the public sales flow with what is actually delivered.
4. Establish one canonical production deployment and a protected release path.
5. Build provider-neutral ledger/payment-intent schema in a new migration; keep current order intake backwards compatible.
6. Add authenticated admin workflow and audit trail.
7. Add provider adapters only after the neutral contracts and test harness exist.
8. Implement observability, automated tests, threat-model review and disaster-recovery drills.
9. Add AI agents incrementally with least privilege and evaluation gates.

## Explicit non-goals for the first release
- No ZYNTRA-issued token.
- No pooled custody or customer deposit accounts.
- No unrestricted exchange or broker execution.
- No AI-authorized withdrawals, payouts, trading or account freezes without policy and review.
- No claim of global legal availability.
- No marketing claims of autonomous operation or guaranteed revenue without measured evidence.

## Evidence links
- Repository: https://github.com/Johanne012/zyntra-flowbrief
- PR #3: https://github.com/Johanne012/zyntra-flowbrief/pull/3
- PR #4: https://github.com/Johanne012/zyntra-flowbrief/pull/4
- Supabase security advisor: https://supabase.com/dashboard/project/ijbmdftluptwnglryaqx/advisors/security
- Supabase migrations: https://supabase.com/dashboard/project/ijbmdftluptwnglryaqx/database/migrations
- Vercel team projects: https://vercel.com/zyntra
- Binance incident update: https://www.binance.com/en/square/post/384314641614134
- Chargily webhook implementation reference: https://github.com/Chargily/chargily-pay-javascript
