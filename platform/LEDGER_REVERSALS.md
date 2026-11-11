# Ledger reversal API

Edge Function: `zyntra-reverse-ledger` (JWT verification enabled).

- Requires a valid authenticated user and finance-capable organization membership.
- Only a posted original journal in the same organization may be reversed.
- A reversal cannot itself be reversed; corrections to a reversal require a separately reviewed accounting workflow.
- Creates a new journal with debit/credit sides swapped per original entry.
- Original posted journal is never edited or deleted.
- Enforces one reversal per original transaction, an organization-scoped idempotency key, a mandatory reason and an audit event.
- Does not initiate external refunds or transfer funds. A provider refund is a separate operation and must be reconciled independently.
