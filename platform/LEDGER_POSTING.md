# Ledger posting API

Edge Function: `zyntra-post-ledger` (JWT verification enabled).

- Accepts 2–100 debit/credit entries as integer strings, never floating-point values.
- SQL RPC verifies active organization and owner/admin/finance membership.
- Account organization and asset consistency are checked by database triggers.
- Each asset must balance independently.
- The posting transaction and entries are written atomically.
- Idempotency key is organization-scoped and bound to a SHA-256 request hash.
- Posted journal rows are immutable; corrections require a separate reversal journal.
- Audit event is written in the same transaction.
- Function cannot move external money, invoke providers, sign wallets or trade securities.

No ledger accounts or active organizations exist yet. The endpoint is a controlled foundation and must be exercised with isolated integration tests before financial production use.
