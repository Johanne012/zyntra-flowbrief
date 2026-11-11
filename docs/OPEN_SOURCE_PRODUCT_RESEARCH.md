# ZYNTRA — Open-source product and architecture research

**Research date:** 2026-11-11  
**Purpose:** Adopt proven product patterns without copying code blindly, importing incompatible licenses, or creating an unmaintainable collection of platforms.

## Executive recommendation

Do not rebuild ZYNTRA by embedding a dozen complete open-source products. Use a small, replaceable core and selectively adopt mature patterns:

1. Keep Supabase/Postgres as the initial identity and data platform while the product is small.
2. Keep the provider-neutral ledger and tenant boundaries as ZYNTRA-owned domain logic.
3. Use Saleor as a reference for marketplace, multi-region, multi-currency, promotions, product catalog and app-extension UX—not as a second commerce core unless product complexity proves it necessary.
4. Use ERPNext/Frappe as a reference for operational modules (CRM, helpdesk, accounting workflows, projects, inventory, reports); do not embed GPL/AGPL code into the proprietary platform without a formal license decision.
5. Evaluate Temporal for durable, long-running business workflows once order, settlement and compliance processes need retryable orchestration.
6. Keep Keycloak as a future option for enterprise SSO/federation only if Supabase Auth no longer meets requirements.
7. Avoid embedding n8n as a customer-facing workflow builder without a commercial-license review. Its source is available, but the Sustainable Use License is not OSI-approved open source and restricts some hosted/product use cases.
8. Adopt OpenTelemetry-compatible traces/metrics/logs and immutable audit events before introducing many AI agents.

## Product patterns to adopt

| Pattern source | Useful capabilities | ZYNTRA adaptation | Decision |
|---|---|---|---|
| Saleor | Global commerce, channels, multi-currency/multi-language, catalog, checkout, promotions, split payments, returns, apps and marketplace patterns | Product catalog, service listings, multi-region storefronts, promotion rules, marketplace seller model, modular admin views | Adopt patterns; do not add a second commerce engine yet |
| ERPNext | Accounting, invoices, payments, inventory, customer/supplier records, projects, budgets, tasks, helpdesk and reports | Finance operations, internal CRM, service delivery, customer support, reporting and audit checklists | Benchmark workflows; avoid embedding GPLv3 code without legal review |
| Frappe Framework | Full-stack framework, role-based access, REST APIs and modular apps | Reference for modular back-office applications and workflow screens | Consider only if a future Python-based internal ops suite is justified |
| Temporal | Durable execution across crashes, retries and long-running workflows; useful for onboarding, payments, fulfilment and AI jobs | Future orchestration engine for payment state machines, settlement matching, retries and human approvals | Candidate after core API and tests stabilize |
| Keycloak | Open-source identity and access management, SSO and federation | Enterprise SSO/SAML/OIDC if required by larger organizations | Not needed now; Supabase Auth is already in use |
| n8n | Visual workflow automation and integrations | Internal-only operational automation, if license and hosting model permit | Do not expose workflow editor as a customer feature without license approval |
| Hyperswitch | Payment orchestration and provider routing | Future fiat payment adapter layer | Candidate; merchant eligibility and providers remain external |
| Request Network | Non-custodial crypto invoice/payment protocol | Future crypto invoice adapter | Candidate; route support must be checked per network and token |

## Feature inventory for the product roadmap

### Customer and organization experience
- Organization workspaces and membership roles.
- Invitations, MFA/passkeys, device/session management.
- Multi-language and RTL/LTR support.
- Country, legal entity and beneficial-owner profiles.
- Service catalog, subscriptions, invoices, order history and support cases.
- Clear status labels: pending, active, blocked, requires action, settled, refunded.
- Accessible forms, keyboard navigation, responsive layouts and consistent empty/error/loading states.

