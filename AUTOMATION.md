# ZYNTRA Automation Policy

Automation is added incrementally and must be observable, bounded and reversible.

## Current approach

- GitHub Actions validates repository contracts and type-checks Edge Functions.
- Supabase Edge Functions handle server-side enquiry intake, organization onboarding/review, payment-intent creation and controlled ledger posting/reversals.
- ChatGPT-connected tools can assist with research, code changes, documentation and operational checks.
- No single AI agent is treated as an always-on autonomous operator.

## Planned workflows

1. Order intake → validation → durable record → staff notification.
2. Provider webhook → signature verification → deduplication → state transition → ledger posting.
3. Settlement report → reconciliation suggestions → exception queue.
4. Support request → retrieval from approved knowledge → draft response → escalation when uncertain.
5. Marketing plan → content draft → compliance/brand review → scheduled publication.
6. Daily operations pulse → health, errors, failed jobs, order volume and revenue metrics.

## Required controls

- Least-privilege tool and credential allowlists.
- No secrets in prompts, logs or client bundles.
- Per-action and per-agent budgets.
- Structured event logs and evaluation tests.
- Prompt-injection defenses for web pages, emails and uploaded content.
- Human approval for payments, payouts, trading, account restrictions and production changes.
- Kill switch and incident response for every autonomous workflow.
- Never claim a workflow is active until its trigger, execution and result have been verified.
