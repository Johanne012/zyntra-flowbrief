# ZYNTRA Technology Stack — Verified vs Candidate

**Last reviewed:** 2026-11-11

## In use

| Layer | Technology | Current role |
|---|---|---|
| Source control | GitHub | Versioned website, migrations, Edge Function source |
| Database | Supabase Postgres 17 | Server-only platform schema and order records |
| Serverless backend | Supabase Edge Functions | Order intake, organization onboarding/review, payment intents, ledger posting/reversals and tenant dashboard |
| Hosting | Vercel | Static website and preview deployments |
| Console | Static HTML/CSS/JS | Authenticated onboarding and aggregate dashboard; deployment pending quota |
| Automation | ChatGPT Automations / connected tools | Human-supervised project tasks and scheduled reports where configured |

## Candidate components — not yet integrated or enabled

| Component | Intended role | Important limitation |
|---|---|---|
| Hyperswitch | Open-source payment orchestration | Does not provide merchant underwriting, acquiring or universal country coverage |
| Request Network | Non-custodial crypto invoices/payments | Chain and token support must be verified route by route |
| Bridge | Fiat/stablecoin rails | Commercial provider; entity, country and product approval required |
| Broker API | Securities execution | Separate regulated brokerage relationship; not a payment gateway |
| FX data provider | Reference rates and conversion quotes | Reference prices are not executable liquidity |
| n8n | Workflow orchestration | Requires self-hosting/security configuration and scoped credentials |
| OpenTelemetry | Logs, traces and metrics | Needs collectors, retention, alerting and incident ownership |
| Sentry or GlitchTip | Application error monitoring | Not yet configured or verified |

## Design rules

- Prefer open protocols and self-hostable software where practical.
- Keep vendor adapters replaceable behind internal contracts.
- Pin dependencies and commit lockfiles.
- Keep secrets server-side and rotate them.
- Do not add a new service until its operational owner, threat model, data flows, license and total cost are understood.