### Marketplace and commerce
- Multi-vendor catalog with organization ownership.
- Product/service variants and localization.
- Region-specific pricing and tax configuration.
- Quote → order → payment intent → fulfilment → refund lifecycle.
- Promotions, vouchers, bundles and referral tracking.
- Seller onboarding, KYC/KYB evidence and dispute workflow.
- Ratings/reviews only after verified completed transactions.

### Financial operations
- Provider-neutral payment intents and attempts.
- Double-entry ledger, immutable journals and reversals.
- FX quote history with source, timestamp, spread and expiry.
- Provider settlement batches, fee reconciliation and exception queues.
- Refunds, chargebacks, disputes and payout approvals.
- Separate market-data, broker execution and payment domains.
- No customer balance or custody claim until safeguarding/custody exists.

### AI and automation
- Research and market-intelligence agent.
- Support assistant grounded in approved knowledge.
- Marketing content and campaign assistant.
- QA agent for tests, dependency updates and regression reports.
- Finance reconciliation assistant with read-only recommendations.
- Risk triage assistant that explains signals but does not make final adverse decisions.
- Workflow orchestrator with tool allowlists, budgets, evaluations and kill switch.
- AI agents must not receive signing keys, unrestricted service-role credentials or unilateral payment/trading authority.

### Trust, safety and security
- Phishing-resistant MFA for staff.
- Least-privilege service identities and secret rotation.
- Maker-checker approvals for sensitive actions.
- Provider webhook signature verification and replay protection.
- Rate limits, abuse detection, bot mitigation and audit trail.
- Transaction limits, destination allowlists, delays and independent signing policy for any future wallet.
- Dependency/SBOM/license scanning and signed release artifacts.
- Incident response, backups, restore drills and tested rollback.

## License and legal guardrails

Open source does not mean license-free. The Open Source Initiative requires open-source licenses to allow use, modification and redistribution; a source-available license with commercial restrictions is not equivalent.

- ERPNext is GPLv3; Frappe Framework is MIT; Frappe CRM and Helpdesk are AGPLv3. Keep these as workflow references unless counsel approves the integration/derivative-work model.
- Saleor's dashboard is BSD-3-Clause; inspect the exact license of every component/repository/version before adding it.
- Keycloak is Apache-2.0.
- n8n's Sustainable Use License is fair-code/source-available, not OSI-approved open source; its own FAQ restricts certain hosted, white-label and customer-configurable workflow use cases.
- Every new dependency must be pinned, scanned, attributed and recorded in an SBOM.
- Do not copy UI assets, code or documentation from a project without checking its license and attribution requirements.
- ZYNTRA's own repository currently has no declared license. Do not assume it is open source; choose and add a project license only after the owner explicitly decides whether the platform code is proprietary or intended for public reuse.

## Implementation order

1. Keep current Supabase domain model; finish tenant onboarding and authorization.
2. Build real admin/customer flows before adding more vendors.
3. Add a durable workflow queue for retries and approval transitions.
4. Add observability and security monitoring.
5. Integrate one payment adapter in sandbox only after legal/provider checks.
6. Add crypto invoice adapter separately.
7. Add FX quotes and market-data services.
8. Add broker/paper-trading integration only after separate legal and risk design.
9. Add advanced AI agents behind bounded tools and evaluations.

## References

- Saleor docs and multi-region/marketplace patterns: https://docs.saleor.io/ and https://github.com/saleor/saleor
- ERPNext open-source license and product scope: https://docs.frappe.io/erpnext/open-source and https://docs.frappe.io/erpnext/introduction
- Frappe license distinctions: https://docs.frappe.io/legal/others/license-and-trademark
- Temporal durable workflows: https://docs.temporal.io/
- Keycloak identity and Apache-2.0: https://github.com/keycloak/keycloak
- n8n license terms: https://github.com/n8n-io/n8n-docs/blob/main/docs/n8n-community-license/README.md and https://support.n8n.io/article/can-i-use-your-license-for-my-use-case
- Open Source Definition and license basics: https://opensource.org/faq and https://opensource.org/licenses
- GitHub license guidance: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
