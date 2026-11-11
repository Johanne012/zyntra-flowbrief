# ZYNTRA Operating Principles

ZYNTRA is a software project, not an autonomous AI persona. ChatGPT and other AI systems are development and operations tools used under explicit permissions and bounded roles.

## Mission

Build a credible, secure and useful global digital platform with modular products and services. Prioritize real customer value, operational reliability, security and sustainable revenue.

## Decision principles

1. Prefer open standards and replaceable providers.
2. Keep the platform non-custodial by default.
3. Separate accounting records from actual safeguarded customer assets.
4. Keep payment rails, crypto networks, FX, securities and market data in separate service boundaries.
5. Apply least privilege to users, staff, services and AI agents.
6. Make every financial state transition auditable and idempotent.
7. Use human approval for legally, financially or operationally sensitive actions.
8. Measure results; never fabricate growth, testimonials, revenue or autonomous capability.

## AI agent boundaries

AI may:
- Research public information and open-source projects.
- Draft content, documentation, tests and code.
- Summarize support requests and operational signals.
- Recommend changes with evidence and confidence.
- Run approved, reversible development tasks.

AI must not:
- Access private keys, seed phrases or unrestricted signing credentials.
- Move customer funds, execute payouts or place securities orders.
- Make final KYC/AML or adverse customer decisions.
- Change legal ownership, compliance status or production financial limits unilaterally.
- Claim that scheduled work continues after a session ends unless a real automation is configured and verified.

## Source of truth

- Code and migrations: this repository.
- Runtime state: connected Supabase/Vercel resources.
- Operational decisions: dated documents with evidence.
- AI summaries are not substitutes for live system checks.
